/* ---- block 1 ---- */
(function(){
  var t=document.getElementById('holdings');
  if(!t||!t.tBodies.length) return;
  var tb=t.tBodies[0];
  var st={col:4,dir:-1};
  function arrows(col){
    var ths=t.tHead.rows[0].cells;
    for(var i=0;i<ths.length;i++){
      var ar=ths[i].querySelector('.ar');
      if(ar) ar.textContent=(i===col?(st.dir>0?' ▲':' ▼'):'');
    }
  }
  window.sortH=function(col){
    if(st.col===col){ st.dir=-st.dir; } else { st.col=col; st.dir=(col===0?1:-1); }
    var rows=Array.prototype.slice.call(tb.rows);
    rows.sort(function(a,b){
      var x=a.cells[col].textContent.trim(), y=b.cells[col].textContent.trim();
      if(col===0){ return st.dir*(x<y?-1:(x>y?1:0)); }
      var xn=parseFloat(x.replace(/[^0-9.\-]/g,'')), yn=parseFloat(y.replace(/[^0-9.\-]/g,''));
      var xb=isNaN(xn), yb=isNaN(yn);
      if(xb&&yb) return 0; if(xb) return 1; if(yb) return -1;
      return st.dir*(xn-yn);
    });
    var f=document.createDocumentFragment();
    rows.forEach(function(r){ f.appendChild(r); });
    tb.appendChild(f);
    arrows(col);
  };
  arrows(4);
})();

/* ---- block 2 ---- */
var ST={emv:91313.73,cr:12241.77,debit:48359.65};
function stressSet(v){var s=document.getElementById('s_drop');s.value=v;stressCalc();}
function fm(x){var n=Math.round(Math.abs(x)).toLocaleString('en-US');return (x<0?'-$':'$')+n;}
function stressCalc(){
  var d=+document.getElementById('s_drop').value, m=+document.getElementById('s_mnt').value, b=+document.getElementById('s_beta').value/100;
  document.getElementById('sd').textContent='-'+d+'%';
  document.getElementById('sm').textContent=m+'%';
  document.getElementById('sb').textContent=b.toFixed(1)+'x';
  var e=ST.emv*(1-d/100), c=ST.cr*Math.max(0,1-d*b/100), net=e+c-ST.debit;
  var net0=ST.emv+ST.cr-ST.debit;
  var eqp=e>0?(e-ST.debit)/e*100:-999;
  var exc=(e-ST.debit)-(m/100)*e;
  document.getElementById('o_eq').textContent=fm(e);
  document.getElementById('o_cr').textContent=fm(c);
  var on=document.getElementById('o_net');on.textContent=fm(net);on.className='val '+(net>=0?'pos':'neg');
  document.getElementById('o_netd').textContent=((net-net0)/net0*100).toFixed(0)+'% vs today';
  var oe=document.getElementById('o_eqp');oe.textContent=(eqp<-900?'wiped':eqp.toFixed(1)+'%');
  oe.className='val '+(eqp>=m+5?'pos':(eqp>=m?'warn-y':'neg'));
  document.getElementById('o_req').textContent=m+'%';
  var ox=document.getElementById('o_exc');ox.textContent=fm(exc);ox.className='val '+(exc>=0?'pos':'neg');
  document.getElementById('o_excs').textContent=exc>=0?'room before a call':'this is the call amount';
  var callAt=(1-(ST.debit/(1-m/100))/ST.emv)*100;
  var vd=document.getElementById('o_vd'), vs=document.getElementById('o_vds');
  if(exc<0){vd.textContent='MARGIN CALL';vd.className='val neg';vs.textContent='deposit or sell '+fm(Math.abs(exc)/(1-m/100))+' of stock';}
  else if(net<=0){vd.textContent='WIPED OUT';vd.className='val neg';vs.textContent='equity exhausted';}
  else if(exc<ST.emv*0.02){vd.textContent='ON THE EDGE';vd.className='val warn-y';vs.textContent='under 2% of book in cushion';}
  else {vd.textContent='SURVIVES';vd.className='val pos';vs.textContent='call would start at -'+callAt.toFixed(1)+'%';}
  document.getElementById('o_bar').style.width=(d/60*100)+'%';
  document.getElementById('o_bar').className=(exc<0?'neg':(exc<ST.emv*0.02?'wy':'pos'));
  var cm=document.getElementById('o_mark');
  if(callAt>=0&&callAt<=60){cm.style.left=(callAt/60*100)+'%';cm.style.display='block';}else{cm.style.display='none';}
  document.getElementById('o_callat').textContent=(callAt<0?'already past the line at '+m+'%':'call at -'+callAt.toFixed(1)+'%');
}
stressCalc();

/* ---- block 3 ---- */
var SIM=[{"s": "RKLB", "mv": 16229.0, "pnl": 7951.0, "q": 200.0, "st": 1.0, "th": "Space & Satellite", "d": 1.42}, {"s": "PLTR", "mv": 12833.25, "pnl": 1001.25, "q": 75.0, "st": 1.0, "th": "AI & Semis", "d": -2.19}, {"s": "NVDA", "mv": 10086.75, "pnl": 2463.75, "q": 45.0, "st": 1.0, "th": "AI & Semis", "d": 3.06}, {"s": "NOW", "mv": 9996.8, "pnl": 2724.0, "q": 80.0, "st": 1.0, "th": "AI & Semis", "d": -2.02}, {"s": "LUNR", "mv": 3394.0, "pnl": 1520.0, "q": 200.0, "st": 1.0, "th": "Space & Satellite", "d": 2.97}, {"s": "PL", "mv": 3061.88, "pnl": 2500.62, "q": 125.0, "st": 1.0, "th": "Space & Satellite", "d": 3.35}, {"s": "HOOD", "mv": 2372.88, "pnl": 831.12, "q": 25.0, "st": 1.0, "th": "Fintech", "d": 0.57}, {"s": "PANW", "mv": 1935.0, "pnl": 40.0, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.83}, {"s": "RDW", "mv": 1753.7, "pnl": 137.8, "q": 130.0, "st": 0.6923, "th": "Space & Satellite", "d": -0.15}, {"s": "QCOM", "mv": 1630.7, "pnl": -662.5, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": 0.24}, {"s": "XOM", "mv": 1597.6, "pnl": 62.1, "q": 10.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -0.03}, {"s": "NEM", "mv": 1178.5, "pnl": 238.5, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 0.55}, {"s": "HON", "mv": 1176.65, "pnl": -44.1, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 2.26}, {"s": "VOYG", "mv": 1075.0, "pnl": 110.0, "q": 25.0, "st": 0.6, "th": "Space & Satellite", "d": 0.23}, {"s": "NIO", "mv": 907.0, "pnl": -727.0, "q": 200.0, "st": 0.0, "th": "EV & Auto", "d": -1.84}, {"s": "VWO", "mv": 905.85, "pnl": 190.8, "q": 15.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.45}, {"s": "IONQ", "mv": 903.8, "pnl": -237.0, "q": 20.0, "st": 1.0, "th": "Quantum", "d": 4.03}, {"s": "IREN", "mv": 873.2, "pnl": 60.2, "q": 20.0, "st": 1.0, "th": "Crypto & Miners", "d": 9.84}, {"s": "VSAT", "mv": 872.9, "pnl": 782.9, "q": 10.0, "st": 1.0, "th": "Space & Satellite", "d": 3.28}, {"s": "BP", "mv": 858.8, "pnl": 272.4, "q": 20.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -0.51}, {"s": "HONA", "mv": 838.95, "pnl": -320.3, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 1.12}, {"s": "KSS", "mv": 771.4, "pnl": 341.4, "q": 40.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 4.3}, {"s": "REMX", "mv": 770.5, "pnl": 25.5, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 0.43}, {"s": "ASTS", "mv": 743.1, "pnl": 538.1, "q": 10.0, "st": 1.0, "th": "Space & Satellite", "d": 3.74}, {"s": "SPCX", "mv": 730.9, "pnl": -204.1, "q": 5.0, "st": 1.0, "th": "Space & Satellite", "d": 9.67}, {"s": "KTOS", "mv": 638.0, "pnl": -56.0, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.11}, {"s": "HIMS", "mv": 599.6, "pnl": 33.4, "q": 20.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.74}, {"s": "META", "mv": 578.85, "pnl": -16.15, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": -3.38}, {"s": "SPCE", "mv": 563.55, "pnl": -1063.35, "q": 170.0, "st": 0.1176, "th": "Space & Satellite", "d": 0.76}, {"s": "MP", "mv": 541.0, "pnl": -69.0, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": -2.06}, {"s": "SOFI", "mv": 538.2, "pnl": 123.3, "q": 30.0, "st": 1.0, "th": "Fintech", "d": -0.22}, {"s": "FISV", "mv": 515.5, "pnl": -74.5, "q": 10.0, "st": 1.0, "th": "Fintech", "d": -2.22}, {"s": "STUB", "mv": 512.7, "pnl": -189.9, "q": 60.0, "st": 1.0, "th": "Fintech", "d": 4.33}, {"s": "ABSI", "mv": 475.0, "pnl": 312.0, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.96}, {"s": "QBTS", "mv": 415.1, "pnl": -129.3, "q": 20.0, "st": 1.0, "th": "Quantum", "d": 2.6}, {"s": "VYX", "mv": 408.0, "pnl": 69.0, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 1.37}, {"s": "GPRO", "mv": 402.57, "pnl": -465.43, "q": 700.0, "st": 0.9143, "th": "Speculative / Meme / Other", "d": -7.24}, {"s": "JOBY", "mv": 397.25, "pnl": 25.75, "q": 50.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": -5.64}, {"s": "RGTI", "mv": 368.4, "pnl": -86.6, "q": 20.0, "st": 1.0, "th": "Quantum", "d": 1.82}, {"s": "BBAI", "mv": 326.0, "pnl": -122.0, "q": 100.0, "st": 1.0, "th": "AI & Semis", "d": -2.1}, {"s": "VYGR", "mv": 319.5, "pnl": 19.5, "q": 100.0, "st": 1.0, "th": "Space & Satellite", "d": -0.16}, {"s": "ACHR", "mv": 314.25, "pnl": -145.25, "q": 50.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": -7.44}, {"s": "KULR", "mv": 298.5, "pnl": -474.5, "q": 100.0, "st": 0.375, "th": "Space & Satellite", "d": 6.61}, {"s": "REA", "mv": 268.42, "pnl": -201.58, "q": 20.0, "st": 1.0, "th": "Space & Satellite", "d": -1.1}, {"s": "CBRS", "mv": 262.13, "pnl": -42.87, "q": 1.0, "st": 1.0, "th": "Space & Satellite", "d": 11.66}, {"s": "LCID", "mv": 262.0, "pnl": -432.4, "q": 40.0, "st": 0.5, "th": "EV & Auto", "d": -2.24}, {"s": "NVDY", "mv": 261.5, "pnl": -8.5, "q": 20.0, "st": 1.0, "th": "AI & Semis", "d": 2.63}, {"s": "AMC", "mv": 253.5, "pnl": 83.5, "q": 100.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 5.63}, {"s": "AMPX", "mv": 244.9, "pnl": 124.9, "q": 20.0, "st": 1.0, "th": "Nuclear / Energy Tech", "d": 1.37}, {"s": "YELP", "mv": 236.6, "pnl": 6.6, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": 0.21}, {"s": "MNRO", "mv": 229.6, "pnl": -100.4, "q": 20.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.54}, {"s": "DFTX", "mv": 213.85, "pnl": 38.85, "q": 5.0, "st": 1.0, "th": "Quantum", "d": 4.55}, {"s": "CVX", "mv": 196.59, "pnl": 40.59, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -0.04}, {"s": "GIS", "mv": 190.88, "pnl": -42.82, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.65}, {"s": "CDE", "mv": 188.0, "pnl": -17.0, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 1.18}, {"s": "SOUN", "mv": 185.12, "pnl": -53.12, "q": 25.0, "st": 1.0, "th": "AI & Semis", "d": -0.07}, {"s": "BMNR", "mv": 178.9, "pnl": -191.1, "q": 10.0, "st": 1.0, "th": "Crypto & Miners", "d": -1.11}, {"s": "OPEN", "mv": 174.75, "pnl": -56.25, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.37}, {"s": "VKTX", "mv": 170.2, "pnl": 25.2, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.71}, {"s": "VCX", "mv": 157.44, "pnl": -1292.56, "q": 5.0, "st": 1.0, "th": "Space & Satellite", "d": -0.67}, {"s": "OPENW", "mv": 143.64, "pnl": -829.36, "q": 700.0, "st": 0.9991, "th": "Speculative / Meme / Other", "d": -5.87}, {"s": "F", "mv": 138.4, "pnl": 8.4, "q": 10.0, "st": 1.0, "th": "EV & Auto", "d": -1.0}, {"s": "INFQ", "mv": 123.6, "pnl": -26.4, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": 4.57}, {"s": "EVTL", "mv": 123.2, "pnl": -340.31, "q": 150.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": -7.37}, {"s": "SFGYY", "mv": 120.5, "pnl": 14.25, "q": 25.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 0.0}, {"s": "CEPO", "mv": 106.7, "pnl": -18.3, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -0.09}, {"s": "NOK", "mv": 103.4, "pnl": -16.6, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 9.53}, {"s": "INTC", "mv": 100.95, "pnl": 79.95, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": 3.32}, {"s": "MARA", "mv": 96.46, "pnl": -43.54, "q": 10.0, "st": 1.0, "th": "Crypto & Miners", "d": -0.36}, {"s": "SHEL", "mv": 90.06, "pnl": 24.71, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -0.49}, {"s": "BB", "mv": 87.75, "pnl": 23.75, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.28}, {"s": "WEN", "mv": 86.6, "pnl": 2.3, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 14.7}, {"s": "CRML", "mv": 79.32, "pnl": -40.68, "q": 12.0, "st": 1.0, "th": "Materials / Rare Earth", "d": -2.36}, {"s": "AAL", "mv": 74.69, "pnl": -23.46, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.3}, {"s": "ORBS", "mv": 73.71, "pnl": -57.29, "q": 100.0, "st": 1.0, "th": "Crypto & Miners", "d": -1.09}, {"s": "AFRM", "mv": 73.41, "pnl": 23.41, "q": 1.0, "st": 1.0, "th": "Fintech", "d": -4.3}, {"s": "PYPL", "mv": 59.19, "pnl": 17.19, "q": 1.0, "st": 1.0, "th": "Fintech", "d": 0.32}, {"s": "SLB", "mv": 52.61, "pnl": -4.39, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -1.99}, {"s": "HRZN", "mv": 49.75, "pnl": -13.95, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 1.74}, {"s": "OLOX", "mv": 31.1, "pnl": -364.9, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.58}, {"s": "NWL", "mv": 30.8, "pnl": 12.6, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.16}, {"s": "BLSH", "mv": 24.62, "pnl": -12.38, "q": 1.0, "st": 1.0, "th": "Crypto & Miners", "d": 0.41}, {"s": "FEED", "mv": 20.65, "pnl": -19.35, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 3.72}, {"s": "RKT", "mv": 14.04, "pnl": 3.06, "q": 1.0, "st": 1.0, "th": "Fintech", "d": -1.96}, {"s": "FSM", "mv": 10.84, "pnl": 6.44, "q": 1.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 0.09}, {"s": "POET", "mv": 8.86, "pnl": 1.16, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": 3.14}, {"s": "GEMI", "mv": 4.17, "pnl": -23.83, "q": 1.0, "st": 1.0, "th": "Crypto & Miners", "d": 2.96}, {"s": "OPENL", "mv": 0.15, "pnl": 0.15, "q": 1.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.0}, {"s": "OPENZ", "mv": 0.12, "pnl": 0.12, "q": 1.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -7.65}], SIM_CUT=["NVDY", "SPCE", "OPENW", "ORBS", "OLOX", "FEED", "GEMI"], SIM_D=48359.65, SIM_E=91313.73, SIM_R=4.80;
function simIdx(){var m={};SIM.forEach(function(p){m[p.s]=p;});return m;}
var SIMM=simIdx();
function simBoxes(){return Array.prototype.slice.call(document.querySelectorAll('#sim_list input'));}
function simPreset(k){
  var b=simBoxes();
  b.forEach(function(x){
    var p=SIMM[x.value];
    if(k==='none') x.checked=false;
    else if(k==='cut') x.checked=SIM_CUT.indexOf(x.value)>=0;
    else if(k==='dust') x.checked=p.mv<150;
    else if(k==='loss') x.checked=p.pnl<0;
  });
  if(k==='zero'){
    b.forEach(function(x){x.checked=false;});
    var order=SIM.slice().sort(function(a,c){
      var ra=(a.pnl<0?0:1)*1e9 + (a.mv<150?-1e6:0) + a.pnl;
      var rc=(c.pnl<0?0:1)*1e9 + (c.mv<150?-1e6:0) + c.pnl;
      return ra-rc;
    });
    var need=SIM_D, got=0;
    order.forEach(function(p){
      if(got>=need) return;
      var x=b.filter(function(y){return y.value===p.s;})[0];
      if(x){x.checked=true;got+=p.mv;}
    });
  }
  simCalc();
}
function fmt(x){var n=Math.round(Math.abs(x)).toLocaleString('en-US');return (x<0?'-$':'$')+n;}
function simCalc(){
  var rate=+document.getElementById('sim_rate').value/100;
  var pro=0,real=0,tax=0,n=0;
  simBoxes().forEach(function(x){
    if(!x.checked){x.parentNode.classList.remove('on');return;}
    x.parentNode.classList.add('on');
    var p=SIMM[x.value]; n++; pro+=p.mv; real+=p.pnl;
    var stAmt=p.pnl*p.st, ltAmt=p.pnl*(1-p.st);
    tax+=stAmt*rate + ltAmt*0.15;
  });
  var debitAfter=Math.max(0,SIM_D-pro);
  var retired=SIM_D-debitAfter;
  var book=SIM_E-pro;
  var eqp=book>0?(book-debitAfter)/book*100:100;
  var interest=retired*SIM_R/100;
  var net=interest-tax;
  var callAt=book>0?(1-(debitAfter/0.70)/book)*100:100;
  document.getElementById('q_n').textContent=n;
  document.getElementById('q_pro').textContent=fmt(pro);
  document.getElementById('q_debit').textContent=fmt(debitAfter);
  document.getElementById('q_book').textContent=fmt(book);
  var qe=document.getElementById('q_eqp');qe.textContent=eqp.toFixed(1)+'%';
  qe.className=eqp>=35?'pos':(eqp>=30?'warn-y':'neg');
  document.getElementById('q_int').textContent='+'+fmt(interest);
  var qr=document.getElementById('q_real');qr.textContent=fmt(real);qr.className=real>=0?'pos':'neg';
  var qt=document.getElementById('q_tax');qt.textContent=fmt(tax);qt.className=tax<=0?'pos':'neg';
  var qn=document.getElementById('q_net');qn.textContent=(net>=0?'+':'')+fmt(net);qn.className=net>=0?'pos':'neg';
  var qc=document.getElementById('q_cush');
  qc.textContent=debitAfter<=0?'no margin, no call':(callAt<=0?'already past':'-'+callAt.toFixed(1)+'% drop');
  qc.className=debitAfter<=0?'pos':(callAt<5?'neg':(callAt<12?'warn-y':'pos'));
  var note=document.getElementById('q_note');
  if(n===0){note.textContent='Select positions to see the effect.';note.className='sim-note';}
  else if(debitAfter<=0){note.innerHTML='<b>This clears the margin entirely</b> and leaves '+fmt(pro-SIM_D)+' in cash. Every scenario in the stress lab above becomes survivable, because there is no debit left to call.';note.className='sim-note ok';}
  else if(net>0){note.innerHTML='Interest saved exceeds the tax cost by <b>'+fmt(net)+'</b> in year one, and the cushion moves from -'+(24.3430).toFixed(1)+'% to -'+callAt.toFixed(1)+'%. This one pays for itself.';note.className='sim-note ok';}
  else {note.innerHTML='The tax bill exceeds the first-year interest saving by <b>'+fmt(-net)+'</b>. That can still be the right trade if it is buying you risk reduction, but it is not free &mdash; check whether harvesting losses alongside it changes the answer.';note.className='sim-note warn';}
}
simCalc();

/* ---- block 4 ---- */
/* ---- tab switching (runs after the partials are injected) ---- */
(function(){
  var bar = document.querySelector('.tabbar');
  if(!bar) return;
  var btns  = [].slice.call(bar.querySelectorAll('.tabbtn'));
  var panes = [].slice.call(document.querySelectorAll('[data-tab]'));
  if(!btns.length || !panes.length) return;
  var valid = {};
  btns.forEach(function(b){ valid[b.getAttribute('data-go')] = 1; });

  function show(t, fromClick){
    if(!valid[t]) t = 'overview';
    for(var i=0;i<panes.length;i++){
      panes[i].style.display = (panes[i].getAttribute('data-tab') === t) ? '' : 'none';
    }
    btns.forEach(function(b){
      var on = b.getAttribute('data-go') === t;
      b.className = on ? 'tabbtn active' : 'tabbtn';
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if(fromClick){
      try{ history.replaceState(null, '', '#' + t); }catch(e){ location.hash = t; }
      window.scrollTo(0, 0);
    }
  }
  function fromHash(){ return (location.hash || '').replace(/^#/, ''); }

  btns.forEach(function(b){
    b.addEventListener('click', function(){ show(b.getAttribute('data-go'), 1); });
  });
  window.addEventListener('hashchange', function(){ show(fromHash(), 0); });
  show(fromHash(), 0);
})();
