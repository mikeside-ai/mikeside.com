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
var ST={emv:87378.12,cr:12244.26,debit:49060.04};
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
var SIM=[{"s": "RKLB", "mv": 14894.0, "pnl": 6616.0, "q": 200.0, "st": 1.0, "th": "Space & Satellite", "d": 5.74}, {"s": "PLTR", "mv": 14629.5, "pnl": 178.2, "q": 90.0, "st": 1.0, "th": "AI & Semis", "d": 29.37}, {"s": "NVDA", "mv": 9533.7, "pnl": 1910.7, "q": 45.0, "st": 1.0, "th": "AI & Semis", "d": 2.53}, {"s": "NOW", "mv": 9450.4, "pnl": 2177.6, "q": 80.0, "st": 1.0, "th": "AI & Semis", "d": 3.45}, {"s": "PL", "mv": 2853.75, "pnl": 2292.5, "q": 125.0, "st": 1.0, "th": "Space & Satellite", "d": 6.04}, {"s": "LUNR", "mv": 2788.0, "pnl": 914.0, "q": 200.0, "st": 1.0, "th": "Space & Satellite", "d": 6.41}, {"s": "HOOD", "mv": 2337.38, "pnl": 795.62, "q": 25.0, "st": 1.0, "th": "Fintech", "d": 3.49}, {"s": "QCOM", "mv": 1625.9, "pnl": -667.3, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": 7.27}, {"s": "XOM", "mv": 1539.5, "pnl": 4.0, "q": 10.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -0.72}, {"s": "RDW", "mv": 1383.2, "pnl": -232.7, "q": 130.0, "st": 0.6923, "th": "Space & Satellite", "d": 10.37}, {"s": "HON", "mv": 1243.8, "pnl": 19.7, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.81}, {"s": "HONA", "mv": 1082.15, "pnl": -73.75, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 3.92}, {"s": "NEM", "mv": 977.35, "pnl": 37.35, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 2.48}, {"s": "NIO", "mv": 954.0, "pnl": -680.0, "q": 200.0, "st": 0.0, "th": "EV & Auto", "d": -0.83}, {"s": "VWO", "mv": 900.6, "pnl": 185.55, "q": 15.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 1.66}, {"s": "VSAT", "mv": 860.1, "pnl": 770.1, "q": 10.0, "st": 1.0, "th": "Space & Satellite", "d": 5.81}, {"s": "BP", "mv": 848.9, "pnl": 262.5, "q": 20.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -4.1}, {"s": "VOYG", "mv": 836.72, "pnl": -128.28, "q": 25.0, "st": 0.6, "th": "Space & Satellite", "d": 19.49}, {"s": "IONQ", "mv": 834.6, "pnl": -306.2, "q": 20.0, "st": 1.0, "th": "Quantum", "d": 7.41}, {"s": "IREN", "mv": 817.0, "pnl": 4.0, "q": 20.0, "st": 1.0, "th": "Crypto & Miners", "d": 2.77}, {"s": "KSS", "mv": 804.0, "pnl": 374.0, "q": 40.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.0}, {"s": "REMX", "mv": 714.8, "pnl": -30.2, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 5.69}, {"s": "ASTS", "mv": 703.2, "pnl": 498.2, "q": 10.0, "st": 1.0, "th": "Space & Satellite", "d": 10.71}, {"s": "HIMS", "mv": 643.2, "pnl": 77.0, "q": 20.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 4.35}, {"s": "SPCX", "mv": 629.48, "pnl": -305.52, "q": 5.0, "st": 1.0, "th": "Space & Satellite", "d": 9.92}, {"s": "META", "mv": 587.71, "pnl": -7.29, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": -0.43}, {"s": "STUB", "mv": 568.2, "pnl": -134.4, "q": 60.0, "st": 1.0, "th": "Fintech", "d": 5.46}, {"s": "SOFI", "mv": 560.55, "pnl": 145.65, "q": 30.0, "st": 1.0, "th": "Fintech", "d": 3.63}, {"s": "FISV", "mv": 557.9, "pnl": -32.1, "q": 10.0, "st": 1.0, "th": "Fintech", "d": 2.65}, {"s": "GPRO", "mv": 538.93, "pnl": -329.07, "q": 700.0, "st": 0.9143, "th": "Speculative / Meme / Other", "d": 1.6}, {"s": "KTOS", "mv": 519.0, "pnl": -175.0, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 5.47}, {"s": "SPCE", "mv": 499.8, "pnl": -1127.1, "q": 170.0, "st": 0.1176, "th": "Space & Satellite", "d": 4.26}, {"s": "MP", "mv": 474.7, "pnl": -135.3, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 8.28}, {"s": "VYX", "mv": 445.5, "pnl": 106.5, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 3.12}, {"s": "QBTS", "mv": 436.3, "pnl": -108.1, "q": 20.0, "st": 1.0, "th": "Quantum", "d": 9.18}, {"s": "ABSI", "mv": 424.0, "pnl": 261.0, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 6.94}, {"s": "JOBY", "mv": 399.0, "pnl": 27.5, "q": 50.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": 8.13}, {"s": "RGTI", "mv": 348.8, "pnl": -106.2, "q": 20.0, "st": 1.0, "th": "Quantum", "d": 8.86}, {"s": "BBAI", "mv": 315.99, "pnl": -132.01, "q": 100.0, "st": 1.0, "th": "AI & Semis", "d": 10.49}, {"s": "VYGR", "mv": 313.0, "pnl": 13.0, "q": 100.0, "st": 1.0, "th": "Space & Satellite", "d": 4.33}, {"s": "LCID", "mv": 311.58, "pnl": -382.82, "q": 40.0, "st": 0.5, "th": "EV & Auto", "d": 1.16}, {"s": "OPENW", "mv": 288.96, "pnl": -684.04, "q": 700.0, "st": 0.9991, "th": "Speculative / Meme / Other", "d": 6.23}, {"s": "KULR", "mv": 284.0, "pnl": -489.0, "q": 100.0, "st": 0.375, "th": "Space & Satellite", "d": 2.16}, {"s": "AMC", "mv": 267.27, "pnl": 97.27, "q": 100.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -6.22}, {"s": "YELP", "mv": 266.2, "pnl": 36.2, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": -0.71}, {"s": "ACHR", "mv": 265.75, "pnl": -193.75, "q": 50.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": 9.81}, {"s": "MNRO", "mv": 262.0, "pnl": -68.0, "q": 20.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 2.75}, {"s": "NVDY", "mv": 250.4, "pnl": -19.6, "q": 20.0, "st": 1.0, "th": "AI & Semis", "d": 1.79}, {"s": "CBRS", "mv": 227.2, "pnl": -77.8, "q": 1.0, "st": 1.0, "th": "Space & Satellite", "d": 3.29}, {"s": "AMPX", "mv": 216.3, "pnl": 96.3, "q": 20.0, "st": 1.0, "th": "Nuclear / Energy Tech", "d": 6.87}, {"s": "REA", "mv": 213.0, "pnl": -257.0, "q": 20.0, "st": 1.0, "th": "Space & Satellite", "d": 4.11}, {"s": "DFTX", "mv": 211.3, "pnl": 36.3, "q": 5.0, "st": 1.0, "th": "Quantum", "d": 1.12}, {"s": "EVTL", "mv": 207.0, "pnl": -256.5, "q": 150.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": 8.66}, {"s": "OPEN", "mv": 206.75, "pnl": -24.25, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 4.95}, {"s": "CVX", "mv": 190.38, "pnl": 34.38, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -1.45}, {"s": "GIS", "mv": 180.97, "pnl": -52.73, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.54}, {"s": "BMNR", "mv": 180.75, "pnl": -189.25, "q": 10.0, "st": 1.0, "th": "Crypto & Miners", "d": 3.76}, {"s": "VCX", "mv": 174.5, "pnl": -1275.5, "q": 5.0, "st": 1.0, "th": "Space & Satellite", "d": -4.12}, {"s": "VKTX", "mv": 164.8, "pnl": 19.8, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 1.07}, {"s": "SOUN", "mv": 163.0, "pnl": -75.25, "q": 25.0, "st": 1.0, "th": "AI & Semis", "d": 6.89}, {"s": "CDE", "mv": 162.2, "pnl": -42.8, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 4.24}, {"s": "F", "mv": 142.2, "pnl": 12.2, "q": 10.0, "st": 1.0, "th": "EV & Auto", "d": -1.46}, {"s": "MSTY", "mv": 128.15, "pnl": -566.75, "q": 10.0, "st": 0.7, "th": "Crypto & Miners", "d": 2.44}, {"s": "SFGYY", "mv": 120.75, "pnl": 14.5, "q": 25.0, "st": 1.0, "th": "Materials / Rare Earth", "d": -0.75}, {"s": "MARA", "mv": 117.6, "pnl": -22.4, "q": 10.0, "st": 1.0, "th": "Crypto & Miners", "d": 0.09}, {"s": "INFQ", "mv": 114.5, "pnl": -35.5, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": 4.28}, {"s": "CEPO", "mv": 106.6, "pnl": -18.4, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.0}, {"s": "INTC", "mv": 100.85, "pnl": 79.85, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": 10.82}, {"s": "NOK", "mv": 99.3, "pnl": -20.7, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 6.09}, {"s": "SHEL", "mv": 89.82, "pnl": 24.47, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -1.38}, {"s": "BB", "mv": 88.75, "pnl": 24.75, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 4.17}, {"s": "AAL", "mv": 82.85, "pnl": -15.3, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 3.3}, {"s": "CRML", "mv": 81.48, "pnl": -38.52, "q": 12.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 6.43}, {"s": "AFRM", "mv": 78.1, "pnl": 28.1, "q": 1.0, "st": 1.0, "th": "Fintech", "d": 3.27}, {"s": "WEN", "mv": 76.85, "pnl": -7.45, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 2.06}, {"s": "ORBS", "mv": 68.23, "pnl": -62.77, "q": 100.0, "st": 1.0, "th": "Crypto & Miners", "d": 3.76}, {"s": "PYPL", "mv": 58.53, "pnl": 16.53, "q": 1.0, "st": 1.0, "th": "Fintech", "d": 1.14}, {"s": "SLB", "mv": 50.82, "pnl": -6.18, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 3.06}, {"s": "OLOX", "mv": 49.0, "pnl": -347.0, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.0}, {"s": "HRZN", "mv": 45.55, "pnl": -18.15, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 1.0}, {"s": "NWL", "mv": 30.62, "pnl": 12.43, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -3.69}, {"s": "BLSH", "mv": 23.82, "pnl": -13.18, "q": 1.0, "st": 1.0, "th": "Crypto & Miners", "d": 3.88}, {"s": "FEED", "mv": 18.5, "pnl": -21.5, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 7.72}, {"s": "RKT", "mv": 14.11, "pnl": 3.13, "q": 1.0, "st": 1.0, "th": "Fintech", "d": 3.14}, {"s": "FSM", "mv": 9.05, "pnl": 4.65, "q": 1.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 4.38}, {"s": "POET", "mv": 8.57, "pnl": 0.87, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": 16.44}, {"s": "GEMI", "mv": 4.21, "pnl": -23.8, "q": 1.0, "st": 1.0, "th": "Crypto & Miners", "d": 5.39}, {"s": "OPENL", "mv": 0.21, "pnl": 0.21, "q": 1.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 10.47}, {"s": "OPENZ", "mv": 0.19, "pnl": 0.19, "q": 1.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 11.36}], SIM_CUT=["NVDY", "MSTY", "SPCE", "OPENW", "ORBS", "OLOX", "FEED", "GEMI"], SIM_D=49060.04, SIM_E=87378.12, SIM_R=4.80;
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
  else if(net>0){note.innerHTML='Interest saved exceeds the tax cost by <b>'+fmt(net)+'</b> in year one, and the cushion moves from -'+(19.7903).toFixed(1)+'% to -'+callAt.toFixed(1)+'%. This one pays for itself.';note.className='sim-note ok';}
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
