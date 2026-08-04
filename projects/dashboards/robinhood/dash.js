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
var ST={emv:81072.35,cr:12178.07,debit:49060.04};
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
var SIM=[{"s": "RKLB", "mv": 14086.0, "pnl": 5808.0, "q": 200.0, "st": 1.0, "th": "Space & Satellite", "d": 8.44}, {"s": "PLTR", "mv": 11308.5, "pnl": -3142.8, "q": 90.0, "st": 1.0, "th": "AI & Semis", "d": 2.1}, {"s": "NVDA", "mv": 9298.8, "pnl": 1675.8, "q": 45.0, "st": 1.0, "th": "AI & Semis", "d": 2.93}, {"s": "NOW", "mv": 9135.2, "pnl": 1862.4, "q": 80.0, "st": 1.0, "th": "AI & Semis", "d": 2.66}, {"s": "PL", "mv": 2691.25, "pnl": 2130.0, "q": 125.0, "st": 1.0, "th": "Space & Satellite", "d": 5.13}, {"s": "LUNR", "mv": 2620.0, "pnl": 746.0, "q": 200.0, "st": 1.0, "th": "Space & Satellite", "d": 6.16}, {"s": "HOOD", "mv": 2258.5, "pnl": 716.75, "q": 25.0, "st": 1.0, "th": "Fintech", "d": 4.37}, {"s": "XOM", "mv": 1550.6, "pnl": 15.1, "q": 10.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -0.24}, {"s": "QCOM", "mv": 1515.7, "pnl": -777.5, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": 2.68}, {"s": "RDW", "mv": 1253.2, "pnl": -362.7, "q": 130.0, "st": 1.0, "th": "Space & Satellite", "d": 11.83}, {"s": "HON", "mv": 1233.85, "pnl": 9.75, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 1.53}, {"s": "HONA", "mv": 1041.35, "pnl": -114.55, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.74}, {"s": "NIO", "mv": 962.0, "pnl": -672.0, "q": 200.0, "st": 1.0, "th": "EV & Auto", "d": -1.43}, {"s": "NEM", "mv": 953.7, "pnl": 13.7, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 1.77}, {"s": "VWO", "mv": 885.9, "pnl": 170.85, "q": 15.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.53}, {"s": "BP", "mv": 885.2, "pnl": 298.8, "q": 20.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -2.12}, {"s": "VSAT", "mv": 812.9, "pnl": 722.9, "q": 10.0, "st": 1.0, "th": "Space & Satellite", "d": 5.67}, {"s": "KSS", "mv": 804.0, "pnl": 374.0, "q": 40.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 5.02}, {"s": "IREN", "mv": 795.0, "pnl": -18.0, "q": 20.0, "st": 1.0, "th": "Crypto & Miners", "d": 8.02}, {"s": "IONQ", "mv": 777.0, "pnl": -363.8, "q": 20.0, "st": 1.0, "th": "Quantum", "d": 6.61}, {"s": "VOYG", "mv": 700.25, "pnl": -264.75, "q": 25.0, "st": 1.0, "th": "Space & Satellite", "d": 14.19}, {"s": "REMX", "mv": 676.3, "pnl": -68.7, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 2.52}, {"s": "ASTS", "mv": 635.2, "pnl": 430.2, "q": 10.0, "st": 1.0, "th": "Space & Satellite", "d": 7.7}, {"s": "HIMS", "mv": 616.4, "pnl": 50.2, "q": 20.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 10.98}, {"s": "META", "mv": 590.24, "pnl": -4.76, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": 6.02}, {"s": "SPCX", "mv": 572.65, "pnl": -362.35, "q": 5.0, "st": 1.0, "th": "Space & Satellite", "d": 5.68}, {"s": "FISV", "mv": 543.5, "pnl": -46.5, "q": 10.0, "st": 1.0, "th": "Fintech", "d": 0.76}, {"s": "SOFI", "mv": 540.9, "pnl": 126.0, "q": 30.0, "st": 1.0, "th": "Fintech", "d": 10.55}, {"s": "STUB", "mv": 538.8, "pnl": -163.8, "q": 60.0, "st": 1.0, "th": "Fintech", "d": 6.4}, {"s": "GPRO", "mv": 530.46, "pnl": -337.54, "q": 700.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 1.17}, {"s": "KTOS", "mv": 492.1, "pnl": -201.9, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 5.6}, {"s": "SPCE", "mv": 479.4, "pnl": -1147.5, "q": 170.0, "st": 1.0, "th": "Space & Satellite", "d": 10.59}, {"s": "MP", "mv": 438.4, "pnl": -171.6, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 5.97}, {"s": "VYX", "mv": 432.0, "pnl": 93.0, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 4.47}, {"s": "QBTS", "mv": 399.6, "pnl": -144.8, "q": 20.0, "st": 1.0, "th": "Quantum", "d": 10.51}, {"s": "ABSI", "mv": 396.5, "pnl": 233.5, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 1.93}, {"s": "JOBY", "mv": 369.0, "pnl": -2.5, "q": 50.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": 3.22}, {"s": "RGTI", "mv": 320.4, "pnl": -134.6, "q": 20.0, "st": 1.0, "th": "Quantum", "d": 7.16}, {"s": "LCID", "mv": 308.0, "pnl": -386.4, "q": 40.0, "st": 1.0, "th": "EV & Auto", "d": 4.34}, {"s": "VYGR", "mv": 300.0, "pnl": 0.0, "q": 100.0, "st": 1.0, "th": "Space & Satellite", "d": -0.99}, {"s": "BBAI", "mv": 286.0, "pnl": -162.0, "q": 100.0, "st": 1.0, "th": "AI & Semis", "d": 2.51}, {"s": "AMC", "mv": 285.0, "pnl": 115.0, "q": 100.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 1.06}, {"s": "KULR", "mv": 278.0, "pnl": -495.0, "q": 100.0, "st": 1.0, "th": "Space & Satellite", "d": 4.91}, {"s": "OPENW", "mv": 272.02, "pnl": -700.98, "q": 700.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 18.51}, {"s": "YELP", "mv": 268.1, "pnl": 38.1, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": 1.44}, {"s": "MNRO", "mv": 255.0, "pnl": -75.0, "q": 20.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 4.08}, {"s": "NVDY", "mv": 246.0, "pnl": -24.0, "q": 20.0, "st": 1.0, "th": "AI & Semis", "d": 1.99}, {"s": "ACHR", "mv": 242.0, "pnl": -217.5, "q": 50.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": 4.31}, {"s": "CBRS", "mv": 219.97, "pnl": -85.03, "q": 1.0, "st": 1.0, "th": "Space & Satellite", "d": 10.7}, {"s": "DFTX", "mv": 208.95, "pnl": 33.95, "q": 5.0, "st": 1.0, "th": "Quantum", "d": -3.98}, {"s": "REA", "mv": 204.6, "pnl": -265.4, "q": 20.0, "st": 1.0, "th": "Space & Satellite", "d": 2.92}, {"s": "AMPX", "mv": 202.4, "pnl": 82.4, "q": 20.0, "st": 1.0, "th": "Nuclear / Energy Tech", "d": 5.42}, {"s": "OPEN", "mv": 197.0, "pnl": -34.0, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 4.51}, {"s": "CVX", "mv": 193.18, "pnl": 37.18, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -1.85}, {"s": "EVTL", "mv": 190.5, "pnl": -273.0, "q": 150.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": 2.42}, {"s": "VCX", "mv": 182.0, "pnl": -1268.0, "q": 5.0, "st": 1.0, "th": "Space & Satellite", "d": 10.3}, {"s": "GIS", "mv": 180.0, "pnl": -53.7, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.7}, {"s": "BMNR", "mv": 174.2, "pnl": -195.8, "q": 10.0, "st": 1.0, "th": "Crypto & Miners", "d": 0.81}, {"s": "VKTX", "mv": 163.05, "pnl": 18.05, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 2.74}, {"s": "CDE", "mv": 155.6, "pnl": -49.4, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 4.36}, {"s": "SOUN", "mv": 152.5, "pnl": -85.75, "q": 25.0, "st": 1.0, "th": "AI & Semis", "d": -0.49}, {"s": "F", "mv": 144.3, "pnl": 14.3, "q": 10.0, "st": 1.0, "th": "EV & Auto", "d": -1.7}, {"s": "MSTY", "mv": 125.1, "pnl": -569.8, "q": 10.0, "st": 0.0, "th": "Crypto & Miners", "d": 1.13}, {"s": "SFGYY", "mv": 121.66, "pnl": 15.41, "q": 25.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 0.96}, {"s": "MARA", "mv": 117.5, "pnl": -22.5, "q": 10.0, "st": 1.0, "th": "Crypto & Miners", "d": 3.8}, {"s": "INFQ", "mv": 109.8, "pnl": -40.2, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": 11.7}, {"s": "CEPO", "mv": 106.6, "pnl": -18.4, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.0}, {"s": "NOK", "mv": 93.6, "pnl": -26.4, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 2.41}, {"s": "SHEL", "mv": 91.08, "pnl": 25.73, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -0.98}, {"s": "INTC", "mv": 91.0, "pnl": 70.0, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": 0.89}, {"s": "BB", "mv": 85.2, "pnl": 21.2, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.24}, {"s": "AAL", "mv": 80.2, "pnl": -17.95, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 5.04}, {"s": "CRML", "mv": 76.56, "pnl": -43.44, "q": 12.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 16.21}, {"s": "AFRM", "mv": 75.63, "pnl": 25.63, "q": 1.0, "st": 1.0, "th": "Fintech", "d": 5.76}, {"s": "WEN", "mv": 75.3, "pnl": -9.0, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 2.31}, {"s": "ORBS", "mv": 65.76, "pnl": -65.24, "q": 100.0, "st": 1.0, "th": "Crypto & Miners", "d": 9.0}, {"s": "PYPL", "mv": 57.87, "pnl": 15.87, "q": 1.0, "st": 1.0, "th": "Fintech", "d": 1.15}, {"s": "OLOX", "mv": 50.0, "pnl": -346.0, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 4.38}, {"s": "SLB", "mv": 49.31, "pnl": -7.69, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -0.56}, {"s": "HRZN", "mv": 45.1, "pnl": -18.6, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 4.4}, {"s": "NWL", "mv": 31.8, "pnl": 13.6, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 13.57}, {"s": "BLSH", "mv": 22.93, "pnl": -14.07, "q": 1.0, "st": 1.0, "th": "Crypto & Miners", "d": 5.23}, {"s": "FEED", "mv": 17.17, "pnl": -22.83, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 8.81}, {"s": "RKT", "mv": 13.68, "pnl": 2.7, "q": 1.0, "st": 1.0, "th": "Fintech", "d": 6.05}, {"s": "FSM", "mv": 8.67, "pnl": 4.27, "q": 1.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 2.85}, {"s": "POET", "mv": 7.36, "pnl": -0.34, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": 5.29}, {"s": "GEMI", "mv": 3.99, "pnl": -24.01, "q": 1.0, "st": 1.0, "th": "Crypto & Miners", "d": 2.31}, {"s": "OPENL", "mv": 0.19, "pnl": 0.19, "q": 1.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 5.56}, {"s": "OPENZ", "mv": 0.17, "pnl": 0.17, "q": 1.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 4.87}], SIM_CUT=["NVDY", "MSTY", "SPCE", "OPENW", "ORBS", "OLOX", "FEED", "GEMI"], SIM_D=49060.04, SIM_E=81072.35, SIM_R=4.80;
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
  else if(net>0){note.innerHTML='Interest saved exceeds the tax cost by <b>'+fmt(net)+'</b> in year one, and the cushion moves from -'+((1-(SIM_D/0.70)/SIM_E)*100).toFixed(1)+'% to -'+callAt.toFixed(1)+'%. This one pays for itself.';note.className='sim-note ok';}
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
