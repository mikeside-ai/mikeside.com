/* Bear log: shared sightings, same server as the packing list. Anyone with the PIN can add one. */
(function(){
  var API = "https://mikeside-publish-production.up.railway.app/state/bears";
  var TOKEN = "eb6e83d88d5720dd844aad1c103fbfde";
  var NAME_KEY = "gatlinburg-2026-name";
  var list = document.getElementById("log-list"), form = document.getElementById("log-form"), status = document.getElementById("log-status"), count = document.getElementById("log-count");
  if (!list || !form) return;
  var doc = { v: 0, data: {} };
  function ago(t){ var m = Math.round((Date.now() - t) / 60000); if (m < 1) return "just now"; if (m < 60) return m + "m ago"; var h = Math.round(m / 60); if (h < 24) return h + "h ago"; return Math.round(h / 24) + "d ago"; }
  function esc(s){ return String(s || "").replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function when(t){ var d = new Date(t); return d.toLocaleDateString("en-US", {weekday:"short", month:"short", day:"numeric", timeZone:"America/New_York"}) + " " + d.toLocaleTimeString("en-US", {hour:"numeric", minute:"2-digit", timeZone:"America/New_York"}); }
  function render(){
    var items = Object.keys(doc.data).map(function(k){ var it = doc.data[k]; it.id = k; return it; }).filter(function(it){ return it && !it.gone; }).sort(function(a, b){ return b.at - a.at; });
    var total = items.reduce(function(n, it){ return n + (+it.n || 1); }, 0);
    if (count) count.textContent = total;
    if (!items.length) { list.innerHTML = '<li class="log-empty">No bears yet. The first one gets logged by whoever sees it.</li>'; return; }
    list.innerHTML = items.map(function(it){
      return '<li class="log-item"><span class="log-n">' + (+it.n || 1) + ' &#x1F43B;</span><div><strong>' + esc(it.where) + '</strong>' + (it.note ? '<p>' + esc(it.note) + '</p>' : '') + '<small>' + esc(it.who) + ' &middot; ' + when(it.at) + ' &middot; ' + ago(it.at) + '</small></div>' + (it.who === me() ? '<button type="button" class="rm" data-id="' + it.id + '" aria-label="Remove">&times;</button>' : '') + '</li>';
    }).join("");
  }
  function me(){ try { return localStorage.getItem(NAME_KEY) || ""; } catch(e){ return ""; } }
  function say(t){ if (status) status.textContent = t; }
  function pull(){
    fetch(API, { cache: "no-store" }).then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); }).then(function(remote){
      doc = { v: remote.v || 0, data: remote.data || {} }; render(); say("Shared log · updated " + ago(Date.now()));
    }).catch(function(){ say("Offline. Showing what this phone last saw."); });
  }
  function push(){
    fetch(API, { method: "PUT", headers: { "content-type": "application/json", "x-state-token": TOKEN }, body: JSON.stringify({ v: doc.v, data: doc.data }) })
      .then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); }).then(function(remote){ doc = { v: remote.v || doc.v, data: remote.data || doc.data }; render(); say("Saved for everyone."); })
      .catch(function(){ say("Couldn't save. Try again when there's signal."); });
  }
  form.addEventListener("submit", function(e){
    e.preventDefault();
    var where = document.getElementById("log-where").value.trim(), note = document.getElementById("log-note").value.trim(), n = +document.getElementById("log-n").value || 1;
    var who = me() || window.prompt("Who saw it? First name.") || "someone";
    try { localStorage.setItem(NAME_KEY, who); } catch(x){}
    if (!where) return;
    doc.data["b-" + Date.now().toString(36)] = { who: who.slice(0, 20), where: where.slice(0, 60), note: note.slice(0, 160), n: Math.min(n, 9), at: Date.now() };
    render(); push();
    document.getElementById("log-note").value = ""; document.getElementById("log-where").value = "";
  });
  list.addEventListener("click", function(e){
    var rm = e.target.closest(".rm"); if (!rm) return;
    var it = doc.data[rm.getAttribute("data-id")]; if (!it) return;
    it.gone = 1; it.at = Date.now(); render(); push();
  });
  pull(); setInterval(pull, 20000);
})();
