(function(){
"use strict";
var C=window.VOICE_CONFIG||{},VS=window.VS,OCC=window.OCC;
var $=function(s){return document.querySelector(s)};
var lang="en",CODE="";
var COUNTRIES="HT DO US CA FR BS TC CL BR MX GP MQ GF BE CH ES PT GB DE IT NL JM CU PA VE CO AR EC PE PR KY BM AG BB DM GD KN LC VC TT SR GY BZ HN GT SV NI CR UY PY BO AU NZ IL SN CI CM CD CG GA ML BF NE NG GH BJ TG MA DZ TN EG ZA KE ET AE QA SA TR RU UA PL RO IE SE NO DK FI AT GR CN JP KR IN SG HK TH PH ID MY".split(" ");
function t(k){var d=VS[lang];return (d&&d[k]!=null)?d[k]:VS.en[k]}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]})}
function partTitle(n){if(n===0)return t("general");var p=(window.PARTS_I18N[lang]||window.PARTS_EN);return (p[n-1]||window.PARTS_EN[n-1])}
function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
function api(path,body){
  return fetch(C.SUPABASE_URL+"/rest/v1/"+path,{method:"POST",headers:{"apikey":C.SUPABASE_ANON_KEY,"Authorization":"Bearer "+C.SUPABASE_ANON_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)})
    .then(function(r){return r.text().then(function(x){var j;try{j=JSON.parse(x)}catch(e){j=x}if(!r.ok)throw new Error((j&&j.message)||x);return j})});
}
function getRev(n){
  return fetch(C.SUPABASE_URL+"/rest/v1/revision_log?part=eq."+n+"&select=body",{headers:{"apikey":C.SUPABASE_ANON_KEY,"Authorization":"Bearer "+C.SUPABASE_ANON_KEY}}).then(function(r){return r.json()});
}
function newCode(){var a=new Uint8Array(12);crypto.getRandomValues(a);return Array.prototype.map.call(a,function(b){return b.toString(16).padStart(2,"0")}).join("").replace(/(.{6})(?=.)/g,"$1-")}
function ready(){return !!(C.SUPABASE_URL&&C.SUPABASE_ANON_KEY)}

/* ---------- render text ---------- */
function setText(){
  document.documentElement.lang=lang;
  document.title=t("title")+" · Ayiti Nouvo Kontra Sosyal";
  var map={"t-title":"title","t-intro":"intro","t-howH":"howH","t-privH":"privH","t-priv":"priv","l-section":"section","l-vote":"vote","v-approve":"approve","v-changes":"changes","v-disapprove":"disapprove","l-comment":"comment","l-clang":"commentLang","l-wording":"wording","l-about":"about","l-aboutNote":"aboutNote","l-name":"name","l-country":"country","l-dept":"dept","l-commune":"commune","l-occ":"occupation","l-occOther":"otherOcc","l-years":"years","l-left":"left","l-age":"age","l-email":"email","l-mayContact":"mayContact","l-consent":"consent","t-thanks":"thanks","t-codeNote":"codeNote","again":"another","t-results":"results","t-small":"small","t-signal":"signal","t-revision":"revision","t-delH":"delH","t-delIntro":"delIntro","l-delCode":"delCode","delBtn":"delBtn"};
  Object.keys(map).forEach(function(id){var e=document.getElementById(id);if(e)e.textContent=t(map[id])});
  $("#t-how").innerHTML=t("how").map(function(x){return "<li>"+esc(x)+"</li>"}).join("");
  $("#send").textContent=t("send");
  // dropdowns keep their selection
  var cur=$("#part").value||"0";fillParts();$("#part").value=cur;
  var cc=$("#country").value;fillCountries();if(cc)$("#country").value=cc;
  var oc=$("#occ").value;fillOcc();if(oc)$("#occ").value=oc;
  var ag=$("#age").value;fillAge();$("#age").value=ag;
  var cl=$("#clang").value;fillClang();if(cl)$("#clang").value=cl;
  var dp=$("#dept").value;fillDept();if(dp)$("#dept").value=dp;
  if(!ready()){$("#notReady").hidden=false;$("#notReady").textContent=t("notReady")}
  loadResults();
}
function opt(v,l){return "<option value=\""+esc(v)+"\">"+esc(l)+"</option>"}
function fillParts(){var h="";for(var n=0;n<=47;n++)h+=opt(n,(n?n+". ":"")+partTitle(n));$("#part").innerHTML=h}
function fillCountries(){
  var dn;try{dn=new Intl.DisplayNames([lang],{type:"region"})}catch(e){dn=null}
  var items=COUNTRIES.map(function(c){return [c,dn?dn.of(c):c]});
  var first=items.slice(0,2),rest=items.slice(2).sort(function(a,b){return a[1].localeCompare(b[1],lang)});
  $("#country").innerHTML=opt("",t("choose"))+first.concat(rest).map(function(x){return opt(x[0],x[1])}).join("");
}
function fillOcc(){$("#occ").innerHTML=opt("",t("choose"))+OCC.en.map(function(v,i){return opt(v,OCC[lang][i])}).join("")}
function fillAge(){var a=t("ages");$("#age").innerHTML=opt("","—")+Object.keys(a).map(function(k){return opt(k==="65"?"65plus":k,a[k])}).join("")}
function fillClang(){$("#clang").innerHTML=window.LANGN.map(function(l){return opt(l[0],l[1])}).join("")+opt("other",t("other"));if(!$("#clang").value)$("#clang").value=lang}
function fillDept(){$("#dept").innerHTML=opt("","—")+window.DEPTS.map(function(d){return opt(d,d)}).join("")}

/* ---------- profile memory ---------- */
var PF=["name","country","dept","commune","occ","occOther","years","left","age","email"];
function saveProfile(){var o={};PF.forEach(function(k){o[k]=$("#"+k).value});o.mayContact=$("#mayContact").checked;store("anks-profile",JSON.stringify(o))}
function loadProfile(){try{var o=JSON.parse(store("anks-profile")||"{}");PF.forEach(function(k){if(o[k]!=null&&$("#"+k))$("#"+k).value=o[k]});$("#mayContact").checked=!!o.mayContact}catch(e){}afterCountry()}
function afterCountry(){var c=$("#country").value;$("#deptBox").hidden=c!=="HT";$("#leftBox").hidden=!(c&&c!=="HT");$("#occOtherBox").hidden=$("#occ").value!=="Other"}

/* ---------- results ---------- */
function bar(a,c,d){var n=a+c+d||1;return "<div class=\"bar\"><i class=\"b-a\" style=\"width:"+a/n*100+"%\"></i><i class=\"b-c\" style=\"width:"+c/n*100+"%\"></i><i class=\"b-d\" style=\"width:"+d/n*100+"%\"></i></div>"}
function legend(a,c,d){return "<div class=\"lg\"><span>"+esc(t("approve"))+" "+a+"</span><span>"+esc(t("changes"))+" "+c+"</span><span>"+esc(t("disapprove"))+" "+d+"</span></div>"}
function occLabel(v){var i=OCC.en.indexOf(v);return i>-1?OCC[lang][i]:v}
function loadResults(){
  if(!ready()){$("#res").innerHTML="";$("#rev").innerHTML="";return}
  var n=+$("#part").value||0;
  api("rpc/public_results",{p_part:n}).then(function(r){
    var h="<p><b>"+r.total+"</b> "+esc(t("participants"))+"</p>"+bar(r.approve,r.changes,r.disapprove)+legend(r.approve,r.changes,r.disapprove);
    h+="<h3>"+esc(t("byLives"))+"</h3>";
    h+=r.by_lives.length?r.by_lives.map(function(g){return "<p><b>"+esc(g.group==="ayiti"?t("ayiti"):t("abroad"))+"</b> ("+g.n+")</p>"+bar(g.approve,g.changes,g.disapprove)}).join(""):"<p class=\"note\">"+esc(t("notEnough"))+"</p>";
    h+="<h3>"+esc(t("byOcc"))+"</h3>";
    h+=r.by_occupation.length?r.by_occupation.map(function(g){return "<p><b>"+esc(occLabel(g.group))+"</b> ("+g.n+")</p>"+bar(g.approve,g.changes,g.disapprove)}).join(""):"<p class=\"note\">"+esc(t("notEnough"))+"</p>";
    $("#res").innerHTML=h;
  }).catch(function(){$("#res").innerHTML=""});
  getRev(n).then(function(r){$("#rev").innerHTML=(r&&r[0]&&r[0].body)?"<pre class=\"rev\">"+esc(r[0].body)+"</pre>":"<p class=\"note\">"+esc(t("noRevision"))+"</p>"}).catch(function(){});
}

/* ---------- submit ---------- */
function submit(e){
  e.preventDefault();
  var m=$("#msg");m.textContent="";
  if(!ready()){m.textContent=t("notReady");return}
  var vote=(document.querySelector("input[name=vote]:checked")||{}).value;
  if(!vote){m.textContent=t("needVote");return}
  var comment=$("#comment").value.trim();
  if(vote!=="approve"&&comment.length<3){m.textContent=t("commentReq");return}
  var country=$("#country").value,name=$("#name").value.trim(),commune=$("#commune").value.trim(),occ=$("#occ").value;
  if(name.length<2||!country||!commune||!occ||($("#occ").value==="Other"&&!$("#occOther").value.trim())){m.textContent=t("needProfile");return}
  if(!$("#consent").checked){m.textContent=t("needConsent");return}
  if(!CODE){CODE=store("anks-code")||newCode();store("anks-code",CODE)}
  var profile={name:name,country:country,lives:country==="HT"?"ayiti":"abroad",departement:country==="HT"?$("#dept").value:"",commune:commune,occupation:occ,occupation_other:$("#occOther").value,years_there:$("#years").value,years_since_left:country==="HT"?"":$("#left").value,age_range:$("#age").value};
  var btn=$("#send");btn.disabled=true;btn.textContent=t("sending");
  api("rpc/submit_response",{p_code:CODE,p_profile:profile,p_part:+$("#part").value,p_vote:vote,p_comment:comment,p_comment_lang:$("#clang").value,p_wording:$("#wording").value,p_ui_lang:lang,p_email:$("#email").value,p_may_contact:$("#mayContact").checked,p_honeypot:$("#hp").value})
  .then(function(){
    saveProfile();
    $("#codeOut").textContent=CODE;$("#done").hidden=false;$("#done").scrollIntoView({block:"center"});
    loadResults();
  }).catch(function(err){m.textContent=t("errors");try{console.warn(err.message)}catch(x){}})
  .then(function(){btn.disabled=false;btn.textContent=t("send")});
}

/* ---------- delete ---------- */
function del(){
  var c=$("#delCode").value.trim(),m=$("#delMsg");m.textContent="";
  if(!c||!ready())return;
  api("rpc/delete_my_data",{p_code:c}).then(function(r){m.textContent=r.deleted?t("delDone"):t("delNone");if(r.deleted&&store("anks-code")===c){store("anks-code","");store("anks-profile","");CODE=""}}).catch(function(){m.textContent=t("errors")});
}

/* ---------- start ---------- */
function init(){
  var q=new URLSearchParams(location.search);
  var sv=store("anks-lang"),ql=q.get("lang");
  var L=window.LANGN.map(function(l){return l[0]});
  lang=(ql&&L.indexOf(ql)>-1)?ql:(sv&&L.indexOf(sv)>-1?sv:(L.indexOf((navigator.language||"en").slice(0,2))>-1?(navigator.language||"en").slice(0,2):"en"));
  $("#lang").innerHTML=window.LANGN.map(function(l){return opt(l[0],l[1])}).join("");
  $("#lang").value=lang;
  CODE=store("anks-code")||"";
  setText();
  var pn=parseInt(q.get("part"),10);if(pn>=0&&pn<=47)$("#part").value=pn;
  $("#clang").value=lang;
  loadProfile();
  loadResults();
  $("#lang").onchange=function(){lang=$("#lang").value;store("anks-lang",lang);setText()};
  $("#part").onchange=function(){$("#done").hidden=true;loadResults()};
  $("#country").onchange=afterCountry;$("#occ").onchange=afterCountry;
  $("#f").addEventListener("submit",submit);
  $("#again").onclick=function(){$("#done").hidden=true;$("#comment").value="";$("#wording").value="";$("#part").scrollIntoView()};
  $("#delBtn").onclick=del;
}
init();
})();
