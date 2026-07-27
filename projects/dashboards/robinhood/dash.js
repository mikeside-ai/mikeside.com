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
      if(ar) ar.textContent=(i===col?(st.dir>0?' \u25B2':' \u25BC'):'');
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
var ST={emv:88081.30,cr:13828.14,debit:59388.79};
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
var SIM=[{"s": "RKLB", "mv": 13390.0, "pnl": 5112.0, "q": 200, "st": 1.0, "th": "Space & Satellite", "d": 4.76}, {"s": "PLTR", "mv": 13154.5, "pnl": -3087.5, "q": 100, "st": 1.0, "th": "AI & Semis", "d": 7.02}, {"s": "NOW", "mv": 10556.0, "pnl": 1217.0, "q": 100, "st": 1.0, "th": "AI & Semis", "d": 6.86}, {"s": "NVDA", "mv": 8843.4, "pnl": 1220.4, "q": 45, "st": 1.0, "th": "AI & Semis", "d": -4.99}, {"s": "HOOD", "mv": 3348.1, "pnl": 1685.95, "q": 35, "st": 1.0, "th": "Fintech", "d": 0.79}, {"s": "PL", "mv": 3148.5, "pnl": 2416.5, "q": 150, "st": 1.0, "th": "Space & Satellite", "d": 2.54}, {"s": "LUNR", "mv": 2661.0, "pnl": 787.0, "q": 200, "st": 1.0, "th": "Space & Satellite", "d": 2.98}, {"s": "BP", "mv": 2116.0, "pnl": 518.5, "q": 50, "st": 0.4, "th": "Energy (Oil & Gas)", "d": -3.42}, {"s": "TSM", "mv": 1996.35, "pnl": 1226.35, "q": 5, "st": 1.0, "th": "AI & Semis", "d": -1.03}, {"s": "QCOM", "mv": 1700.9, "pnl": -592.3, "q": 10, "st": 1.0, "th": "AI & Semis", "d": 1.87}, {"s": "HON", "mv": 1228.75, "pnl": 4.65, "q": 5, "st": 1.0, "th": "Speculative / Meme / Other", "d": 1.07}, {"s": "RDW", "mv": 1145.3, "pnl": -470.6, "q": 130, "st": 1.0, "th": "Space & Satellite", "d": 1.38}, {"s": "HONA", "mv": 1054.1, "pnl": -101.8, "q": 5, "st": 1.0, "th": "Speculative / Meme / Other", "d": 3.31}, {"s": "NIO", "mv": 924.0, "pnl": -710.0, "q": 200, "st": 1.0, "th": "EV & Auto", "d": 2.9}, {"s": "BITO", "mv": 879.5, "pnl": -1120.5, "q": 100, "st": 1.0, "th": "Crypto & Miners", "d": 1.09}, {"s": "VWO", "mv": 873.38, "pnl": 158.32, "q": 15, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.74}, {"s": "VSAT", "mv": 748.9, "pnl": 658.9, "q": 10, "st": 1.0, "th": "Space & Satellite", "d": 4.45}, {"s": "KSS", "mv": 740.2, "pnl": 310.2, "q": 40, "st": 1.0, "th": "Speculative / Meme / Other", "d": 3.15}, {"s": "IREN", "mv": 726.2, "pnl": -86.8, "q": 20, "st": 1.0, "th": "Crypto & Miners", "d": -2.05}, {"s": "IONQ", "mv": 718.2, "pnl": -422.6, "q": 20, "st": 1.0, "th": "Quantum", "d": 9.35}, {"s": "REMX", "mv": 687.0, "pnl": -58.0, "q": 10, "st": 1.0, "th": "Materials / Rare Earth", "d": 1.76}, {"s": "VOYG", "mv": 656.25, "pnl": -308.75, "q": 25, "st": 1.0, "th": "Space & Satellite", "d": 4.0}, {"s": "TSLY", "mv": 633.3, "pnl": -549.3, "q": 30, "st": 1.0, "th": "Speculative / Meme / Other", "d": -0.94}, {"s": "OKLO", "mv": 627.75, "pnl": -1367.25, "q": 15, "st": 1.0, "th": "Nuclear / Energy Tech", "d": 3.98}, {"s": "HIMS", "mv": 604.8, "pnl": 38.6, "q": 20, "st": 1.0, "th": "Speculative / Meme / Other", "d": 7.65}, {"s": "NVDY", "mv": 598.0, "pnl": -101.5, "q": 50, "st": 1.0, "th": "AI & Semis", "d": -4.55}, {"s": "META", "mv": 593.93, "pnl": -1.07, "q": 1, "st": 1.0, "th": "AI & Semis", "d": -0.21}, {"s": "ASTS", "mv": 582.4, "pnl": 377.4, "q": 10, "st": 1.0, "th": "Space & Satellite", "d": 3.63}, {"s": "SPCX", "mv": 568.25, "pnl": -366.75, "q": 5, "st": 1.0, "th": "Space & Satellite", "d": -1.23}, {"s": "FISV", "mv": 522.9, "pnl": -67.1, "q": 10, "st": 1.0, "th": "Fintech", "d": 2.49}, {"s": "SOFI", "mv": 506.1, "pnl": 91.2, "q": 30, "st": 1.0, "th": "Fintech", "d": 2.49}, {"s": "STUB", "mv": 504.0, "pnl": -198.6, "q": 60, "st": 1.0, "th": "Fintech", "d": 1.82}, {"s": "KTOS", "mv": 494.4, "pnl": -199.6, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": 4.41}, {"s": "GPRO", "mv": 483.28, "pnl": -384.72, "q": 700, "st": 1.0, "th": "Speculative / Meme / Other", "d": 3.28}, {"s": "MP", "mv": 431.5, "pnl": -178.5, "q": 10, "st": 1.0, "th": "Materials / Rare Earth", "d": 4.48}, {"s": "SPCE", "mv": 430.95, "pnl": -1195.95, "q": 170, "st": 1.0, "th": "Space & Satellite", "d": 1.81}, {"s": "VYX", "mv": 411.0, "pnl": 72.0, "q": 50, "st": 1.0, "th": "Speculative / Meme / Other", "d": 7.17}, {"s": "QBTS", "mv": 390.0, "pnl": -154.4, "q": 20, "st": 1.0, "th": "Quantum", "d": 20.3}, {"s": "ABSI", "mv": 378.26, "pnl": 215.26, "q": 50, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.07}, {"s": "JOBY", "mv": 369.0, "pnl": -2.5, "q": 50, "st": 1.0, "th": "eVTOL / Air Taxi", "d": 6.49}, {"s": "MNRO", "mv": 338.8, "pnl": 8.8, "q": 20, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.89}, {"s": "RGTI", "mv": 312.4, "pnl": -142.6, "q": 20, "st": 1.0, "th": "Quantum", "d": 10.39}, {"s": "TSLA", "mv": 309.24, "pnl": 16.24, "q": 1, "st": 1.0, "th": "EV & Auto", "d": -1.21}, {"s": "VYGR", "mv": 309.0, "pnl": 9.0, "q": 100, "st": 1.0, "th": "Space & Satellite", "d": -0.32}, {"s": "BBAI", "mv": 285.0, "pnl": -163.0, "q": 100, "st": 1.0, "th": "AI & Semis", "d": 3.26}, {"s": "YELP", "mv": 264.2, "pnl": 34.2, "q": 10, "st": 1.0, "th": "AI & Semis", "d": 5.26}, {"s": "KULR", "mv": 262.0, "pnl": -511.0, "q": 100, "st": 1.0, "th": "Space & Satellite", "d": 3.97}, {"s": "LCID", "mv": 260.0, "pnl": -434.4, "q": 40, "st": 1.0, "th": "EV & Auto", "d": 3.17}, {"s": "BLSH", "mv": 250.8, "pnl": -156.2, "q": 11, "st": 0.0909, "th": "Crypto & Miners", "d": -4.84}, {"s": "AMC", "mv": 250.0, "pnl": 80.0, "q": 100, "st": 1.0, "th": "Speculative / Meme / Other", "d": 10.13}, {"s": "ACHR", "mv": 247.0, "pnl": -212.5, "q": 50, "st": 1.0, "th": "eVTOL / Air Taxi", "d": 3.56}, {"s": "OPENW", "mv": 224.07, "pnl": -748.93, "q": 700, "st": 1.0, "th": "Speculative / Meme / Other", "d": -5.63}, {"s": "DFTX", "mv": 213.17, "pnl": 38.17, "q": 5, "st": 1.0, "th": "Quantum", "d": -1.24}, {"s": "EVTL", "mv": 211.12, "pnl": -252.37, "q": 150, "st": 1.0, "th": "eVTOL / Air Taxi", "d": 1.99}, {"s": "REA", "mv": 202.6, "pnl": -267.4, "q": 20, "st": 1.0, "th": "Space & Satellite", "d": -4.16}, {"s": "AMPX", "mv": 193.9, "pnl": 73.9, "q": 20, "st": 1.0, "th": "Nuclear / Energy Tech", "d": 4.92}, {"s": "OPEN", "mv": 191.75, "pnl": -39.25, "q": 50, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.0}, {"s": "VCX", "mv": 190.0, "pnl": -1260.0, "q": 5, "st": 1.0, "th": "Space & Satellite", "d": -31.68}, {"s": "CVX", "mv": 189.98, "pnl": 33.98, "q": 1, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -2.47}, {"s": "CBRS", "mv": 188.53, "pnl": -116.47, "q": 1, "st": 1.0, "th": "Space & Satellite", "d": -5.32}, {"s": "GIS", "mv": 183.08, "pnl": -50.62, "q": 5, "st": 1.0, "th": "Speculative / Meme / Other", "d": 1.62}, {"s": "BMNR", "mv": 179.0, "pnl": -191.0, "q": 10, "st": 1.0, "th": "Crypto & Miners", "d": 13.36}, {"s": "VKTX", "mv": 174.4, "pnl": 29.4, "q": 5, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.26}, {"s": "SOUN", "mv": 160.31, "pnl": -77.94, "q": 25, "st": 1.0, "th": "AI & Semis", "d": 4.09}, {"s": "CDE", "mv": 153.7, "pnl": -51.3, "q": 10, "st": 1.0, "th": "Materials / Rare Earth", "d": 1.59}, {"s": "F", "mv": 146.85, "pnl": 16.85, "q": 10, "st": 1.0, "th": "EV & Auto", "d": 2.19}, {"s": "MSTY", "mv": 130.15, "pnl": -564.75, "q": 10, "st": 1.0, "th": "Crypto & Miners", "d": 6.33}, {"s": "SFGYY", "mv": 122.0, "pnl": 15.75, "q": 25, "st": 1.0, "th": "Materials / Rare Earth", "d": 4.5}, {"s": "MARA", "mv": 117.8, "pnl": -22.2, "q": 10, "st": 1.0, "th": "Crypto & Miners", "d": -2.81}, {"s": "FIG", "mv": 114.72, "pnl": -292.77, "q": 5, "st": 1.0, "th": "Fintech", "d": 8.64}, {"s": "CEPO", "mv": 106.6, "pnl": -18.4, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.0}, {"s": "INFQ", "mv": 97.7, "pnl": -52.3, "q": 10, "st": 1.0, "th": "AI & Semis", "d": 8.92}, {"s": "NOK", "mv": 92.7, "pnl": -27.3, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": 1.87}, {"s": "INTC", "mv": 91.68, "pnl": 70.68, "q": 1, "st": 1.0, "th": "AI & Semis", "d": -0.69}, {"s": "SHEL", "mv": 86.39, "pnl": 21.04, "q": 1, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -2.25}, {"s": "NVDL", "mv": 85.02, "pnl": -13.98, "q": 3, "st": 1.0, "th": "AI & Semis", "d": -10.0}, {"s": "BB", "mv": 84.1, "pnl": 20.1, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.52}, {"s": "AAL", "mv": 74.83, "pnl": -23.32, "q": 5, "st": 1.0, "th": "Speculative / Meme / Other", "d": 3.39}, {"s": "WEN", "mv": 73.15, "pnl": -11.15, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": 4.65}, {"s": "AFRM", "mv": 73.0, "pnl": 23.0, "q": 1, "st": 1.0, "th": "Fintech", "d": 3.94}, {"s": "CRML", "mv": 72.6, "pnl": -47.4, "q": 12, "st": 1.0, "th": "Materials / Rare Earth", "d": 4.13}, {"s": "ORBS", "mv": 62.6, "pnl": -68.4, "q": 100, "st": 1.0, "th": "Crypto & Miners", "d": 3.68}, {"s": "PYPL", "mv": 55.98, "pnl": 13.98, "q": 1, "st": 1.0, "th": "Fintech", "d": -0.29}, {"s": "SLB", "mv": 51.53, "pnl": -5.47, "q": 1, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -1.69}, {"s": "OLOX", "mv": 50.3, "pnl": -345.7, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.9}, {"s": "HRZN", "mv": 43.3, "pnl": -20.4, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.46}, {"s": "NWL", "mv": 25.92, "pnl": 7.72, "q": 5, "st": 1.0, "th": "Speculative / Meme / Other", "d": 2.07}, {"s": "FEED", "mv": 18.01, "pnl": -21.99, "q": 50, "st": 1.0, "th": "Speculative / Meme / Other", "d": -5.71}, {"s": "RKT", "mv": 13.49, "pnl": 2.51, "q": 1, "st": 1.0, "th": "Fintech", "d": 3.37}, {"s": "FSM", "mv": 8.57, "pnl": 4.17, "q": 1, "st": 1.0, "th": "Materials / Rare Earth", "d": 0.23}, {"s": "POET", "mv": 7.1, "pnl": -0.6, "q": 1, "st": 1.0, "th": "AI & Semis", "d": 3.05}, {"s": "GEMI", "mv": 4.45, "pnl": -23.55, "q": 1, "st": 1.0, "th": "Crypto & Miners", "d": 3.61}, {"s": "OPENL", "mv": 0.18, "pnl": 0.18, "q": 1, "st": 1.0, "th": "Speculative / Meme / Other", "d": -5.26}, {"s": "OPENZ", "mv": 0.17, "pnl": 0.17, "q": 1, "st": 1.0, "th": "Speculative / Meme / Other", "d": -3.29}], SIM_CUT=["BITO", "TSLY", "NVDY", "MSTY", "SPCE", "FIG", "OPENW", "ORBS", "OLOX", "FEED", "GEMI"], SIM_D=59388.79, SIM_E=88081.30, SIM_R=4.80;
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
  else if(net>0){note.innerHTML='Interest saved exceeds the tax cost by <b>'+fmt(net)+'</b> in year one, and the cushion moves from -'+(0.5251).toFixed(1)+'% to -'+callAt.toFixed(1)+'%. This one pays for itself.';note.className='sim-note ok';}
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
    if(!valid[t]) t = 'week';
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
