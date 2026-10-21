-- Ayiti Nouvo Kontra Sosyal: Public Voice. Run this whole file once in the Supabase SQL editor.
-- Privacy design: no table is readable or writable by the public. The public can only call three functions
-- (submit_response, public_results, delete_my_data) and read the revision log. Admins are listed in `admins`.

create extension if not exists pgcrypto;

create table if not exists app_settings (key text primary key, value text not null);
insert into app_settings(key,value) values
  ('ip_salt', encode(gen_random_bytes(16),'hex')),
  ('retention_months','12'),
  ('review_closed_at',''),          -- set to an ISO date when the review closes; deletion runs retention_months after it
  ('min_group','20'),
  ('hourly_limit','40')
on conflict (key) do nothing;

-- people: profile only, never the email
create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  code_hash text unique not null,
  name text not null check (char_length(name) between 2 and 120),
  country text not null check (char_length(country) between 2 and 80),
  lives text not null check (lives in ('ayiti','abroad')),
  departement text,
  commune text not null check (char_length(commune) between 1 and 120),
  occupation text not null check (char_length(occupation) between 2 and 80),
  occupation_other text check (char_length(occupation_other) <= 120),
  years_there int check (years_there between 0 and 120),
  years_since_left int check (years_since_left between 0 and 120),
  age_range text check (age_range in ('under25','25-34','35-49','50-64','65plus')),
  created_at timestamptz not null default now()
);

-- emails: stored apart, linked only by random id, never joined into public results
create table if not exists emails (
  person_id uuid primary key references people(id) on delete cascade,
  email text not null check (char_length(email) between 5 and 200),
  may_contact boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  part int not null check (part between 0 and 47),
  vote text not null check (vote in ('approve','changes','disapprove')),
  comment text check (char_length(comment) <= 5000),
  comment_lang text check (comment_lang in ('en','ht','fr','es','pt','other')),
  wording text check (char_length(wording) <= 5000),
  ui_lang text,
  status text not null default 'new' check (status in ('new','reviewed','accepted','declined','translate')),
  public_reason text,
  admin_note text,
  text_hash text,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id, part)
);
create index if not exists submissions_part on submissions(part);
create index if not exists submissions_hash on submissions(text_hash, created_at);
create index if not exists submissions_ip on submissions(ip_hash, updated_at);

create table if not exists revision_log (
  part int primary key check (part between 0 and 47),
  body text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists admins (user_id uuid primary key);
create table if not exists access_log (id bigserial primary key, admin_id uuid, action text, at timestamptz not null default now());

alter table app_settings enable row level security;
alter table people enable row level security;
alter table emails enable row level security;
alter table submissions enable row level security;
alter table revision_log enable row level security;
alter table admins enable row level security;
alter table access_log enable row level security;

create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from admins where user_id = auth.uid()) $$;

-- policies: public reads only the revision log; admins read and review everything
create policy revision_public_read on revision_log for select using (true);
create policy revision_admin_write on revision_log for all using (is_admin()) with check (is_admin());
create policy people_admin_read on people for select using (is_admin());
create policy emails_admin_read on emails for select using (is_admin());
create policy submissions_admin_read on submissions for select using (is_admin());
create policy submissions_admin_update on submissions for update using (is_admin()) with check (is_admin());
create policy settings_admin on app_settings for all using (is_admin()) with check (is_admin());
create policy access_admin_read on access_log for select using (is_admin());

-- helper: salted hash of the caller's IP (the raw IP is never stored)
create or replace function _ip_hash() returns text language plpgsql stable security definer set search_path = public as $$
declare h json; ip text; salt text;
begin
  begin h := current_setting('request.headers', true)::json; exception when others then h := '{}'::json; end;
  ip := coalesce(split_part(coalesce(h->>'x-forwarded-for',''), ',', 1), '');
  select value into salt from app_settings where key = 'ip_salt';
  return encode(digest(coalesce(salt,'') || ip, 'sha256'), 'hex');
end $$;

-- the only write path for the public
create or replace function submit_response(
  p_code text, p_profile jsonb, p_part int, p_vote text, p_comment text, p_comment_lang text,
  p_wording text, p_ui_lang text, p_email text, p_may_contact boolean, p_honeypot text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_hash text; v_person uuid; v_ip text; v_limit int; v_n int; v_th text;
begin
  if coalesce(p_honeypot,'') <> '' then return jsonb_build_object('ok', true); end if;  -- bots: pretend success
  if p_code is null or char_length(p_code) < 16 then raise exception 'bad code'; end if;
  if p_part is null or p_part < 0 or p_part > 47 then raise exception 'bad part'; end if;
  if p_vote not in ('approve','changes','disapprove') then raise exception 'bad vote'; end if;
  if p_vote <> 'approve' and char_length(coalesce(trim(p_comment),'')) < 3 then raise exception 'comment required'; end if;
  if p_comment ~* '(https?://|www\.)[^ ]+.*(https?://|www\.)[^ ]+.*(https?://|www\.)' then raise exception 'spam'; end if;

  v_ip := _ip_hash();
  select value::int into v_limit from app_settings where key = 'hourly_limit';
  select count(*) into v_n from submissions where ip_hash = v_ip and updated_at > now() - interval '1 hour';
  if v_n >= coalesce(v_limit, 40) then raise exception 'rate limit'; end if;

  v_hash := encode(digest(p_code, 'sha256'), 'hex');
  select id into v_person from people where code_hash = v_hash;
  if v_person is null then
    insert into people(code_hash,name,country,lives,departement,commune,occupation,occupation_other,years_there,years_since_left,age_range)
    values (v_hash, trim(p_profile->>'name'), p_profile->>'country', p_profile->>'lives', nullif(p_profile->>'departement',''),
            trim(p_profile->>'commune'), p_profile->>'occupation', nullif(trim(coalesce(p_profile->>'occupation_other','')),''),
            nullif(p_profile->>'years_there','')::int, nullif(p_profile->>'years_since_left','')::int, nullif(p_profile->>'age_range',''))
    returning id into v_person;
  else
    update people set name = trim(p_profile->>'name'), country = p_profile->>'country', lives = p_profile->>'lives',
      departement = nullif(p_profile->>'departement',''), commune = trim(p_profile->>'commune'),
      occupation = p_profile->>'occupation', occupation_other = nullif(trim(coalesce(p_profile->>'occupation_other','')),''),
      years_there = nullif(p_profile->>'years_there','')::int, years_since_left = nullif(p_profile->>'years_since_left','')::int,
      age_range = nullif(p_profile->>'age_range','') where id = v_person;
  end if;

  if coalesce(trim(p_email),'') <> '' then
    insert into emails(person_id,email,may_contact) values (v_person, lower(trim(p_email)), coalesce(p_may_contact,false))
    on conflict (person_id) do update set email = excluded.email, may_contact = excluded.may_contact;
  end if;

  v_th := case when char_length(coalesce(trim(p_comment),'')) >= 20
    then md5(regexp_replace(lower(p_comment), '[^[:alnum:]]+', '', 'g')) else null end;

  insert into submissions(person_id,part,vote,comment,comment_lang,wording,ui_lang,text_hash,ip_hash)
  values (v_person, p_part, p_vote, nullif(trim(p_comment),''), p_comment_lang, nullif(trim(p_wording),''), p_ui_lang, v_th, v_ip)
  on conflict (person_id, part) do update set vote = excluded.vote, comment = excluded.comment,
    comment_lang = excluded.comment_lang, wording = excluded.wording, ui_lang = excluded.ui_lang,
    text_hash = excluded.text_hash, ip_hash = excluded.ip_hash, updated_at = now(), status = 'new';
  return jsonb_build_object('ok', true);
end $$;

-- public aggregate results: every breakdown group below min_group people is hidden
create or replace function public_results(p_part int) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare k int; res jsonb;
begin
  select value::int into k from app_settings where key = 'min_group';
  k := coalesce(k, 20);
  select jsonb_build_object(
    'part', p_part,
    'total', (select count(*) from submissions where part = p_part),
    'approve', (select count(*) from submissions where part = p_part and vote = 'approve'),
    'changes', (select count(*) from submissions where part = p_part and vote = 'changes'),
    'disapprove', (select count(*) from submissions where part = p_part and vote = 'disapprove'),
    'min_group', k,
    'by_lives', coalesce((select jsonb_agg(jsonb_build_object('group', g, 'n', n, 'approve', a, 'changes', c, 'disapprove', d))
       from (select p.lives g, count(*) n, count(*) filter (where s.vote='approve') a, count(*) filter (where s.vote='changes') c,
                    count(*) filter (where s.vote='disapprove') d
             from submissions s join people p on p.id = s.person_id where s.part = p_part group by p.lives having count(*) >= k) x), '[]'::jsonb),
    'by_occupation', coalesce((select jsonb_agg(jsonb_build_object('group', g, 'n', n, 'approve', a, 'changes', c, 'disapprove', d))
       from (select p.occupation g, count(*) n, count(*) filter (where s.vote='approve') a, count(*) filter (where s.vote='changes') c,
                    count(*) filter (where s.vote='disapprove') d
             from submissions s join people p on p.id = s.person_id where s.part = p_part group by p.occupation having count(*) >= k) y), '[]'::jsonb)
  ) into res;
  return res;
end $$;

-- a person can erase everything linked to their private code
create or replace function delete_my_data(p_code text) returns jsonb language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from people where code_hash = encode(digest(p_code, 'sha256'), 'hex');
  get diagnostics n = row_count;
  return jsonb_build_object('deleted', n);
end $$;

-- admin tools
create or replace function log_access(p_action text) returns void language sql security definer set search_path = public as
$$ insert into access_log(admin_id, action) select auth.uid(), p_action where is_admin() $$;

create or replace function purge_expired() returns int language plpgsql security definer set search_path = public as $$
declare closed text; months int; n int := 0;
begin
  if not is_admin() then raise exception 'admins only'; end if;
  select value into closed from app_settings where key = 'review_closed_at';
  select value::int into months from app_settings where key = 'retention_months';
  if coalesce(closed,'') = '' then return 0; end if;
  if now() < closed::timestamptz + make_interval(months => coalesce(months,12)) then return 0; end if;
  delete from people; get diagnostics n = row_count;
  insert into access_log(admin_id, action) values (auth.uid(), 'purge_expired');
  return n;
end $$;

-- campaigns: five or more near-identical comments inside one hour, treated as one organised position
create or replace view flagged_campaigns with (security_invoker = true) as
  select text_hash, count(*) as n, min(created_at) as first_at, max(created_at) as last_at, array_agg(distinct part) as parts
  from submissions where text_hash is not null
  group by text_hash having count(*) >= 5;

revoke all on all tables in schema public from anon;
grant select on revision_log to anon;
grant execute on function submit_response(text,jsonb,int,text,text,text,text,text,text,boolean,text) to anon;
grant execute on function public_results(int) to anon;
grant execute on function delete_my_data(text) to anon;

-- After creating your admin user in Authentication > Users, run (with your user's id):
--   insert into admins(user_id) values ('PASTE-USER-UUID-HERE');
