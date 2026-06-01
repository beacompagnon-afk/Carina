(function(){
  "use strict";
  var A = self.CARINA_ASSETS || {cats:[], moments:[]};
  var $ = function(s){return document.querySelector(s);};
  var rand = function(a){return a[Math.floor(Math.random()*a.length)];};
  var CAT_API = "https://api.thecatapi.com/v1/images/search";
  var VAPID_PUBLIC = "BNWmyFrBKRnbkEdHAjSBdwCwWOLvhQZTHb2xNgygvaxvz1IZiUG2vkiC9ABi79HiUYDug8C52-YiooGewrtSVPg";
  // subscription is written server-side (api/subscribe) so no Google key lives in the client
  window.CARINA_SAVE_SUB = function(sub){
    try{
      fetch("/api/subscribe", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({sub:sub})}).catch(function(){});
    }catch(_){}
  };

  var WELCOME = "hi Dawn. it's Béa.\n\ni made you a small thing. it just brings you a cat or a moment every day. open it whenever. ignore it whenever. there's no right way to use it and nothing to keep up with.\n\ni can't even imagine what it is like to go through it again. i'm thinking of you, from a long way away.";

  var LINES = [
    "professional loafer. master of doing nothing. a role model, honestly.",
    "she's judging the room, not you. you're fine.",
    "this one's job today is to be looked at. she's nailing it.",
    "has not earned this nap and is taking it anyway. icon.",
    "pays no rent, apologizes for nothing.",
    "heard there was a problem and chose not to attend. borrow that energy.",
    "reviewed the day, found it lacking, went back to sleep.",
    "has a five-year plan. it's this.",
    "believes she invented sitting. will not be corrected.",
    "did nothing today and would do it again.",
    "this one's whole personality is \"no.\" respect it.",
    "unbothered. moisturized. horizontal.",
    "woke up, judged the curtains, went back to sleep.",
    "has decided today is fine. take it as a second opinion.",
    "ran the numbers. the answer is another nap.",
    "never lost an argument. has never had one.",
    "supervising. poorly. with total confidence."
  ];
  var HELLOS = ["there you are.","hi. glad you came by.","good to see you.","come in.","look who it is."];
  var ROUGH = [
    "okay. you came here, so it's a hard one. let's just be here a second.",
    "this is a brutal thing you're going through. it's allowed to be as hard as it is.",
    "nothing's gone wrong with you. you're not doing this wrong. there's no doing it wrong.",
    "you don't have to be brave right now. you don't have to be anything."
  ];
  var MOODS = ["make me laugh","something soft","i'm scared","just sit with me","surprise me"];
  var ENVS = [
    {k:"sleep", label:"you can't sleep", kind:"cat"},
    {k:"scared", label:"you're scared", kind:"moment"},
    {k:"laugh", label:"you need to laugh", kind:"cat"},
    {k:"alone", label:"you feel alone", kind:"cat"},
    {k:"toomuch", label:"it's all too much", kind:"moment"}
  ];

  var kept = JSON.parse(localStorage.getItem("carina_kept")||"[]");
  var current = null;
  var mood = null;

  function bundledCat(){ return "./cats/"+rand(A.cats); }
  function bundledMoment(){ return "./moments/"+rand(A.moments); }
  function fallbackFor(kind){ return kind==="moment" ? "./moments/"+A.moments[0] : "./cats/"+A.cats[0]; }

  function setImg(photoEl, src, kind){
    photoEl.innerHTML = "";
    var img = new Image();
    img.alt = kind==="moment" ? "a calm place" : "a cat";
    img.onerror = function(){ if(img.src.indexOf(fallbackFor(kind))<0){ img.src = fallbackFor(kind); } };
    img.src = src;
    photoEl.appendChild(img);
  }
  function spin(photoEl){ photoEl.innerHTML = '<div class="spinner">…</div>'; }

  function chooseKind(){
    if(mood==="make me laugh") return "cat";
    if(mood==="something soft"||mood==="i'm scared"||mood==="just sit with me") return "moment";
    return Math.random()<0.6 ? "cat" : "moment";
  }

  // Deliver into the Today card
  function deliver(){
    var photoEl = $("#todayPhoto"), lineEl = $("#todayLine");
    var kind = chooseKind();
    if(kind==="cat"){
      spin(photoEl);
      lineEl.textContent = "";
      var line = rand(LINES);
      fetch(CAT_API).then(function(r){return r.json();}).then(function(j){
        var url = (j && j[0] && j[0].url) ? j[0].url : bundledCat();
        setImg(photoEl, url, "cat");
        lineEl.textContent = line;
        current = {kind:"cat", src:url, line:line};
        saveToday();
      }).catch(function(){
        var url = bundledCat();
        setImg(photoEl, url, "cat");
        lineEl.textContent = line;
        current = {kind:"cat", src:url, line:line};
        saveToday();
      });
    } else {
      var src = bundledMoment();
      setImg(photoEl, src, "moment");
      lineEl.textContent = "";
      current = {kind:"moment", src:src, line:""};
      saveToday();
    }
    syncHeart();
  }

  function renderCurrent(){
    var photoEl = $("#todayPhoto"), lineEl = $("#todayLine");
    setImg(photoEl, current.src, current.kind);
    lineEl.textContent = current.line || "";
    syncHeart();
  }

  function saveToday(){
    localStorage.setItem("carina_today", JSON.stringify({date:new Date().toDateString(), item:current}));
  }

  function isKept(src){ return kept.some(function(x){return x.src===src;}); }
  function syncHeart(){ $("#keepBtn").classList.toggle("on", current && isKept(current.src)); }
  function toggleKeep(){
    if(!current) return;
    if(isKept(current.src)){ kept = kept.filter(function(x){return x.src!==current.src;}); }
    else { kept.unshift({kind:current.kind, src:current.src, line:current.line}); }
    localStorage.setItem("carina_kept", JSON.stringify(kept));
    syncHeart();
  }

  function renderKept(){
    var g = $("#keptGrid"); g.innerHTML="";
    $("#keptEmpty").classList.toggle("hidden", kept.length>0);
    kept.forEach(function(item){
      var d = document.createElement("div"); d.className="photo";
      var img = new Image(); img.src=item.src; img.alt = item.kind==="moment"?"a calm place":"a cat";
      img.onerror=function(){ img.src=fallbackFor(item.kind); };
      d.appendChild(img);
      d.onclick=function(){ openViewer(item.kind, item.src, item.line||""); };
      g.appendChild(d);
    });
  }

  // Viewer (open-when + kept)
  var viewerKind = "cat";
  function openViewer(kind, src, label){
    viewerKind = kind;
    var p = $("#viewerPhoto");
    setImg(p, src, kind);
    var lab = $("#viewerLabel");
    lab.textContent = label||"";
    lab.style.display = label ? "block":"none";
    show("#viewer");
  }
  function viewerContent(kind, cb){
    if(kind==="cat"){
      spin($("#viewerPhoto"));
      fetch(CAT_API).then(function(r){return r.json();}).then(function(j){
        cb((j&&j[0]&&j[0].url)?j[0].url:bundledCat());
      }).catch(function(){ cb(bundledCat()); });
    } else { cb(bundledMoment()); }
  }
  function openEnv(env){
    if(env.k==="alone"){ openViewer("cat", "./carina.jpg", ""); return; }
    viewerContent(env.kind, function(src){ openViewer(env.kind, src, ""); });
  }

  // Rough day
  var roughIdx = 0;
  function startRough(){
    roughIdx = 0;
    var box = $("#roughbeats"); box.innerHTML="";
    ROUGH.forEach(function(t){
      var p=document.createElement("p"); p.className="rline"; p.textContent=t; box.appendChild(p);
    });
    var hint=document.createElement("p"); hint.className="tap-hint"; hint.id="roughHint"; hint.textContent="tap to continue"; box.appendChild(hint);
    show("#rough");
    setTimeout(function(){ box.children[0].classList.add("show"); }, 200);
  }
  function roughNext(){
    var box=$("#roughbeats");
    if(roughIdx < ROUGH.length-1){
      roughIdx++;
      box.children[roughIdx].classList.add("show");
      if(roughIdx===ROUGH.length-1){ var h=$("#roughHint"); if(h) h.style.display="none"; }
    }
  }

  // Screens / layers
  function show(sel){ $(sel).classList.remove("hidden"); }
  function hide(sel){ $(sel).classList.add("hidden"); }
  function goScreen(name){
    ["today","openwhen","kept"].forEach(function(n){ $("#"+n).classList.toggle("active", n===name); });
    document.querySelectorAll(".nav button[data-screen]").forEach(function(b){ b.classList.toggle("on", b.getAttribute("data-screen")===name); });
    if(name==="kept") renderKept();
  }

  // Nudge / push (guarded; real push wired at deploy)
  function urlB64ToUint8(base64){
    var pad="=".repeat((4-base64.length%4)%4);
    var b=(base64+pad).replace(/-/g,"+").replace(/_/g,"/");
    var raw=atob(b), arr=new Uint8Array(raw.length);
    for(var i=0;i<raw.length;i++) arr[i]=raw.charCodeAt(i);
    return arr;
  }
  function enableNudge(cb){
    if(!("Notification" in window)){ cb(false); return; }
    Notification.requestPermission().then(function(p){
      var ok = p==="granted";
      if(ok && VAPID_PUBLIC && "serviceWorker" in navigator){
        navigator.serviceWorker.ready.then(function(reg){
          return reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:urlB64ToUint8(VAPID_PUBLIC)});
        }).then(function(sub){
          if(window.CARINA_SAVE_SUB) window.CARINA_SAVE_SUB(sub);
        }).catch(function(){});
      }
      localStorage.setItem("carina_nudge", ok?"1":"0");
      cb(ok);
    });
  }
  function nudgeOn(){ return localStorage.getItem("carina_nudge")==="1"; }
  function syncToggle(){ $("#nudgeToggle").classList.toggle("on", nudgeOn()); }

  // Init
  function startApp(){
    hide("#welcome"); hide("#nudge"); show("#app");
    $("#hello").textContent = rand(HELLOS);
    var saved = JSON.parse(localStorage.getItem("carina_today")||"null");
    if(saved && saved.date===new Date().toDateString() && saved.item){ current=saved.item; renderCurrent(); }
    else { deliver(); }
  }

  function init(){
    // moods
    var mc=$("#moods");
    MOODS.forEach(function(m){
      var b=document.createElement("button"); b.className="mood"; b.textContent=m;
      b.onclick=function(){
        if(mood===m){ mood=null; b.classList.remove("sel"); }
        else { mood=m; document.querySelectorAll(".mood").forEach(function(x){x.classList.remove("sel");}); b.classList.add("sel"); }
        deliver();
      };
      mc.appendChild(b);
    });
    // envelopes
    var ec=$("#envs");
    ENVS.forEach(function(env){
      var b=document.createElement("button"); b.className="env";
      b.innerHTML='<span>open when '+env.label+'</span><span class="chev">›</span>';
      b.onclick=function(){ openEnv(env); };
      ec.appendChild(b);
    });
    // today actions
    $("#another").onclick=deliver;
    $("#keepBtn").onclick=toggleKeep;
    // nav
    document.querySelectorAll(".nav button[data-screen]").forEach(function(b){
      b.onclick=function(){ goScreen(b.getAttribute("data-screen")); };
    });
    $("#roughEntry").onclick=startRough;
    // rough
    $("#rough").onclick=function(e){ if(e.target.closest(".rb")) return; roughNext(); };
    $("#roughCat").onclick=function(e){ e.stopPropagation(); hide("#rough"); goScreen("today"); mood=null; document.querySelectorAll(".mood").forEach(function(x){x.classList.remove("sel");}); deliver(); };
    $("#roughClose").onclick=function(e){ e.stopPropagation(); hide("#rough"); };
    // viewer
    $("#closeViewer").onclick=function(){ hide("#viewer"); };
    $("#viewerAnother").onclick=function(){ viewerContent(viewerKind, function(src){ setImg($("#viewerPhoto"), src, viewerKind); }); };
    // sheet
    $("#openSheet").onclick=function(){ syncToggle(); show("#sheet"); };
    $("#closeSheet").onclick=function(){ hide("#sheet"); };
    $("#sheet").onclick=function(e){ if(e.target.id==="sheet") hide("#sheet"); };
    $("#nudgeToggle").onclick=function(){
      if(nudgeOn()){ localStorage.setItem("carina_nudge","0"); syncToggle(); }
      else { enableNudge(function(){ syncToggle(); }); }
    };
    // welcome / first run
    $("#welcomeNote").textContent = WELCOME;
    $("#welcomeGo").onclick=function(){ hide("#welcome"); show("#nudge"); };
    $("#nudgeYes").onclick=function(){ enableNudge(function(){ finishOnboard(); }); };
    $("#nudgeNo").onclick=function(){ localStorage.setItem("carina_nudge","0"); finishOnboard(); };

    if(localStorage.getItem("carina_seen")==="1"){ startApp(); }
    else { show("#welcome"); }

    if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(function(){}); }
  }
  function finishOnboard(){ localStorage.setItem("carina_seen","1"); startApp(); }

  if(document.readyState!=="loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
