import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-check.js";
var C=window.VOICE_CONFIG||{},VS=window.VS,OCC=window.OCC;
var DB=null;
function connect(){
  if(DB||!(C.firebase&&C.firebase.projectId&&C.firebase.apiKey))return;
  var app=initializeApp(C.firebase);
  if(C.APPCHECK_SITE_KEY){try{initializeAppCheck(app,{provider:new ReCaptchaV3Provider(C.APPCHECK_SITE_KEY),isTokenAutoRefreshEnabled:true})}catch(e){}}
  DB=getFirestore(app);
}
connect();
var $=function(s){return document.querySelector(s)};
var lang="en",CODE="";
var COUNTRIES="HT DO US CA FR BS TC CL BR MX GP MQ GF BE CH ES PT GB DE IT NL JM CU PA VE CO AR EC PE PR KY BM AG BB DM GD KN LC VC TT SR GY BZ HN GT SV NI CR UY PY BO AU NZ IL SN CI CM CD CG GA ML BF NE NG GH BJ TG MA DZ TN EG ZA KE ET AE QA SA TR RU UA PL RO IE SE NO DK FI AT GR CN JP KR IN SG HK TH PH ID MY".split(" ");
function t(k){var d=VS[lang];return (d&&d[k]!=null)?d[k]:VS.en[k]}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]})}
function partTitle(n){if(n===0)return t("general");var p=(window.PARTS_I18N[lang]||window.PARTS_EN);return (p[n-1]||window.PARTS_EN[n-1])}
function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
function newCode(){var a=new Uint8Array(12);crypto.getRandomValues(a);return Array.prototype.map.call(a,function(b){return b.toString(16).padStart(2,"0")}).join("").replace(/(.{6})(?=.)/g,"$1-")}
function ready(){return !!DB}
function sha(str){return crypto.subtle.digest("SHA-256",new TextEncoder().encode(str)).then(function(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return x.toString(16).padStart(2,"0")}).join("")})}

/* ---------- render text ---------- */
function setText(){
  document.documentElement.lang=lang;
  document.title=t("title")+" · Ayiti Nouvo Kontra Sosyal";
  var map={"t-title":"title","t-intro":"intro","t-howH":"howH","t-privH":"privH","t-priv":"priv","l-section":"section","l-vote":"vote","v-approve":"approve","v-changes":"changes","v-disapprove":"disapprove","l-comment":"comment","l-clang":"commentLang","l-wording":"wording","l-about":"about","l-aboutNote":"aboutNote","l-name":"name","l-country":"country","l-dept":"dept","l-commune":"commune","l-occ":"occupation","l-occOther":"otherOcc","l-years":"years","l-left":"left","l-age":"age","l-email":"email","l-mayContact":"mayContact","l-liveJoin":"liveJoin","l-consent":"consent","t-thanks":"thanks","t-codeNote":"codeNote","again":"another","t-results":"results","t-small":"small","t-signal":"signal","t-revision":"revision","t-delH":"delH","t-delIntro":"delIntro","l-delCode":"delCode","delBtn":"delBtn"};
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
  getDoc(doc(DB,"public","results")).then(function(snap){
    var all=snap.exists()?snap.data():null,r=all&&all.parts&&all.parts[String(n)];
    if(!r){$("#res").innerHTML="<p class=\"note\">"+esc(t("noResults"))+"</p>";return}
    var h="<p><b>"+r.total+"</b> "+esc(t("participants"))+(all.updated?" · <span class=\"muted\">"+esc(t("updated"))+" "+esc(all.updated.slice(0,10))+"</span>":"")+"</p>"+bar(r.approve,r.changes,r.disapprove)+legend(r.approve,r.changes,r.disapprove);
    h+="<h3>"+esc(t("byLives"))+"</h3>";
    h+=(r.byLives&&r.byLives.length)?r.byLives.map(function(g){return "<p><b>"+esc(g.group==="ayiti"?t("ayiti"):t("abroad"))+"</b> ("+g.n+")</p>"+bar(g.approve,g.changes,g.disapprove)}).join(""):"<p class=\"note\">"+esc(t("notEnough"))+"</p>";
    h+="<h3>"+esc(t("byOcc"))+"</h3>";
    h+=(r.byOccupation&&r.byOccupation.length)?r.byOccupation.map(function(g){return "<p><b>"+esc(occLabel(g.group))+"</b> ("+g.n+")</p>"+bar(g.approve,g.changes,g.disapprove)}).join(""):"<p class=\"note\">"+esc(t("notEnough"))+"</p>";
    $("#res").innerHTML=h;
  }).catch(function(){$("#res").innerHTML=""});
  getDoc(doc(DB,"revisions",String(n))).then(function(snap){var b=snap.exists()?snap.data().body:"";$("#rev").innerHTML=b?"<pre class=\"rev\">"+esc(b)+"</pre>":"<p class=\"note\">"+esc(t("noRevision"))+"</p>"}).catch(function(){});
}

/* ---------- submit ---------- */
function submit(e){
  e.preventDefault();
  var m=$("#msg");m.textContent="";
  if(!ready()){m.textContent=t("notReady");return}
  if($("#hp").value){$("#done").hidden=false;return}
  var vote=(document.querySelector("input[name=vote]:checked")||{}).value;
  if(!vote){m.textContent=t("needVote");return}
  var comment=$("#comment").value.trim();
  if(vote!=="approve"&&comment.length<3){m.textContent=t("commentReq");return}
  var country=$("#country").value,name=$("#name").value.trim(),commune=$("#commune").value.trim(),occ=$("#occ").value;
  if(name.length<2||!country||!commune||!occ||(occ==="Other"&&!$("#occOther").value.trim())){m.textContent=t("needProfile");return}
  if(!$("#consent").checked){m.textContent=t("needConsent");return}
  if(!CODE){CODE=store("anks-code")||newCode();store("anks-code",CODE)}
  var num=function(v){v=parseInt(v,10);return isNaN(v)?null:Math.max(0,Math.min(120,v))};
  var email=$("#email").value.trim(),part=+$("#part").value;
  var wantLive=$("#liveJoin").checked;
  if(wantLive&&!email){m.textContent=t("liveNeedEmail");return}
  var liveMsg="";
  var btn=$("#send");btn.disabled=true;btn.textContent=t("sending");
  sha(CODE).then(function(pid){return sha(CODE+":"+part).then(function(sid){
    var batch=writeBatch(DB);
    batch.set(doc(DB,"people",pid),{name:name,country:country,lives:country==="HT"?"ayiti":"abroad",departement:country==="HT"?$("#dept").value:"",commune:commune,occupation:occ,occupationOther:occ==="Other"?$("#occOther").value.trim():"",yearsThere:num($("#years").value),yearsSinceLeft:country==="HT"?null:num($("#left").value),ageRange:$("#age").value||null,at:serverTimestamp()});
    if(email)batch.set(doc(DB,"emails",pid),{email:email,mayContact:$("#mayContact").checked,live:wantLive,at:serverTimestamp()});else batch.delete(doc(DB,"emails",pid));
    batch.set(doc(DB,"submissions",sid),{pid:pid,part:part,vote:vote,comment:comment,commentLang:$("#clang").value,wording:$("#wording").value.trim(),uiLang:lang,status:"new",at:serverTimestamp()});
    return (wantLive?Promise.all([getDoc(doc(DB,"public","cycle")),getDoc(doc(DB,"access",pid))]):Promise.resolve(null)).then(function(r){
      if(r){
        var end=r[0].exists()?r[0].data().end:null,ac=r[1].exists()?r[1].data():null;
        if(!end||end.toMillis()<=Date.now())liveMsg=t("liveClosed");
        else if(ac&&ac.until.toMillis()>Date.now())liveMsg=t("liveOk")+" "+fmtDate(ac.until.toDate());
        else{batch.set(doc(DB,"access",pid),{until:end,at:serverTimestamp()});liveMsg=t("liveOk")+" "+fmtDate(end.toDate())}
      }
      return batch.commit();
    });
  })}).then(function(){
    saveProfile();
    var lm=$("#liveMsg");lm.textContent=liveMsg;lm.hidden=!liveMsg;
    $("#codeOut").textContent=CODE;$("#done").hidden=false;$("#done").scrollIntoView({block:"center"});
  }).catch(function(err){m.textContent=t("errors");try{console.warn(err.message)}catch(x){}})
  .then(function(){btn.disabled=false;btn.textContent=t("send")});
}

function fmtDate(d){try{return new Intl.DateTimeFormat(lang==="ht"?"fr":lang,{dateStyle:"long"}).format(d)}catch(e){return d.toISOString().slice(0,10)}}

/* ---------- delete ---------- */
function del(){
  var c=$("#delCode").value.trim(),m=$("#delMsg");m.textContent="";
  if(!c||!ready())return;
  sha(c).then(function(pid){
    var jobs=[];for(var n=0;n<=47;n++)jobs.push(sha(c+":"+n));
    return Promise.all(jobs).then(function(sids){
      var batch=writeBatch(DB);
      sids.forEach(function(sid){batch.delete(doc(DB,"submissions",sid))});
      batch.delete(doc(DB,"access",pid));batch.delete(doc(DB,"emails",pid));batch.delete(doc(DB,"people",pid));
      return batch.commit();
    });
  }).then(function(){m.textContent=t("delDone");if(store("anks-code")===c){store("anks-code","");store("anks-profile","");CODE=""}}).catch(function(){m.textContent=t("errors")});
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