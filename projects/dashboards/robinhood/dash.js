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
var ST={emv:86631.71,cr:13492.28,debit:60323.75};
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
var SIM=[{"s": "RKLB", "mv": 12784.0, "pnl": 4506.0, "q": 200, "st": 1.0, "th": "Space & Satellite", "d": -8.67}, {"s": "PLTR", "mv": 12293.5, "pnl": -3948.5, "q": 100, "st": 1.0, "th": "AI & Semis", "d": -0.35}, {"s": "NOW", "mv": 9877.0, "pnl": 538.0, "q": 100, "st": 1.0, "th": "AI & Semis", "d": 7.43}, {"s": "NVDA", "mv": 9313.2, "pnl": 1690.2, "q": 45, "st": 1.0, "th": "AI & Semis", "d": -0.86}, {"s": "HOOD", "mv": 3321.5, "pnl": 1659.35, "q": 35, "st": 1.0, "th": "Fintech", "d": -6.58}, {"s": "PL", "mv": 3072.0, "pnl": 2340.0, "q": 150, "st": 1.0, "th": "Space & Satellite", "d": -8.41}, {"s": "LUNR", "mv": 2586.02, "pnl": 712.02, "q": 200, "st": 1.0, "th": "Space & Satellite", "d": -5.69}, {"s": "BP", "mv": 2190.6, "pnl": 593.1, "q": 50, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -0.27}, {"s": "TSM", "mv": 2018.15, "pnl": 1248.15, "q": 5, "st": 1.0, "th": "AI & Semis", "d": -2.88}, {"s": "BITO", "mv": 1738.02, "pnl": -2485.98, "q": 200, "st": 0.5, "th": "Crypto & Miners", "d": -0.91}, {"s": "QCOM", "mv": 1669.7, "pnl": -623.5, "q": 10, "st": 1.0, "th": "AI & Semis", "d": -2.42}, {"s": "HON", "mv": 1215.65, "pnl": -8.45, "q": 5, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.28}, {"s": "RDW", "mv": 1129.7, "pnl": -486.2, "q": 130, "st": 0.6923, "th": "Space & Satellite", "d": -6.36}, {"s": "HONA", "mv": 1020.45, "pnl": -135.45, "q": 5, "st": 1.0, "th": "Speculative / Meme / Other", "d": 4.2}, {"s": "NIO", "mv": 895.0, "pnl": -739.0, "q": 200, "st": 0.0, "th": "EV & Auto", "d": -3.56}, {"s": "VWO", "mv": 867.15, "pnl": 152.1, "q": 15, "st": 1.0, "th": "Speculative / Meme / Other", "d": -0.5}, {"s": "IREN", "mv": 741.2, "pnl": -71.8, "q": 20, "st": 1.0, "th": "Crypto & Miners", "d": -8.67}, {"s": "KSS", "mv": 717.6, "pnl": 287.6, "q": 40, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.43}, {"s": "VSAT", "mv": 717.0, "pnl": 627.0, "q": 10, "st": 1.0, "th": "Space & Satellite", "d": -3.46}, {"s": "REMX", "mv": 675.45, "pnl": -69.55, "q": 10, "st": 1.0, "th": "Materials / Rare Earth", "d": -2.85}, {"s": "IONQ", "mv": 656.6, "pnl": -484.2, "q": 20, "st": 1.0, "th": "Quantum", "d": -3.64}, {"s": "TSLY", "mv": 639.6, "pnl": -543.0, "q": 30, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.57}, {"s": "VOYG", "mv": 631.75, "pnl": -333.25, "q": 25, "st": 0.6, "th": "Space & Satellite", "d": -4.21}, {"s": "NVDY", "mv": 626.5, "pnl": -73.0, "q": 50, "st": 1.0, "th": "AI & Semis", "d": -0.32}, {"s": "OKLO", "mv": 604.05, "pnl": -1390.95, "q": 15, "st": 1.0, "th": "Nuclear / Energy Tech", "d": -8.48}, {"s": "META", "mv": 595.2, "pnl": 0.2, "q": 1, "st": 1.0, "th": "AI & Semis", "d": -1.8}, {"s": "SPCX", "mv": 575.35, "pnl": -359.65, "q": 5, "st": 1.0, "th": "Space & Satellite", "d": -2.68}, {"s": "ASTS", "mv": 562.3, "pnl": 357.3, "q": 10, "st": 1.0, "th": "Space & Satellite", "d": -4.98}, {"s": "HIMS", "mv": 561.7, "pnl": -4.5, "q": 20, "st": 1.0, "th": "Speculative / Meme / Other", "d": -14.22}, {"s": "FISV", "mv": 510.2, "pnl": -79.8, "q": 10, "st": 1.0, "th": "Fintech", "d": 2.1}, {"s": "SOFI", "mv": 494.4, "pnl": 79.5, "q": 30, "st": 1.0, "th": "Fintech", "d": -1.02}, {"s": "STUB", "mv": 493.8, "pnl": -208.8, "q": 60, "st": 1.0, "th": "Fintech", "d": -3.4}, {"s": "KTOS", "mv": 473.6, "pnl": -220.4, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": -4.21}, {"s": "GPRO", "mv": 472.43, "pnl": -395.57, "q": 700, "st": 0.9143, "th": "Speculative / Meme / Other", "d": -2.19}, {"s": "SPCE", "mv": 425.0, "pnl": -1201.9, "q": 170, "st": 0.1176, "th": "Space & Satellite", "d": -3.1}, {"s": "MP", "mv": 412.9, "pnl": -197.1, "q": 10, "st": 1.0, "th": "Materials / Rare Earth", "d": -7.53}, {"s": "VYX", "mv": 383.0, "pnl": 44.0, "q": 50, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.79}, {"s": "ABSI", "mv": 377.25, "pnl": 214.25, "q": 50, "st": 1.0, "th": "Speculative / Meme / Other", "d": -6.51}, {"s": "JOBY", "mv": 346.75, "pnl": -24.75, "q": 50, "st": 1.0, "th": "eVTOL / Air Taxi", "d": -8.02}, {"s": "MNRO", "mv": 336.0, "pnl": 6.0, "q": 20, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.54}, {"s": "QBTS", "mv": 324.4, "pnl": -220.0, "q": 20, "st": 1.0, "th": "Quantum", "d": -5.15}, {"s": "TSLA", "mv": 313.0, "pnl": 20.0, "q": 1, "st": 1.0, "th": "EV & Auto", "d": -2.09}, {"s": "VYGR", "mv": 311.0, "pnl": 11.0, "q": 100, "st": 1.0, "th": "Space & Satellite", "d": 0.65}, {"s": "RGTI", "mv": 283.4, "pnl": -171.6, "q": 20, "st": 1.0, "th": "Quantum", "d": -4.58}, {"s": "VCX", "mv": 277.4, "pnl": -1172.6, "q": 5, "st": 1.0, "th": "Space & Satellite", "d": -5.0}, {"s": "BBAI", "mv": 276.5, "pnl": -171.5, "q": 100, "st": 1.0, "th": "AI & Semis", "d": -2.98}, {"s": "BLSH", "mv": 263.67, "pnl": -143.33, "q": 11, "st": 1.0, "th": "Crypto & Miners", "d": -1.11}, {"s": "LCID", "mv": 252.0, "pnl": -442.4, "q": 40, "st": 0.5, "th": "EV & Auto", "d": -2.33}, {"s": "KULR", "mv": 251.0, "pnl": -522.0, "q": 100, "st": 0.375, "th": "Space & Satellite", "d": -9.39}, {"s": "YELP", "mv": 250.9, "pnl": 20.9, "q": 10, "st": 1.0, "th": "AI & Semis", "d": 2.41}, {"s": "ACHR", "mv": 238.5, "pnl": -221.0, "q": 50, "st": 1.0, "th": "eVTOL / Air Taxi", "d": -6.65}, {"s": "OPENW", "mv": 237.44, "pnl": -735.56, "q": 700, "st": 0.9991, "th": "Speculative / Meme / Other", "d": -3.09}, {"s": "AMC", "mv": 226.98, "pnl": 56.98, "q": 100, "st": 1.0, "th": "Speculative / Meme / Other", "d": -0.45}, {"s": "DFTX", "mv": 215.85, "pnl": 40.85, "q": 5, "st": 1.0, "th": "Quantum", "d": 0.56}, {"s": "REA", "mv": 211.6, "pnl": -258.4, "q": 20, "st": 1.0, "th": "Space & Satellite", "d": -7.03}, {"s": "EVTL", "mv": 207.75, "pnl": -255.75, "q": 150, "st": 1.0, "th": "eVTOL / Air Taxi", "d": -8.28}, {"s": "CBRS", "mv": 199.1, "pnl": -105.9, "q": 1, "st": 1.0, "th": "Space & Satellite", "d": -9.5}, {"s": "CVX", "mv": 194.72, "pnl": 38.72, "q": 1, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 0.15}, {"s": "OPEN", "mv": 191.54, "pnl": -39.46, "q": 50, "st": 1.0, "th": "Speculative / Meme / Other", "d": -0.37}, {"s": "AMPX", "mv": 184.8, "pnl": 64.8, "q": 20, "st": 1.0, "th": "Nuclear / Energy Tech", "d": -6.76}, {"s": "GIS", "mv": 180.15, "pnl": -53.55, "q": 5, "st": 1.0, "th": "Speculative / Meme / Other", "d": 1.35}, {"s": "VKTX", "mv": 173.85, "pnl": 28.85, "q": 5, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.75}, {"s": "BMNR", "mv": 158.15, "pnl": -211.85, "q": 10, "st": 1.0, "th": "Crypto & Miners", "d": -4.67}, {"s": "SOUN", "mv": 153.88, "pnl": -84.37, "q": 25, "st": 1.0, "th": "AI & Semis", "d": -1.05}, {"s": "CDE", "mv": 151.35, "pnl": -53.65, "q": 10, "st": 1.0, "th": "Materials / Rare Earth", "d": -0.69}, {"s": "F", "mv": 143.55, "pnl": 13.55, "q": 10, "st": 1.0, "th": "EV & Auto", "d": 1.45}, {"s": "MSTY", "mv": 122.5, "pnl": -572.4, "q": 10, "st": 0.7, "th": "Crypto & Miners", "d": -1.76}, {"s": "MARA", "mv": 121.45, "pnl": -18.55, "q": 10, "st": 1.0, "th": "Crypto & Miners", "d": -4.89}, {"s": "SFGYY", "mv": 117.0, "pnl": 10.75, "q": 25, "st": 1.0, "th": "Materials / Rare Earth", "d": -0.85}, {"s": "CEPO", "mv": 106.6, "pnl": -18.4, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.0}, {"s": "FIG", "mv": 105.75, "pnl": -301.75, "q": 5, "st": 1.0, "th": "Fintech", "d": 5.75}, {"s": "NVDL", "mv": 94.52, "pnl": -4.48, "q": 3, "st": 1.0, "th": "AI & Semis", "d": -1.64}, {"s": "INTC", "mv": 92.31, "pnl": 71.31, "q": 1, "st": 1.0, "th": "AI & Semis", "d": -7.9}, {"s": "NOK", "mv": 90.69, "pnl": -29.31, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": -6.79}, {"s": "INFQ", "mv": 89.8, "pnl": -60.2, "q": 10, "st": 1.0, "th": "AI & Semis", "d": -7.33}, {"s": "SHEL", "mv": 88.39, "pnl": 23.04, "q": 1, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 0.5}, {"s": "BB", "mv": 85.31, "pnl": 21.31, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.15}, {"s": "AAL", "mv": 72.35, "pnl": -25.8, "q": 5, "st": 1.0, "th": "Speculative / Meme / Other", "d": 6.75}, {"s": "AFRM", "mv": 70.2, "pnl": 20.2, "q": 1, "st": 1.0, "th": "Fintech", "d": -1.42}, {"s": "WEN", "mv": 69.9, "pnl": -14.4, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.51}, {"s": "CRML", "mv": 69.84, "pnl": -50.16, "q": 12, "st": 1.0, "th": "Materials / Rare Earth", "d": -4.75}, {"s": "ORBS", "mv": 60.43, "pnl": -70.57, "q": 100, "st": 1.0, "th": "Crypto & Miners", "d": -6.48}, {"s": "PYPL", "mv": 56.15, "pnl": 14.15, "q": 1, "st": 1.0, "th": "Fintech", "d": 0.27}, {"s": "SLB", "mv": 52.45, "pnl": -4.55, "q": 1, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 11.09}, {"s": "OLOX", "mv": 51.8, "pnl": -344.2, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": -7.25}, {"s": "HRZN", "mv": 43.15, "pnl": -20.55, "q": 10, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.15}, {"s": "NWL", "mv": 25.43, "pnl": 7.23, "q": 5, "st": 1.0, "th": "Speculative / Meme / Other", "d": 1.09}, {"s": "FEED", "mv": 18.8, "pnl": -21.2, "q": 50, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.11}, {"s": "RKT", "mv": 13.05, "pnl": 2.07, "q": 1, "st": 1.0, "th": "Fintech", "d": 2.15}, {"s": "FSM", "mv": 8.55, "pnl": 4.15, "q": 1, "st": 1.0, "th": "Materials / Rare Earth", "d": 1.54}, {"s": "POET", "mv": 6.89, "pnl": -0.81, "q": 1, "st": 1.0, "th": "AI & Semis", "d": -9.34}, {"s": "GEMI", "mv": 4.29, "pnl": -23.71, "q": 1, "st": 1.0, "th": "Crypto & Miners", "d": -2.5}, {"s": "OPENL", "mv": 0.19, "pnl": 0.19, "q": 1, "st": 1.0, "th": "Speculative / Meme / Other", "d": -3.56}, {"s": "OPENZ", "mv": 0.17, "pnl": 0.17, "q": 1, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.7}], SIM_CUT=["BITO", "TSLY", "NVDY", "MSTY", "SPCE", "FIG", "OPENW", "ORBS", "OLOX", "FEED", "GEMI"], SIM_D=60323.75, SIM_E=86631.71, SIM_R=4.80;
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
