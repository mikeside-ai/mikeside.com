/* gatlinburg/packing.js — one packing list for everybody. State lives on the Railway service
   (GET/PUT /state/packing) and is shared by every phone; a local copy is kept so the page still
   renders offline and syncs when signal returns. Ticks carry who ticked them and when. */
(function(){
  "use strict";
  var API = "https://mikeside-publish-production.up.railway.app/state/packing";
  var TOKEN = "eb6e83d88d5720dd844aad1c103fbfde"; // low-privilege: can only write this list
  var grid = document.getElementById("grid"); if (!grid) return;
  var count = document.getElementById("count"), total = document.getElementById("total"), status = document.getElementById("sync-status");
  var NAME_KEY = "gatlinburg-2026-name", LOCAL_KEY = "gatlinburg-2026-packing-shared";
  var me = ""; try { me = localStorage.getItem(NAME_KEY) || ""; } catch(e){}
  var doc = { v: 0, data: {} };
  try { doc = JSON.parse(localStorage.getItem(LOCAL_KEY) || "null") || doc; } catch(e){}
  var dirty = false, saving = false, online = true;

  function say(t, cls){ if (!status) return; status.textContent = t; status.className = "sync " + (cls || ""); }
  function who(){ return me || "someone"; }
  /* Who's packing: a picker sheet instead of a text prompt. Picks are remembered per phone. */
  var NAMES = ["Vlad", "Allison", "Grandma", "Grandpa"];
  var sheet = null, pending = null;
  function setMe(n){
    me = (n || "").trim().slice(0, 20);
    try { if (me) localStorage.setItem(NAME_KEY, me); else localStorage.removeItem(NAME_KEY); } catch(e){}
    var nb = document.getElementById("name-btn"); if (nb) nb.textContent = me ? "Packing as " + me : "Who's packing?";
  }
  function askWho(then){
    pending = then || null;
    if (!sheet) {
      sheet = document.createElement("div"); sheet.className = "who-sheet"; sheet.hidden = true;
      sheet.innerHTML = '<div class="who-box"><p class="who-title">Who\'s packing?</p><p class="who-sub">So the list can show who ticked what.</p><div class="who-grid">' +
        NAMES.map(function(n){ return '<button type="button" data-n="' + n + '">' + n + '</button>'; }).join('') +
        '</div><form class="who-other"><input type="text" maxlength="20" placeholder="Someone else" aria-label="Name"><button type="submit">Use</button></form><button type="button" class="who-cancel">Cancel</button></div>';
      document.body.appendChild(sheet);
      sheet.addEventListener("click", function(e){
        var b = e.target.closest("button[data-n]");
        if (b) { pick(b.getAttribute("data-n")); return; }
        if (e.target.closest(".who-cancel") || e.target === sheet) { close(); if (pending) { var p = pending; pending = null; p(false); } }
      });
      sheet.querySelector(".who-other").addEventListener("submit", function(e){ e.preventDefault(); var v = sheet.querySelector("input").value.trim(); if (v) pick(v); });
    }
    [].slice.call(sheet.querySelectorAll("button[data-n]")).forEach(function(b){ b.classList.toggle("on", b.getAttribute("data-n") === me); });
    sheet.hidden = false;
  }
  function pick(n){ setMe(n); close(); if (pending) { var p = pending; pending = null; p(true); } }
  function close(){ if (sheet) sheet.hidden = true; }

  // ---- render ----
  function itemEl(id, name, why, star, custom){
    var li = document.createElement("li"); li.setAttribute("data-id", id);
    li.innerHTML = '<label><input type="checkbox"><span>' + (star ? '<span class="star">&#9733;</span> ' : '') + name + (why ? '<em>' + why + '</em>' : '') + '<small class="by"></small></span></label>' + (custom ? '<button type="button" class="rm" title="Remove">&times;</button>' : '');
    return li;
  }
  function paint(){
    var boxes = grid.querySelectorAll("li[data-id]"), n = 0;
    [].slice.call(boxes).forEach(function(li){
      var st = doc.data[li.getAttribute("data-id")] || {};
      var box = li.querySelector("input"); box.checked = !!st.c; if (st.c) n++;
      var by = li.querySelector(".by"); by.textContent = st.c && st.by ? "✓ " + st.by + (st.at ? " · " + ago(st.at) : "") : "";
    });
    if (count) count.textContent = n; if (total) total.textContent = boxes.length;
    document.querySelectorAll(".pack-cat").forEach(function(cat){
      var all = cat.querySelectorAll("li[data-id]"), done = cat.querySelectorAll("li[data-id] input:checked");
      var tag = cat.querySelector(".cat-count"); if (tag) tag.textContent = done.length + "/" + all.length;
      cat.classList.toggle("done", all.length && done.length === all.length);
      var jump = document.querySelector('.jump[data-jump="' + cat.getAttribute("data-cat") + '"]');
      if (jump) { jump.querySelector(".jump-count").textContent = done.length + "/" + all.length; jump.classList.toggle("done", all.length && done.length === all.length); }
    });
  }
  function ago(t){ var m = Math.round((Date.now() - t) / 60000); if (m < 1) return "just now"; if (m < 60) return m + "m ago"; var h = Math.round(m / 60); if (h < 24) return h + "h ago"; return Math.round(h / 24) + "d ago"; }
  function renderCustom(){
    Object.keys(doc.data).forEach(function(k){
      if (k.indexOf("x-") !== 0) return;
      var it = doc.data[k]; if (!it || it.gone) { var old = grid.querySelector('li[data-id="' + k + '"]'); if (old) old.remove(); return; }
      if (grid.querySelector('li[data-id="' + k + '"]')) return;
      var cat = grid.querySelector('.pack-cat[data-cat="' + (it.cat || "extra") + '"] ul') || grid.querySelector('.pack-cat[data-cat="extra"] ul');
      if (cat) cat.appendChild(itemEl(k, it.name, it.by ? "Added by " + it.by : "", false, true));
    });
  }

  // ---- sync ----
  function persistLocal(){ try { localStorage.setItem(LOCAL_KEY, JSON.stringify(doc)); } catch(e){} }
  function merge(remote){
    if (!remote || typeof remote.data !== "object") return;
    if (!dirty) { doc = remote; return; }
    // keep my unsaved edits (newest timestamp wins per item), take everything else from the server
    var out = Object.assign({}, remote.data);
    Object.keys(doc.data).forEach(function(k){ var a = remote.data[k], b = doc.data[k]; if (!a || (b.at || 0) >= (a.at || 0)) out[k] = b; });
    doc = { v: remote.v, data: out, at: remote.at };
  }
  function pull(){
    if (!window.fetch) return;
    fetch(API, { cache: "no-store" }).then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); }).then(function(remote){
      online = true; merge(remote); persistLocal(); renderCustom(); paint();
      say(dirty ? "Saving…" : "Shared list · synced " + ago(remote.at || Date.now()), "ok");
      if (dirty) push();
    }).catch(function(){ online = false; say("Offline. Ticks are kept on this phone and will sync.", "off"); });
  }
  var pushTmr;
  function push(){
    clearTimeout(pushTmr);
    pushTmr = setTimeout(function(){
      if (saving || !window.fetch) return; saving = true;
      fetch(API, { method: "PUT", headers: { "content-type": "application/json", "x-state-token": TOKEN }, body: JSON.stringify({ v: doc.v, data: doc.data }) })
        .then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function(saved){ saving = false; dirty = false; doc = saved; persistLocal(); renderCustom(); paint(); say("Shared list · saved just now", "ok"); })
        .catch(function(){ saving = false; online = false; say("Offline. Ticks are kept on this phone and will sync.", "off"); });
    }, 350);
  }
  function set(id, patch){
    var cur = doc.data[id] || {};
    doc.data[id] = Object.assign({}, cur, patch, { at: Date.now() });
    dirty = true; persistLocal(); paint(); say("Saving…"); push();
  }

  // ---- events ----
  grid.addEventListener("change", function(e){
    var box = e.target; if (box.type !== "checkbox") return;
    var li = box.closest("li[data-id]"); if (!li) return;
    var id = li.getAttribute("data-id");
    if (box.checked && !me) { box.checked = false; askWho(function(ok){ if (ok) { box.checked = true; set(id, { c: 1, by: who() }); } }); return; }
    set(id, { c: box.checked ? 1 : 0, by: box.checked ? who() : "" });
  });
  grid.addEventListener("click", function(e){
    var rm = e.target.closest(".rm"); if (!rm) return;
    var li = rm.closest("li[data-id]"); var id = li.getAttribute("data-id");
    if (!window.confirm("Remove this item for everyone?")) return;
    set(id, { gone: 1, c: 0 }); li.remove();
  });
  var addForm = document.getElementById("add-form");
  if (addForm) addForm.addEventListener("submit", function(e){
    e.preventDefault();
    var name = document.getElementById("add-name").value.trim(); var cat = document.getElementById("add-cat").value;
    if (!name) return;
    if (!me) { askWho(function(ok){ if (ok) addForm.requestSubmit ? addForm.requestSubmit() : addForm.dispatchEvent(new Event("submit", {cancelable:true})); }); return; }
    var id = "x-" + Date.now().toString(36);
    doc.data[id] = { name: name.replace(/[<>]/g, ""), cat: cat, c: 0, by: who(), at: Date.now() };
    dirty = true; persistLocal(); renderCustom(); paint(); push();
    document.getElementById("add-name").value = "";
  });
  var clear = document.getElementById("clear");
  if (clear) clear.addEventListener("click", function(){
    if (!window.confirm("Untick everything for everyone? (Items stay; only the ticks reset.)")) return;
    var now = Date.now();
    Object.keys(doc.data).forEach(function(k){ if (doc.data[k] && doc.data[k].c) doc.data[k] = Object.assign({}, doc.data[k], { c: 0, by: "", at: now }); });
    dirty = true; persistLocal(); paint(); push();
  });
  var print = document.getElementById("print"); if (print) print.addEventListener("click", function(){ window.print(); });
  var nameBtn = document.getElementById("name-btn");
  if (nameBtn) { nameBtn.textContent = me ? "Packing as " + me : "Who's packing?"; nameBtn.addEventListener("click", function(){ askWho(null); }); }

  renderCustom(); paint(); say("Loading the shared list…");
  pull(); setInterval(pull, 12000);
  window.addEventListener("online", pull);
  document.addEventListener("visibilitychange", function(){ if (!document.hidden) pull(); });
})();
