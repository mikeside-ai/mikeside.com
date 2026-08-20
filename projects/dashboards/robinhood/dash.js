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
var ST={emv:90139.11,cr:13237.54,debit:48621.00};
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
var SIM=[{"s": "RKLB", "mv": 15170.0, "pnl": 6892.0, "q": 200.0, "st": 1.0, "th": "Space & Satellite", "d": -4.18}, {"s": "PLTR", "mv": 13139.25, "pnl": 1307.25, "q": 75.0, "st": 1.0, "th": "AI & Semis", "d": 2.13}, {"s": "NOW", "mv": 10175.6, "pnl": 2902.8, "q": 80.0, "st": 1.0, "th": "AI & Semis", "d": 6.45}, {"s": "NVDA", "mv": 9796.05, "pnl": 2173.05, "q": 45.0, "st": 1.0, "th": "AI & Semis", "d": -0.93}, {"s": "LUNR", "mv": 3703.0, "pnl": 1829.0, "q": 200.0, "st": 1.0, "th": "Space & Satellite", "d": -4.12}, {"s": "PL", "mv": 2827.5, "pnl": 2266.25, "q": 125.0, "st": 1.0, "th": "Space & Satellite", "d": -3.17}, {"s": "HOOD", "mv": 2394.5, "pnl": 852.75, "q": 25.0, "st": 1.0, "th": "Fintech", "d": 4.64}, {"s": "PANW", "mv": 1799.5, "pnl": -95.5, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -3.81}, {"s": "XOM", "mv": 1648.2, "pnl": 112.7, "q": 10.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -0.45}, {"s": "QCOM", "mv": 1619.0, "pnl": -674.2, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": 1.07}, {"s": "RDW", "mv": 1610.05, "pnl": -5.85, "q": 130.0, "st": 0.6923, "th": "Space & Satellite", "d": -4.29}, {"s": "NEM", "mv": 1251.0, "pnl": 311.0, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 7.86}, {"s": "HON", "mv": 1108.95, "pnl": -111.8, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.6}, {"s": "VOYG", "mv": 970.5, "pnl": 5.5, "q": 25.0, "st": 0.6, "th": "Space & Satellite", "d": -8.1}, {"s": "NIO", "mv": 915.0, "pnl": -719.0, "q": 200.0, "st": 0.0, "th": "EV & Auto", "d": 0.99}, {"s": "VWO", "mv": 900.68, "pnl": 185.63, "q": 15.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.68}, {"s": "BP", "mv": 874.9, "pnl": 288.5, "q": 20.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 0.77}, {"s": "IONQ", "mv": 867.2, "pnl": -273.6, "q": 20.0, "st": 1.0, "th": "Quantum", "d": -1.72}, {"s": "IREN", "mv": 857.0, "pnl": 44.0, "q": 20.0, "st": 1.0, "th": "Crypto & Miners", "d": 2.02}, {"s": "HONA", "mv": 851.85, "pnl": -307.4, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 5.98}, {"s": "VSAT", "mv": 766.5, "pnl": 676.5, "q": 10.0, "st": 1.0, "th": "Space & Satellite", "d": 0.76}, {"s": "REMX", "mv": 760.3, "pnl": 15.3, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": -0.68}, {"s": "KSS", "mv": 753.2, "pnl": 323.2, "q": 40.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.7}, {"s": "SPCX", "mv": 698.32, "pnl": -236.68, "q": 5.0, "st": 1.0, "th": "Space & Satellite", "d": -2.56}, {"s": "ASTS", "mv": 664.4, "pnl": 459.4, "q": 10.0, "st": 1.0, "th": "Space & Satellite", "d": -0.94}, {"s": "HIMS", "mv": 621.8, "pnl": 55.6, "q": 20.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 13.51}, {"s": "KTOS", "mv": 605.5, "pnl": -88.5, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.32}, {"s": "MP", "mv": 566.7, "pnl": -43.3, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 0.0}, {"s": "SOFI", "mv": 553.05, "pnl": 138.15, "q": 30.0, "st": 1.0, "th": "Fintech", "d": 4.39}, {"s": "META", "mv": 546.19, "pnl": -48.81, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": 0.46}, {"s": "SPCE", "mv": 544.0, "pnl": -1082.9, "q": 170.0, "st": 0.1176, "th": "Space & Satellite", "d": 0.31}, {"s": "FISV", "mv": 520.8, "pnl": -69.2, "q": 10.0, "st": 1.0, "th": "Fintech", "d": 0.7}, {"s": "ABSI", "mv": 500.0, "pnl": 337.0, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 12.99}, {"s": "GPRO", "mv": 443.52, "pnl": -424.48, "q": 700.0, "st": 0.9143, "th": "Speculative / Meme / Other", "d": 6.95}, {"s": "STUB", "mv": 415.8, "pnl": -286.8, "q": 60.0, "st": 1.0, "th": "Fintech", "d": -2.81}, {"s": "QBTS", "mv": 386.6, "pnl": -157.8, "q": 20.0, "st": 1.0, "th": "Quantum", "d": -1.02}, {"s": "JOBY", "mv": 386.0, "pnl": 14.5, "q": 50.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": 0.92}, {"s": "VYX", "mv": 381.5, "pnl": 42.5, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.66}, {"s": "VYGR", "mv": 340.5, "pnl": 40.5, "q": 100.0, "st": 1.0, "th": "Space & Satellite", "d": 3.18}, {"s": "RGTI", "mv": 340.0, "pnl": -115.0, "q": 20.0, "st": 1.0, "th": "Quantum", "d": -4.01}, {"s": "ACHR", "mv": 322.5, "pnl": -137.0, "q": 50.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": 2.06}, {"s": "BBAI", "mv": 317.45, "pnl": -130.55, "q": 100.0, "st": 1.0, "th": "AI & Semis", "d": 1.75}, {"s": "REA", "mv": 284.8, "pnl": -185.2, "q": 20.0, "st": 1.0, "th": "Space & Satellite", "d": 4.25}, {"s": "KULR", "mv": 265.5, "pnl": -507.5, "q": 100.0, "st": 0.375, "th": "Space & Satellite", "d": 3.31}, {"s": "NVDY", "mv": 254.6, "pnl": -15.4, "q": 20.0, "st": 1.0, "th": "AI & Semis", "d": -0.93}, {"s": "AMC", "mv": 251.5, "pnl": 81.5, "q": 100.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 5.67}, {"s": "MNRO", "mv": 251.4, "pnl": -78.6, "q": 20.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 6.08}, {"s": "YELP", "mv": 239.5, "pnl": 9.5, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": 2.53}, {"s": "LCID", "mv": 237.0, "pnl": -457.4, "q": 40.0, "st": 0.5, "th": "EV & Auto", "d": 2.69}, {"s": "RVII", "mv": 236.8, "pnl": -13.2, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.17}, {"s": "DFTX", "mv": 229.1, "pnl": 54.1, "q": 5.0, "st": 1.0, "th": "Quantum", "d": -0.78}, {"s": "CBRS", "mv": 215.65, "pnl": -89.35, "q": 1.0, "st": 1.0, "th": "Space & Satellite", "d": -1.98}, {"s": "AMPX", "mv": 212.5, "pnl": 92.5, "q": 20.0, "st": 1.0, "th": "Nuclear / Energy Tech", "d": -0.79}, {"s": "CDE", "mv": 209.25, "pnl": 4.25, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 13.05}, {"s": "CVX", "mv": 205.78, "pnl": 49.78, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 0.02}, {"s": "VCX", "mv": 202.45, "pnl": -1247.55, "q": 5.0, "st": 1.0, "th": "Space & Satellite", "d": -1.84}, {"s": "BMNR", "mv": 202.2, "pnl": -167.8, "q": 10.0, "st": 1.0, "th": "Crypto & Miners", "d": 10.61}, {"s": "GIS", "mv": 199.97, "pnl": -33.73, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 5.03}, {"s": "VKTX", "mv": 180.0, "pnl": 35.0, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 7.88}, {"s": "OPEN", "mv": 179.5, "pnl": -51.5, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 6.85}, {"s": "SOUN", "mv": 178.88, "pnl": -59.37, "q": 25.0, "st": 1.0, "th": "AI & Semis", "d": 2.36}, {"s": "OPENW", "mv": 150.71, "pnl": -822.29, "q": 700.0, "st": 0.9991, "th": "Speculative / Meme / Other", "d": 14.83}, {"s": "F", "mv": 144.95, "pnl": 14.95, "q": 10.0, "st": 1.0, "th": "EV & Auto", "d": 4.06}, {"s": "INFQ", "mv": 124.7, "pnl": -25.3, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": -3.41}, {"s": "SFGYY", "mv": 121.0, "pnl": 14.75, "q": 25.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 1.68}, {"s": "EVTL", "mv": 115.34, "pnl": -348.16, "q": 150.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": -0.86}, {"s": "CEPO", "mv": 107.0, "pnl": -18.0, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.09}, {"s": "NOK", "mv": 101.25, "pnl": -18.75, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.55}, {"s": "MARA", "mv": 96.6, "pnl": -43.4, "q": 10.0, "st": 1.0, "th": "Crypto & Miners", "d": 7.81}, {"s": "INTC", "mv": 92.84, "pnl": 71.84, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": -3.97}, {"s": "SHEL", "mv": 92.76, "pnl": 27.41, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 0.82}, {"s": "WEN", "mv": 89.25, "pnl": 4.95, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 5.75}, {"s": "FEED", "mv": 87.42, "pnl": -22.58, "q": 200.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 1.65}, {"s": "BB", "mv": 83.3, "pnl": 19.3, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.91}, {"s": "AFRM", "mv": 77.35, "pnl": 27.35, "q": 1.0, "st": 1.0, "th": "Fintech", "d": 5.15}, {"s": "CRML", "mv": 74.04, "pnl": -45.96, "q": 12.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 0.33}, {"s": "ORBS", "mv": 74.03, "pnl": -56.97, "q": 100.0, "st": 1.0, "th": "Crypto & Miners", "d": 11.78}, {"s": "AAL", "mv": 69.33, "pnl": -28.82, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.32}, {"s": "PYPL", "mv": 61.27, "pnl": 19.27, "q": 1.0, "st": 1.0, "th": "Fintech", "d": 1.39}, {"s": "SLB", "mv": 53.58, "pnl": -3.42, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 0.69}, {"s": "HRZN", "mv": 50.85, "pnl": -12.85, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.69}, {"s": "NWL", "mv": 30.85, "pnl": 12.65, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 4.05}, {"s": "BLSH", "mv": 26.88, "pnl": -10.12, "q": 1.0, "st": 1.0, "th": "Crypto & Miners", "d": 9.18}, {"s": "OLOX", "mv": 24.2, "pnl": -371.8, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -6.92}, {"s": "RKT", "mv": 14.62, "pnl": 3.64, "q": 1.0, "st": 1.0, "th": "Fintech", "d": 4.5}, {"s": "FSM", "mv": 11.64, "pnl": 7.24, "q": 1.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 11.39}, {"s": "POET", "mv": 8.43, "pnl": 0.73, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": -0.59}, {"s": "GEMI", "mv": 3.92, "pnl": -24.08, "q": 1.0, "st": 1.0, "th": "Crypto & Miners", "d": 10.73}, {"s": "OPENZ", "mv": 0.13, "pnl": 0.13, "q": 1.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 17.04}, {"s": "OPENL", "mv": 0.13, "pnl": 0.13, "q": 1.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 1.5}], SIM_CUT=["NVDY", "SPCE", "OPENW", "ORBS", "OLOX", "FEED", "GEMI"], SIM_D=48621.00, SIM_E=90139.11, SIM_R=4.80;
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
  else if(net>0){note.innerHTML='Interest saved exceeds the tax cost by <b>'+fmt(net)+'</b> in year one, and the cushion moves from -'+(22.9400).toFixed(1)+'% to -'+callAt.toFixed(1)+'%. This one pays for itself.';note.className='sim-note ok';}
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
