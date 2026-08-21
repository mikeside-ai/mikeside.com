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
var ST={emv:89472.66,cr:15138.36,debit:50182.09};
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
var SIM=[{"s": "RKLB", "mv": 14582.0, "pnl": 6304.0, "q": 200, "st": 1.0, "th": "Space & Satellite", "d": -3.86}, {"s": "PLTR", "mv": 13043.25, "pnl": 1211.25, "q": 75, "st": 1.0, "th": "AI & Semis", "d": -0.73}, {"s": "NOW", "mv": 10379.2, "pnl": 3106.4, "q": 80, "st": 1.0, "th": "AI & Semis", "d": 2.0}, {"s": "NVDA", "mv": 9764.55, "pnl": 2141.55, "q": 45, "st": 1.0, "th": "AI & Semis", "d": -0.26}, {"s": "LUNR", "mv": 3588.0, "pnl": 1714.0, "q": 200, "st": 1.0, "th": "Space & Satellite", "d": -3.13}, {"s": "PL", "mv": 2770.62, "pnl": 2209.37, "q": 125, "st": 1.0, "th": "Space & Satellite", "d": -2.01}, {"s": "HOOD", "mv": 1902.2, "pnl": 1080.4, "q": 20, "st": 1.0, "th": "Fintech", "d": -0.69}, {"s": "PANW", "mv": 1747.2, "pnl": -147.8, "q": 5, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.87}, {"s": "XOM", "mv": 1662.85, "pnl": 127.35, "q": 10, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 0.92}, {"s": "QCOM", "mv": 1608.1, "pnl": -685.1, "q": 10, "st": 1.0, "th": "AI & Semis", "d": -0.68}, {"s": "RDW", "mv": 1529.45, "pnl": -86.45, "q": 130, "st": 0.6923, "th": "Space & Satellite", "d": -5.12}, {"s": "NEM", "mv": 1276.8, "pnl": 336.8, "q": 10, "st": 1.0, "th": "Materials / Rare Earth", "d": 2.08}, {"s": "HON", "mv": 1091.95, "pnl": -128.8, "q": 5, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.51}, {"s": "VOYG", "mv": 947.0, "pnl": -18.0, "q": 25, "st": 0.6, "th": "Space & Satellite", "d": -2.5}, {"s": "NIO", "mv": 908.0, "pnl": -726.0, "q": 200, "st": 0.0, "th": "EV & Auto", "d": -0.87}, {"s": "BP", "mv": 903.0, "pnl": 316.6, "q": 20, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 3.25}, {"s": "VWO", "mv": 900.3, "pnl": 185.25, "q": 15, "st": 1.0, "th": "Speculative / Meme / Other", "d": -0.03}, {"s": "IREN", "mv": 852.0, "pnl": 39.0, "q": 20, "st": 1.0, "th": "Crypto & Miners", "d": -0.56}, {"s": "IONQ", "mv": 830.6, "pnl": -310.2, "q": 20, "st": 1.0, "th": "Quantum", "d": -4.22}, {"s": "HONA", "mv": 829.45, "pnl": -329.8, "q": 5, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.63}, {"s": "RGTI", "mv": 803.25, "pnl": -161.75, "q": 50, "st": 1.0, "th": "Quantum", "d": -5.5}, {"s": "REMX", "mv": 755.7, "pnl": 10.7, "q": 10, "st": 1.0, "th": "Materials / Rare Earth", "d": -0.55}, {"s": "VSAT", "mv": 740.7, "pnl": 650.7, "q": 10, "st": 1.0, "th": "Space & Satellite", "d": -3.39}, {"s": "KSS", "mv": 693.0, "pnl": 263.0, "q": 40, "st": 1.0, "th": "Speculative / Meme / Other", "d": -8.04}, {"s": "SPCX", "mv": 669.65, "pnl": -265.35, "q": 5, "st": 1.0, "th": "Space & Satellite", "d": -4.1}, {"s": "ASTS", "mv": 650.7, "pnl": 445.7, "q": 10, "st": 1.0, "th": "Space & Satellite", "d": -2.05}, {"s": "HIMS", "mv": 637.2, "pnl": 71.0, "q": 20, "st": 1.0, "th": "Speculative / Meme / Other", "d": 2.48}, {"s": "SOXL", "mv": 610.97, "pnl": -3.53, "q": 5, "st": 1.0, "th": "AI & Semis", "d": 1.21}, {"s": "KTOS", "mv": 561.8, "pnl": -132.2, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": -7.23}, {"s": "MP", "mv": 550.25, "pnl": -59.75, "q": 10, "st": 1.0, "th": "Materials / Rare Earth", "d": -2.92}, {"s": "META", "mv": 545.88, "pnl": -49.12, "q": 1, "st": 1.0, "th": "AI & Semis", "d": -0.03}, {"s": "SOFI", "mv": 537.3, "pnl": 122.4, "q": 30, "st": 1.0, "th": "Fintech", "d": -2.77}, {"s": "SPCE", "mv": 522.75, "pnl": -1104.15, "q": 170, "st": 0.1176, "th": "Space & Satellite", "d": -4.21}, {"s": "FISV", "mv": 513.8, "pnl": -76.2, "q": 10, "st": 1.0, "th": "Fintech", "d": -1.34}, {"s": "ABSI", "mv": 464.25, "pnl": 301.25, "q": 50, "st": 1.0, "th": "Speculative / Meme / Other", "d": -7.06}, {"s": "GPRO", "mv": 430.85, "pnl": -437.15, "q": 700, "st": 0.9143, "th": "Speculative / Meme / Other", "d": -3.06}, {"s": "STUB", "mv": 410.1, "pnl": -292.5, "q": 60, "st": 1.0, "th": "Fintech", "d": -1.51}, {"s": "VYX", "mv": 382.0, "pnl": 43.0, "q": 50, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.0}, {"s": "JOBY", "mv": 379.19, "pnl": 7.7, "q": 50, "st": 1.0, "th": "eVTOL / Air Taxi", "d": -1.76}, {"s": "QBTS", "mv": 376.2, "pnl": -168.2, "q": 20, "st": 1.0, "th": "Quantum", "d": -2.64}, {"s": "VYGR", "mv": 333.0, "pnl": 33.0, "q": 100, "st": 1.0, "th": "Space & Satellite", "d": -2.35}, {"s": "BBAI", "mv": 308.5, "pnl": -139.5, "q": 100, "st": 1.0, "th": "AI & Semis", "d": -2.68}, {"s": "ACHR", "mv": 303.75, "pnl": -155.75, "q": 50, "st": 1.0, "th": "eVTOL / Air Taxi", "d": -5.81}, {"s": "REA", "mv": 266.4, "pnl": -203.6, "q": 20, "st": 1.0, "th": "Space & Satellite", "d": -6.53}, {"s": "KULR", "mv": 262.0, "pnl": -511.0, "q": 100, "st": 0.375, "th": "Space & Satellite", "d": -1.13}, {"s": "NVDY", "mv": 251.7, "pnl": -18.3, "q": 20, "st": 1.0, "th": "AI & Semis", "d": -1.22}, {"s": "AMC", "mv": 247.5, "pnl": 77.5, "q": 100, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.79}, {"s": "MNRO", "mv": 239.2, "pnl": -90.8, "q": 20, "st": 1.0, "th": "Speculative / Meme / Other", "d": -4.85}, {"s": "YELP", "mv": 235.8, "pnl": 5.8, "q": 10, "st": 1.0, "th": "AI & Semis", "d": -1.54}, {"s": "RVII", "mv": 234.1, "pnl": -15.9, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.43}, {"s": "DFTX", "mv": 227.1, "pnl": 52.1, "q": 5, "st": 1.0, "th": "Quantum", "d": -0.87}, {"s": "LCID", "mv": 225.18, "pnl": -469.22, "q": 40, "st": 0.5, "th": "EV & Auto", "d": -4.91}, {"s": "BMNR", "mv": 215.55, "pnl": -154.45, "q": 10, "st": 1.0, "th": "Crypto & Miners", "d": 6.5}, {"s": "CDE", "mv": 211.2, "pnl": 6.2, "q": 10, "st": 1.0, "th": "Materials / Rare Earth", "d": 0.91}, {"s": "CBRS", "mv": 209.76, "pnl": -95.24, "q": 1, "st": 1.0, "th": "Space & Satellite", "d": -2.75}, {"s": "CVX", "mv": 205.84, "pnl": 49.84, "q": 1, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 0.04}, {"s": "AMPX", "mv": 204.1, "pnl": 84.1, "q": 20, "st": 1.0, "th": "Nuclear / Energy Tech", "d": -4.0}, {"s": "GIS", "mv": 198.05, "pnl": -35.65, "q": 5, "st": 1.0, "th": "Speculative / Meme / Other", "d": -0.95}, {"s": "VCX", "mv": 197.3, "pnl": -1252.7, "q": 5, "st": 1.0, "th": "Space & Satellite", "d": -2.93}, {"s": "SOUN", "mv": 174.0, "pnl": -64.25, "q": 25, "st": 1.0, "th": "AI & Semis", "d": -2.79}, {"s": "OPEN", "mv": 173.25, "pnl": -57.75, "q": 50, "st": 1.0, "th": "Speculative / Meme / Other", "d": -3.21}, {"s": "VKTX", "mv": 171.85, "pnl": 26.85, "q": 5, "st": 1.0, "th": "Speculative / Meme / Other", "d": -4.47}, {"s": "F", "mv": 140.05, "pnl": 10.05, "q": 10, "st": 1.0, "th": "EV & Auto", "d": -3.41}, {"s": "OPENW", "mv": 136.01, "pnl": -836.99, "q": 700, "st": 0.9991, "th": "Speculative / Meme / Other", "d": -9.63}, {"s": "INFQ", "mv": 125.25, "pnl": -24.75, "q": 10, "st": 1.0, "th": "AI & Semis", "d": 0.2}, {"s": "SFGYY", "mv": 121.75, "pnl": 15.5, "q": 25, "st": 1.0, "th": "Materials / Rare Earth", "d": 0.62}, {"s": "EVTL", "mv": 111.77, "pnl": -351.74, "q": 150, "st": 1.0, "th": "eVTOL / Air Taxi", "d": -2.7}, {"s": "MARA", "mv": 111.5, "pnl": -28.5, "q": 10, "st": 1.0, "th": "Crypto & Miners", "d": 15.54}, {"s": "CEPO", "mv": 106.8, "pnl": -18.2, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": -0.09}, {"s": "NOK", "mv": 101.45, "pnl": -18.55, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.15}, {"s": "SHEL", "mv": 93.67, "pnl": 28.32, "q": 1, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 0.97}, {"s": "INTC", "mv": 92.14, "pnl": 71.14, "q": 1, "st": 1.0, "th": "AI & Semis", "d": -0.71}, {"s": "WEN", "mv": 87.95, "pnl": 3.65, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.51}, {"s": "ORBS", "mv": 82.56, "pnl": -48.44, "q": 100, "st": 1.0, "th": "Crypto & Miners", "d": 10.91}, {"s": "FEED", "mv": 82.06, "pnl": -27.94, "q": 200, "st": 1.0, "th": "Speculative / Meme / Other", "d": -3.14}, {"s": "BB", "mv": 81.45, "pnl": 17.45, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.34}, {"s": "AFRM", "mv": 75.03, "pnl": 25.03, "q": 1, "st": 1.0, "th": "Fintech", "d": -2.97}, {"s": "RKT", "mv": 70.25, "pnl": 1.25, "q": 5, "st": 1.0, "th": "Fintech", "d": -3.96}, {"s": "CRML", "mv": 69.6, "pnl": -50.4, "q": 12, "st": 1.0, "th": "Materials / Rare Earth", "d": -6.0}, {"s": "AAL", "mv": 67.65, "pnl": -30.5, "q": 5, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.38}, {"s": "PYPL", "mv": 62.28, "pnl": 20.28, "q": 1, "st": 1.0, "th": "Fintech", "d": 1.69}, {"s": "SLB", "mv": 53.57, "pnl": -3.43, "q": 1, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 0.04}, {"s": "HRZN", "mv": 49.3, "pnl": -14.4, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.95}, {"s": "NWL", "mv": 28.9, "pnl": 10.7, "q": 5, "st": 1.0, "th": "Speculative / Meme / Other", "d": -6.17}, {"s": "BLSH", "mv": 28.42, "pnl": -8.58, "q": 1, "st": 1.0, "th": "Crypto & Miners", "d": 5.57}, {"s": "OLOX", "mv": 21.5, "pnl": -374.5, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": -10.79}, {"s": "FSM", "mv": 11.9, "pnl": 7.5, "q": 1, "st": 1.0, "th": "Materials / Rare Earth", "d": 2.32}, {"s": "POET", "mv": 8.27, "pnl": 0.57, "q": 1, "st": 1.0, "th": "AI & Semis", "d": -2.01}, {"s": "GEMI", "mv": 4.14, "pnl": -23.86, "q": 1, "st": 1.0, "th": "Crypto & Miners", "d": 5.34}, {"s": "OPENZ", "mv": 0.13, "pnl": 0.13, "q": 1, "st": 1.0, "th": "Speculative / Meme / Other", "d": -8.23}, {"s": "OPENL", "mv": 0.12, "pnl": 0.12, "q": 1, "st": 1.0, "th": "Speculative / Meme / Other", "d": -4.58}], SIM_CUT=["NVDY", "SPCE", "OPENW", "ORBS", "OLOX", "FEED", "GEMI"], SIM_D=50182.09, SIM_E=89472.66, SIM_R=4.80;
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
  else if(net>0){note.innerHTML='Interest saved exceeds the tax cost by <b>'+fmt(net)+'</b> in year one, and the cushion moves from -'+(19.8764).toFixed(1)+'% to -'+callAt.toFixed(1)+'%. This one pays for itself.';note.className='sim-note ok';}
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
