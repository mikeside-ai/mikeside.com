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
var ST={emv:89906.50,cr:12383.00,debit:48624.50};
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
var SIM=[{"s": "RKLB", "mv": 15832.0, "pnl": 7554.0, "q": 200.0, "st": 1.0, "th": "Space & Satellite", "d": -3.56}, {"s": "PLTR", "mv": 12865.5, "pnl": 1033.5, "q": 75.0, "st": 1.0, "th": "AI & Semis", "d": -0.59}, {"s": "NVDA", "mv": 9888.3, "pnl": 2265.3, "q": 45.0, "st": 1.0, "th": "AI & Semis", "d": -2.34}, {"s": "NOW", "mv": 9559.2, "pnl": 2286.4, "q": 80.0, "st": 1.0, "th": "AI & Semis", "d": 1.52}, {"s": "LUNR", "mv": 3862.0, "pnl": 1988.0, "q": 200.0, "st": 1.0, "th": "Space & Satellite", "d": -5.25}, {"s": "PL", "mv": 2920.0, "pnl": 2358.75, "q": 125.0, "st": 1.0, "th": "Space & Satellite", "d": -4.18}, {"s": "HOOD", "mv": 2288.25, "pnl": 746.5, "q": 25.0, "st": 1.0, "th": "Fintech", "d": -4.9}, {"s": "PANW", "mv": 1870.7, "pnl": -24.3, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -0.43}, {"s": "RDW", "mv": 1682.2, "pnl": 66.3, "q": 130.0, "st": 0.6923, "th": "Space & Satellite", "d": -3.5}, {"s": "XOM", "mv": 1655.6, "pnl": 120.1, "q": 10.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 2.54}, {"s": "QCOM", "mv": 1601.9, "pnl": -691.3, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": -1.23}, {"s": "NEM", "mv": 1159.8, "pnl": 219.8, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": -3.62}, {"s": "HON", "mv": 1138.55, "pnl": -82.2, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -0.76}, {"s": "VOYG", "mv": 1056.0, "pnl": 91.0, "q": 25.0, "st": 0.6, "th": "Space & Satellite", "d": -3.96}, {"s": "NIO", "mv": 906.0, "pnl": -728.0, "q": 200.0, "st": 0.0, "th": "EV & Auto", "d": -1.52}, {"s": "VWO", "mv": 894.6, "pnl": 179.55, "q": 15.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.24}, {"s": "IONQ", "mv": 882.4, "pnl": -258.4, "q": 20.0, "st": 1.0, "th": "Quantum", "d": -5.81}, {"s": "BP", "mv": 868.2, "pnl": 281.8, "q": 20.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 1.31}, {"s": "IREN", "mv": 840.0, "pnl": 27.0, "q": 20.0, "st": 1.0, "th": "Crypto & Miners", "d": -6.46}, {"s": "HONA", "mv": 803.8, "pnl": -355.45, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -0.5}, {"s": "REMX", "mv": 765.5, "pnl": 20.5, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": -3.02}, {"s": "VSAT", "mv": 760.7, "pnl": 670.7, "q": 10.0, "st": 1.0, "th": "Space & Satellite", "d": -6.56}, {"s": "KSS", "mv": 748.0, "pnl": 318.0, "q": 40.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -3.01}, {"s": "SPCX", "mv": 716.7, "pnl": -218.3, "q": 5.0, "st": 1.0, "th": "Space & Satellite", "d": -1.98}, {"s": "ASTS", "mv": 670.7, "pnl": 465.7, "q": 10.0, "st": 1.0, "th": "Space & Satellite", "d": -5.72}, {"s": "KTOS", "mv": 619.9, "pnl": -74.1, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.05}, {"s": "MP", "mv": 566.7, "pnl": -43.3, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": -3.14}, {"s": "HIMS", "mv": 547.8, "pnl": -18.4, "q": 20.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -4.26}, {"s": "META", "mv": 543.67, "pnl": -51.33, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": -4.45}, {"s": "SPCE", "mv": 542.3, "pnl": -1084.6, "q": 170.0, "st": 0.1176, "th": "Space & Satellite", "d": 1.92}, {"s": "SOFI", "mv": 529.8, "pnl": 114.9, "q": 30.0, "st": 1.0, "th": "Fintech", "d": -3.55}, {"s": "FISV", "mv": 517.2, "pnl": -72.8, "q": 10.0, "st": 1.0, "th": "Fintech", "d": -0.94}, {"s": "ABSI", "mv": 442.5, "pnl": 279.5, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -4.22}, {"s": "STUB", "mv": 427.8, "pnl": -274.8, "q": 60.0, "st": 1.0, "th": "Fintech", "d": 0.14}, {"s": "GPRO", "mv": 414.68, "pnl": -453.32, "q": 700.0, "st": 0.9143, "th": "Speculative / Meme / Other", "d": -3.57}, {"s": "QBTS", "mv": 390.6, "pnl": -153.8, "q": 20.0, "st": 1.0, "th": "Quantum", "d": -6.42}, {"s": "JOBY", "mv": 382.5, "pnl": 11.0, "q": 50.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": -3.29}, {"s": "VYX", "mv": 379.0, "pnl": 40.0, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.56}, {"s": "RGTI", "mv": 354.2, "pnl": -100.8, "q": 20.0, "st": 1.0, "th": "Quantum", "d": -5.14}, {"s": "VYGR", "mv": 330.0, "pnl": 30.0, "q": 100.0, "st": 1.0, "th": "Space & Satellite", "d": 2.17}, {"s": "ACHR", "mv": 316.0, "pnl": -143.5, "q": 50.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": -1.1}, {"s": "BBAI", "mv": 312.0, "pnl": -136.0, "q": 100.0, "st": 1.0, "th": "AI & Semis", "d": -2.8}, {"s": "REA", "mv": 273.2, "pnl": -196.8, "q": 20.0, "st": 1.0, "th": "Space & Satellite", "d": -5.86}, {"s": "NVDY", "mv": 257.0, "pnl": -13.0, "q": 20.0, "st": 1.0, "th": "AI & Semis", "d": -1.83}, {"s": "KULR", "mv": 257.0, "pnl": -516.0, "q": 100.0, "st": 0.375, "th": "Space & Satellite", "d": -1.91}, {"s": "AMC", "mv": 238.0, "pnl": 68.0, "q": 100.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.46}, {"s": "MNRO", "mv": 237.0, "pnl": -93.0, "q": 20.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 2.51}, {"s": "RVII", "mv": 236.4, "pnl": -13.6, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.17}, {"s": "YELP", "mv": 233.6, "pnl": 3.6, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": 1.26}, {"s": "DFTX", "mv": 230.9, "pnl": 55.9, "q": 5.0, "st": 1.0, "th": "Quantum", "d": 2.03}, {"s": "LCID", "mv": 230.8, "pnl": -463.6, "q": 40.0, "st": 0.5, "th": "EV & Auto", "d": -7.23}, {"s": "CBRS", "mv": 220.01, "pnl": -84.99, "q": 1.0, "st": 1.0, "th": "Space & Satellite", "d": -12.69}, {"s": "AMPX", "mv": 214.2, "pnl": 94.2, "q": 20.0, "st": 1.0, "th": "Nuclear / Energy Tech", "d": -7.51}, {"s": "VCX", "mv": 206.25, "pnl": -1243.75, "q": 5.0, "st": 1.0, "th": "Space & Satellite", "d": 0.61}, {"s": "CVX", "mv": 205.74, "pnl": 49.74, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 1.5}, {"s": "GIS", "mv": 190.4, "pnl": -43.3, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.26}, {"s": "CDE", "mv": 185.1, "pnl": -19.9, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": -4.14}, {"s": "BMNR", "mv": 182.8, "pnl": -187.2, "q": 10.0, "st": 1.0, "th": "Crypto & Miners", "d": -2.4}, {"s": "SOUN", "mv": 174.75, "pnl": -63.5, "q": 25.0, "st": 1.0, "th": "AI & Semis", "d": -0.71}, {"s": "OPEN", "mv": 168.0, "pnl": -63.0, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -5.08}, {"s": "VKTX", "mv": 166.85, "pnl": 21.85, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -0.77}, {"s": "F", "mv": 139.3, "pnl": 9.3, "q": 10.0, "st": 1.0, "th": "EV & Auto", "d": -0.85}, {"s": "OPENW", "mv": 131.25, "pnl": -841.75, "q": 700.0, "st": 0.9991, "th": "Speculative / Meme / Other", "d": -6.11}, {"s": "INFQ", "mv": 129.1, "pnl": -20.9, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": -3.73}, {"s": "SFGYY", "mv": 119.0, "pnl": 12.75, "q": 25.0, "st": 1.0, "th": "Materials / Rare Earth", "d": -1.24}, {"s": "EVTL", "mv": 116.34, "pnl": -347.16, "q": 150.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": -3.27}, {"s": "CEPO", "mv": 106.9, "pnl": -18.1, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.19}, {"s": "NOK", "mv": 103.9, "pnl": -16.1, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -3.62}, {"s": "INTC", "mv": 96.69, "pnl": 75.69, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": -6.58}, {"s": "SHEL", "mv": 92.01, "pnl": 26.66, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 0.43}, {"s": "MARA", "mv": 89.6, "pnl": -50.4, "q": 10.0, "st": 1.0, "th": "Crypto & Miners", "d": -7.77}, {"s": "FEED", "mv": 86.0, "pnl": -24.0, "q": 200.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -7.35}, {"s": "BB", "mv": 85.8, "pnl": 21.8, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.72}, {"s": "WEN", "mv": 84.4, "pnl": 0.1, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.09}, {"s": "CRML", "mv": 73.8, "pnl": -46.2, "q": 12.0, "st": 1.0, "th": "Materials / Rare Earth", "d": -6.39}, {"s": "AFRM", "mv": 73.56, "pnl": 23.56, "q": 1.0, "st": 1.0, "th": "Fintech", "d": -1.29}, {"s": "AAL", "mv": 70.25, "pnl": -27.9, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.63}, {"s": "ORBS", "mv": 66.23, "pnl": -64.77, "q": 100.0, "st": 1.0, "th": "Crypto & Miners", "d": -2.95}, {"s": "PYPL", "mv": 60.43, "pnl": 18.43, "q": 1.0, "st": 1.0, "th": "Fintech", "d": -0.07}, {"s": "SLB", "mv": 53.21, "pnl": -3.79, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -1.21}, {"s": "HRZN", "mv": 50.5, "pnl": -13.2, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 1.0}, {"s": "NWL", "mv": 29.65, "pnl": 11.45, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.82}, {"s": "OLOX", "mv": 26.0, "pnl": -370.0, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -4.76}, {"s": "BLSH", "mv": 24.62, "pnl": -12.38, "q": 1.0, "st": 1.0, "th": "Crypto & Miners", "d": -1.36}, {"s": "RKT", "mv": 13.99, "pnl": 3.01, "q": 1.0, "st": 1.0, "th": "Fintech", "d": -3.52}, {"s": "FSM", "mv": 10.45, "pnl": 6.05, "q": 1.0, "st": 1.0, "th": "Materials / Rare Earth", "d": -2.97}, {"s": "POET", "mv": 8.48, "pnl": 0.78, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": -9.79}, {"s": "GEMI", "mv": 3.54, "pnl": -24.46, "q": 1.0, "st": 1.0, "th": "Crypto & Miners", "d": -1.94}, {"s": "OPENL", "mv": 0.13, "pnl": 0.13, "q": 1.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -14.83}, {"s": "OPENZ", "mv": 0.12, "pnl": 0.12, "q": 1.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -5.81}], SIM_CUT=["NVDY", "SPCE", "OPENW", "ORBS", "OLOX", "FEED", "GEMI"], SIM_D=48624.50, SIM_E=89906.50, SIM_R=4.80;
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
  else if(net>0){note.innerHTML='Interest saved exceeds the tax cost by <b>'+fmt(net)+'</b> in year one, and the cushion moves from -'+(22.7380).toFixed(1)+'% to -'+callAt.toFixed(1)+'%. This one pays for itself.';note.className='sim-note ok';}
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
