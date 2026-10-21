# Public Voice: comment and vote on every section

A static site (GitHub Pages) plus a free Supabase database. There is no server to run.

## Why Supabase and not GitHub Issues or Discussions
Issues and Discussions are public, show the author's name, and need a GitHub account. This project collects political opinions from people in a country where armed groups threaten critics, so names and comments must never be public. Here the public can only call three database functions. No table can be read or written from the browser.

## One-time setup (about 15 minutes)
1. Create a free project at supabase.com. Choose a region close to your readers (for example East US).
2. Open **SQL Editor**, paste all of `schema.sql`, run it.
3. Open **Authentication > Users**, add a user (your review-team email and a strong password). Copy that user's UUID.
4. In the SQL Editor run: `insert into admins(user_id) values ('PASTE-THE-UUID');`
5. Open **Project Settings > API**. Copy the project URL and the `anon` key into `config.js` (the anon key is designed to be public).
6. Commit. The site is live at `/feedback/` (and the review page at `/feedback/admin.html`).
7. In **Authentication > Providers**, turn off public sign-ups so only users you add can log in.

## What the database does
- `submit_response`: validates, rate-limits per hashed IP (raw IPs are never stored), stores the profile, the optional email (in a separate table), the vote and the comment. A honeypot field silently drops bots.
- `public_results`: totals only. Any breakdown group of fewer than 20 people is hidden.
- `delete_my_data`: erases everything linked to a private code.
- `flagged_campaigns`: five or more near-identical comments in the data are listed for the reviewers as one organised position.
- Retention: set `review_closed_at` in the admin page. Data can be deleted automatically 12 months later with `purge_expired()` (run it from the admin page, or schedule it with pg_cron).

## Limits you should know
- The private code is the only way to change a vote. If someone loses it, they can vote again from a new browser and the old vote stays.
- Self-declared profiles cannot be verified. Results show who says what with sample sizes, and they carry no weight by identity.
- A site that collects opinions is a target. Keep the Supabase project's password manager-protected and review the access log.
- The Kreyòl text in `strings.js` needs a native-speaker review before launch.
