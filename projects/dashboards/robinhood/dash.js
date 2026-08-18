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
var ST={emv:91917.34,cr:12214.57,debit:48624.50};
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
var SIM=[{"s": "RKLB", "mv": 16416.0, "pnl": 8138.0, "q": 200.0, "st": 1.0, "th": "Space & Satellite", "d": 2.28}, {"s": "PLTR", "mv": 12941.25, "pnl": 1109.25, "q": 75.0, "st": 1.0, "th": "AI & Semis", "d": -0.86}, {"s": "NVDA", "mv": 10125.45, "pnl": 2502.45, "q": 45.0, "st": 1.0, "th": "AI & Semis", "d": -0.07}, {"s": "NOW", "mv": 9416.0, "pnl": 2143.2, "q": 80.0, "st": 1.0, "th": "AI & Semis", "d": -5.08}, {"s": "LUNR", "mv": 4076.0, "pnl": 2202.0, "q": 200.0, "st": 1.0, "th": "Space & Satellite", "d": 7.21}, {"s": "PL", "mv": 3047.5, "pnl": 2486.25, "q": 125.0, "st": 1.0, "th": "Space & Satellite", "d": -1.26}, {"s": "HOOD", "mv": 2406.25, "pnl": 864.5, "q": 25.0, "st": 1.0, "th": "Fintech", "d": 0.72}, {"s": "PANW", "mv": 1878.8, "pnl": -16.2, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.21}, {"s": "RDW", "mv": 1743.3, "pnl": 127.4, "q": 130.0, "st": 0.6923, "th": "Space & Satellite", "d": -1.25}, {"s": "QCOM", "mv": 1621.8, "pnl": -671.4, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": -2.18}, {"s": "XOM", "mv": 1614.6, "pnl": 79.1, "q": 10.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 0.85}, {"s": "NEM", "mv": 1203.3, "pnl": 263.3, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 2.18}, {"s": "HON", "mv": 1147.25, "pnl": -73.5, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.93}, {"s": "VOYG", "mv": 1099.5, "pnl": 134.5, "q": 25.0, "st": 0.6, "th": "Space & Satellite", "d": 2.33}, {"s": "IONQ", "mv": 936.8, "pnl": -204.0, "q": 20.0, "st": 1.0, "th": "Quantum", "d": 1.25}, {"s": "NIO", "mv": 920.0, "pnl": -714.0, "q": 200.0, "st": 0.0, "th": "EV & Auto", "d": 1.77}, {"s": "VWO", "mv": 905.85, "pnl": 190.8, "q": 15.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.47}, {"s": "IREN", "mv": 898.0, "pnl": 85.0, "q": 20.0, "st": 1.0, "th": "Crypto & Miners", "d": 1.91}, {"s": "BP", "mv": 857.0, "pnl": 270.6, "q": 20.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 0.75}, {"s": "VSAT", "mv": 814.1, "pnl": 724.1, "q": 10.0, "st": 1.0, "th": "Space & Satellite", "d": -1.76}, {"s": "HONA", "mv": 807.8, "pnl": -351.45, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.89}, {"s": "REMX", "mv": 789.3, "pnl": 44.3, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 0.48}, {"s": "KSS", "mv": 771.2, "pnl": 341.2, "q": 40.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.36}, {"s": "SPCX", "mv": 731.15, "pnl": -203.85, "q": 5.0, "st": 1.0, "th": "Space & Satellite", "d": 4.46}, {"s": "ASTS", "mv": 711.4, "pnl": 506.4, "q": 10.0, "st": 1.0, "th": "Space & Satellite", "d": 0.32}, {"s": "KTOS", "mv": 632.9, "pnl": -61.1, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.0}, {"s": "MP", "mv": 585.1, "pnl": -24.9, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": -0.39}, {"s": "HIMS", "mv": 572.2, "pnl": 6.0, "q": 20.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 1.63}, {"s": "META", "mv": 568.97, "pnl": -26.03, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": -3.54}, {"s": "SOFI", "mv": 549.3, "pnl": 134.4, "q": 30.0, "st": 1.0, "th": "Fintech", "d": 0.08}, {"s": "SPCE", "mv": 532.1, "pnl": -1094.8, "q": 170.0, "st": 0.1176, "th": "Space & Satellite", "d": -5.72}, {"s": "FISV", "mv": 522.1, "pnl": -67.9, "q": 10.0, "st": 1.0, "th": "Fintech", "d": -4.01}, {"s": "ABSI", "mv": 462.0, "pnl": 299.0, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.65}, {"s": "GPRO", "mv": 430.01, "pnl": -437.99, "q": 700.0, "st": 0.9143, "th": "Speculative / Meme / Other", "d": 3.24}, {"s": "STUB", "mv": 427.2, "pnl": -275.4, "q": 60.0, "st": 1.0, "th": "Fintech", "d": -11.88}, {"s": "QBTS", "mv": 417.4, "pnl": -127.0, "q": 20.0, "st": 1.0, "th": "Quantum", "d": -1.42}, {"s": "JOBY", "mv": 395.5, "pnl": 24.0, "q": 50.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": -0.13}, {"s": "VYX", "mv": 385.0, "pnl": 46.0, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -5.64}, {"s": "RGTI", "mv": 373.4, "pnl": -81.6, "q": 20.0, "st": 1.0, "th": "Quantum", "d": -0.8}, {"s": "VYGR", "mv": 323.0, "pnl": 23.0, "q": 100.0, "st": 1.0, "th": "Space & Satellite", "d": -1.22}, {"s": "BBAI", "mv": 321.0, "pnl": -127.0, "q": 100.0, "st": 1.0, "th": "AI & Semis", "d": -1.83}, {"s": "ACHR", "mv": 319.5, "pnl": -140.0, "q": 50.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": -3.47}, {"s": "REA", "mv": 290.2, "pnl": -179.8, "q": 20.0, "st": 1.0, "th": "Space & Satellite", "d": -4.16}, {"s": "KULR", "mv": 262.0, "pnl": -511.0, "q": 100.0, "st": 0.375, "th": "Space & Satellite", "d": -0.76}, {"s": "NVDY", "mv": 261.8, "pnl": -8.2, "q": 20.0, "st": 1.0, "th": "AI & Semis", "d": 0.0}, {"s": "CBRS", "mv": 251.98, "pnl": -53.02, "q": 1.0, "st": 1.0, "th": "Space & Satellite", "d": 15.07}, {"s": "LCID", "mv": 248.8, "pnl": -445.6, "q": 40.0, "st": 0.5, "th": "EV & Auto", "d": 0.0}, {"s": "AMC", "mv": 244.0, "pnl": 74.0, "q": 100.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.4}, {"s": "RVII", "mv": 236.0, "pnl": -14.0, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -3.48}, {"s": "AMPX", "mv": 231.6, "pnl": 111.6, "q": 20.0, "st": 1.0, "th": "Nuclear / Energy Tech", "d": -7.43}, {"s": "MNRO", "mv": 231.2, "pnl": -98.8, "q": 20.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.7}, {"s": "YELP", "mv": 230.7, "pnl": 0.7, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": -6.6}, {"s": "DFTX", "mv": 226.3, "pnl": 51.3, "q": 5.0, "st": 1.0, "th": "Quantum", "d": 6.17}, {"s": "VCX", "mv": 205.0, "pnl": -1245.0, "q": 5.0, "st": 1.0, "th": "Space & Satellite", "d": 19.19}, {"s": "CVX", "mv": 202.7, "pnl": 46.7, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 1.35}, {"s": "CDE", "mv": 193.1, "pnl": -11.9, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 2.66}, {"s": "GIS", "mv": 189.9, "pnl": -43.8, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -3.11}, {"s": "BMNR", "mv": 187.3, "pnl": -182.7, "q": 10.0, "st": 1.0, "th": "Crypto & Miners", "d": 3.6}, {"s": "OPEN", "mv": 177.0, "pnl": -54.0, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.75}, {"s": "SOUN", "mv": 176.0, "pnl": -62.25, "q": 25.0, "st": 1.0, "th": "AI & Semis", "d": -5.19}, {"s": "VKTX", "mv": 168.15, "pnl": 23.15, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 1.33}, {"s": "F", "mv": 140.5, "pnl": 10.5, "q": 10.0, "st": 1.0, "th": "EV & Auto", "d": -2.23}, {"s": "OPENW", "mv": 139.79, "pnl": -833.21, "q": 700.0, "st": 0.9991, "th": "Speculative / Meme / Other", "d": -1.43}, {"s": "INFQ", "mv": 134.1, "pnl": -15.9, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": 4.28}, {"s": "SFGYY", "mv": 120.5, "pnl": 14.25, "q": 25.0, "st": 1.0, "th": "Materials / Rare Earth", "d": -0.41}, {"s": "EVTL", "mv": 120.27, "pnl": -343.23, "q": 150.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": -3.33}, {"s": "NOK", "mv": 107.8, "pnl": -12.2, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.19}, {"s": "CEPO", "mv": 106.7, "pnl": -18.3, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -0.09}, {"s": "INTC", "mv": 103.49, "pnl": 82.49, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": 0.97}, {"s": "MARA", "mv": 97.15, "pnl": -42.85, "q": 10.0, "st": 1.0, "th": "Crypto & Miners", "d": 5.6}, {"s": "FEED", "mv": 92.82, "pnl": -17.18, "q": 200.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 6.2}, {"s": "SHEL", "mv": 91.62, "pnl": 26.27, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 1.27}, {"s": "BB", "mv": 87.3, "pnl": 23.3, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.91}, {"s": "WEN", "mv": 86.2, "pnl": 1.9, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -0.23}, {"s": "CRML", "mv": 78.84, "pnl": -41.16, "q": 12.0, "st": 1.0, "th": "Materials / Rare Earth", "d": -1.35}, {"s": "AFRM", "mv": 74.52, "pnl": 24.52, "q": 1.0, "st": 1.0, "th": "Fintech", "d": -4.89}, {"s": "AAL", "mv": 72.15, "pnl": -26.0, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.7}, {"s": "ORBS", "mv": 68.24, "pnl": -62.76, "q": 100.0, "st": 1.0, "th": "Crypto & Miners", "d": -5.43}, {"s": "PYPL", "mv": 60.47, "pnl": 18.47, "q": 1.0, "st": 1.0, "th": "Fintech", "d": -1.93}, {"s": "SLB", "mv": 53.86, "pnl": -3.14, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 0.17}, {"s": "HRZN", "mv": 50.0, "pnl": -13.7, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -0.2}, {"s": "NWL", "mv": 30.2, "pnl": 12.0, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -3.21}, {"s": "OLOX", "mv": 27.3, "pnl": -368.7, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 4.36}, {"s": "BLSH", "mv": 24.96, "pnl": -12.04, "q": 1.0, "st": 1.0, "th": "Crypto & Miners", "d": 2.34}, {"s": "RKT", "mv": 14.5, "pnl": 3.52, "q": 1.0, "st": 1.0, "th": "Fintech", "d": -1.76}, {"s": "FSM", "mv": 10.77, "pnl": 6.37, "q": 1.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 0.94}, {"s": "POET", "mv": 9.4, "pnl": 1.7, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": -1.88}, {"s": "GEMI", "mv": 3.61, "pnl": -24.39, "q": 1.0, "st": 1.0, "th": "Crypto & Miners", "d": -7.91}, {"s": "OPENL", "mv": 0.15, "pnl": 0.15, "q": 1.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -4.49}, {"s": "OPENZ", "mv": 0.12, "pnl": 0.12, "q": 1.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -7.15}], SIM_CUT=["NVDY", "SPCE", "OPENW", "ORBS", "OLOX", "FEED", "GEMI"], SIM_D=48624.50, SIM_E=91917.34, SIM_R=4.80;
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
  else if(net>0){note.innerHTML='Interest saved exceeds the tax cost by <b>'+fmt(net)+'</b> in year one, and the cushion moves from -'+(24.4282).toFixed(1)+'% to -'+callAt.toFixed(1)+'%. This one pays for itself.';note.className='sim-note ok';}
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
