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
var ST={emv:80234.37,cr:13484.25,debit:55896.79};
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
var SIM=[{"s": "RKLB", "mv": 11720.0, "pnl": 3442.0, "q": 200.0, "st": 1.0, "th": "Space & Satellite", "d": -8.28}, {"s": "PLTR", "mv": 11070.0, "pnl": -3381.3, "q": 90.0, "st": 1.0, "th": "AI & Semis", "d": -0.43}, {"s": "NOW", "mv": 10418.4, "pnl": 2276.1, "q": 90.0, "st": 1.0, "th": "AI & Semis", "d": 4.65}, {"s": "NVDA", "mv": 8550.45, "pnl": 927.45, "q": 45.0, "st": 1.0, "th": "AI & Semis", "d": -3.55}, {"s": "HOOD", "mv": 3144.4, "pnl": 1482.25, "q": 35.0, "st": 1.0, "th": "Fintech", "d": -3.15}, {"s": "PL", "mv": 2920.5, "pnl": 2188.5, "q": 150.0, "st": 1.0, "th": "Space & Satellite", "d": -4.65}, {"s": "LUNR", "mv": 2278.0, "pnl": 404.0, "q": 200.0, "st": 1.0, "th": "Space & Satellite", "d": -7.92}, {"s": "BP", "mv": 2166.0, "pnl": 568.5, "q": 50.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 3.96}, {"s": "TSM", "mv": 1873.35, "pnl": 1103.35, "q": 5.0, "st": 1.0, "th": "AI & Semis", "d": -4.5}, {"s": "QCOM", "mv": 1556.8, "pnl": -736.4, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": -4.42}, {"s": "HON", "mv": 1205.6, "pnl": -18.5, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.4}, {"s": "HONA", "mv": 1025.95, "pnl": -129.95, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -4.96}, {"s": "RDW", "mv": 1011.4, "pnl": -604.5, "q": 130.0, "st": 0.6923, "th": "Space & Satellite", "d": -9.22}, {"s": "NIO", "mv": 952.0, "pnl": -682.0, "q": 200.0, "st": 0.0, "th": "EV & Auto", "d": 1.71}, {"s": "VWO", "mv": 853.8, "pnl": 138.75, "q": 15.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.42}, {"s": "KSS", "mv": 762.4, "pnl": 332.4, "q": 40.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -0.16}, {"s": "VSAT", "mv": 701.9, "pnl": 611.9, "q": 10.0, "st": 1.0, "th": "Space & Satellite", "d": -5.31}, {"s": "REMX", "mv": 645.9, "pnl": -99.1, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": -2.27}, {"s": "IONQ", "mv": 639.8, "pnl": -501.0, "q": 20.0, "st": 1.0, "th": "Quantum", "d": -5.58}, {"s": "TSLY", "mv": 614.7, "pnl": -567.9, "q": 30.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -2.52}, {"s": "IREN", "mv": 586.2, "pnl": -226.8, "q": 20.0, "st": 1.0, "th": "Crypto & Miners", "d": -13.62}, {"s": "META", "mv": 585.61, "pnl": -9.39, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": -1.31}, {"s": "NVDY", "mv": 579.0, "pnl": -120.5, "q": 50.0, "st": 1.0, "th": "AI & Semis", "d": -3.58}, {"s": "VOYG", "mv": 565.5, "pnl": -399.5, "q": 25.0, "st": 0.6, "th": "Space & Satellite", "d": -11.81}, {"s": "SPCX", "mv": 562.75, "pnl": -372.25, "q": 5.0, "st": 1.0, "th": "Space & Satellite", "d": -3.32}, {"s": "FISV", "mv": 556.3, "pnl": -33.7, "q": 10.0, "st": 1.0, "th": "Fintech", "d": 2.62}, {"s": "OKLO", "mv": 552.6, "pnl": -1442.4, "q": 15.0, "st": 1.0, "th": "Nuclear / Energy Tech", "d": -6.92}, {"s": "ASTS", "mv": 530.3, "pnl": 325.3, "q": 10.0, "st": 1.0, "th": "Space & Satellite", "d": -6.22}, {"s": "STUB", "mv": 511.8, "pnl": -190.8, "q": 60.0, "st": 1.0, "th": "Fintech", "d": -0.12}, {"s": "HIMS", "mv": 500.0, "pnl": -66.2, "q": 20.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -14.73}, {"s": "GPRO", "mv": 486.15, "pnl": -381.85, "q": 700.0, "st": 0.9143, "th": "Speculative / Meme / Other", "d": -3.56}, {"s": "SOFI", "mv": 457.5, "pnl": 42.6, "q": 30.0, "st": 1.0, "th": "Fintech", "d": -8.9}, {"s": "KTOS", "mv": 438.8, "pnl": -255.2, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -9.79}, {"s": "VYX", "mv": 433.0, "pnl": 94.0, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.7}, {"s": "SPCE", "mv": 416.5, "pnl": -1210.4, "q": 170.0, "st": 0.1176, "th": "Space & Satellite", "d": -1.61}, {"s": "MP", "mv": 381.0, "pnl": -229.0, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": -7.7}, {"s": "ABSI", "mv": 345.0, "pnl": 182.0, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -3.23}, {"s": "JOBY", "mv": 332.5, "pnl": -39.0, "q": 50.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": -8.53}, {"s": "QBTS", "mv": 323.6, "pnl": -220.8, "q": 20.0, "st": 1.0, "th": "Quantum", "d": -8.25}, {"s": "LCID", "mv": 318.4, "pnl": -376.0, "q": 40.0, "st": 0.5, "th": "EV & Auto", "d": 0.76}, {"s": "VYGR", "mv": 300.0, "pnl": 0.0, "q": 100.0, "st": 1.0, "th": "Space & Satellite", "d": -1.32}, {"s": "YELP", "mv": 279.2, "pnl": 49.2, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": 1.9}, {"s": "AMC", "mv": 275.0, "pnl": 105.0, "q": 100.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 3.0}, {"s": "MNRO", "mv": 265.1, "pnl": -64.9, "q": 20.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -22.94}, {"s": "RGTI", "mv": 264.4, "pnl": -190.6, "q": 20.0, "st": 1.0, "th": "Quantum", "d": -8.95}, {"s": "BBAI", "mv": 259.0, "pnl": -189.0, "q": 100.0, "st": 1.0, "th": "AI & Semis", "d": -6.16}, {"s": "KULR", "mv": 242.0, "pnl": -531.0, "q": 100.0, "st": 0.375, "th": "Space & Satellite", "d": -4.35}, {"s": "BLSH", "mv": 240.24, "pnl": -166.76, "q": 11.0, "st": 1.0, "th": "Crypto & Miners", "d": -3.75}, {"s": "ACHR", "mv": 224.0, "pnl": -235.5, "q": 50.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": -7.05}, {"s": "DFTX", "mv": 210.8, "pnl": 35.8, "q": 5.0, "st": 1.0, "th": "Quantum", "d": 0.48}, {"s": "OPENW", "mv": 196.42, "pnl": -776.58, "q": 700.0, "st": 0.9991, "th": "Speculative / Meme / Other", "d": -11.26}, {"s": "CVX", "mv": 191.86, "pnl": 35.86, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 2.28}, {"s": "GIS", "mv": 189.6, "pnl": -44.1, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.72}, {"s": "OPEN", "mv": 183.5, "pnl": -47.5, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -6.85}, {"s": "REA", "mv": 181.6, "pnl": -288.4, "q": 20.0, "st": 1.0, "th": "Space & Satellite", "d": -3.81}, {"s": "EVTL", "mv": 181.5, "pnl": -282.0, "q": 150.0, "st": 1.0, "th": "eVTOL / Air Taxi", "d": -10.37}, {"s": "VCX", "mv": 174.6, "pnl": -1275.4, "q": 5.0, "st": 1.0, "th": "Space & Satellite", "d": 3.25}, {"s": "CBRS", "mv": 169.39, "pnl": -135.61, "q": 1.0, "st": 1.0, "th": "Space & Satellite", "d": -12.11}, {"s": "AMPX", "mv": 168.8, "pnl": 48.8, "q": 20.0, "st": 1.0, "th": "Nuclear / Energy Tech", "d": -7.56}, {"s": "VKTX", "mv": 167.15, "pnl": 22.15, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.27}, {"s": "BMNR", "mv": 165.9, "pnl": -204.1, "q": 10.0, "st": 1.0, "th": "Crypto & Miners", "d": -5.58}, {"s": "F", "mv": 152.8, "pnl": 22.8, "q": 10.0, "st": 1.0, "th": "EV & Auto", "d": 2.14}, {"s": "CDE", "mv": 146.3, "pnl": -58.7, "q": 10.0, "st": 1.0, "th": "Materials / Rare Earth", "d": -1.88}, {"s": "SOUN", "mv": 142.5, "pnl": -95.75, "q": 25.0, "st": 1.0, "th": "AI & Semis", "d": -8.65}, {"s": "MSTY", "mv": 125.0, "pnl": -569.9, "q": 10.0, "st": 0.7, "th": "Crypto & Miners", "d": -2.27}, {"s": "FIG", "mv": 123.8, "pnl": -283.7, "q": 5.0, "st": 1.0, "th": "Fintech", "d": 1.56}, {"s": "SFGYY", "mv": 120.5, "pnl": 14.25, "q": 25.0, "st": 1.0, "th": "Materials / Rare Earth", "d": 2.34}, {"s": "CEPO", "mv": 106.6, "pnl": -18.4, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": 0.0}, {"s": "MARA", "mv": 100.5, "pnl": -39.5, "q": 10.0, "st": 1.0, "th": "Crypto & Miners", "d": -11.69}, {"s": "SHEL", "mv": 88.34, "pnl": 22.99, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": 2.48}, {"s": "INFQ", "mv": 88.3, "pnl": -61.7, "q": 10.0, "st": 1.0, "th": "AI & Semis", "d": -7.64}, {"s": "NOK", "mv": 84.1, "pnl": -35.9, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -5.82}, {"s": "INTC", "mv": 81.88, "pnl": 60.88, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": -5.12}, {"s": "NVDL", "mv": 79.47, "pnl": -19.53, "q": 3.0, "st": 1.0, "th": "AI & Semis", "d": -6.79}, {"s": "BB", "mv": 78.1, "pnl": 14.1, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -3.46}, {"s": "WEN", "mv": 76.5, "pnl": -7.8, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -0.26}, {"s": "AAL", "mv": 74.2, "pnl": -23.95, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -3.39}, {"s": "AFRM", "mv": 70.11, "pnl": 20.11, "q": 1.0, "st": 1.0, "th": "Fintech", "d": -3.16}, {"s": "CRML", "mv": 61.56, "pnl": -58.44, "q": 12.0, "st": 1.0, "th": "Materials / Rare Earth", "d": -9.36}, {"s": "PYPL", "mv": 58.35, "pnl": 16.35, "q": 1.0, "st": 1.0, "th": "Fintech", "d": 0.05}, {"s": "ORBS", "mv": 58.11, "pnl": -72.89, "q": 100.0, "st": 1.0, "th": "Crypto & Miners", "d": -2.73}, {"s": "SLB", "mv": 48.96, "pnl": -8.04, "q": 1.0, "st": 1.0, "th": "Energy (Oil & Gas)", "d": -2.04}, {"s": "OLOX", "mv": 46.1, "pnl": -349.9, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -6.68}, {"s": "HRZN", "mv": 43.1, "pnl": -20.6, "q": 10.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -0.23}, {"s": "NWL", "mv": 25.95, "pnl": 7.75, "q": 5.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -1.33}, {"s": "FEED", "mv": 16.5, "pnl": -23.5, "q": 50.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -3.73}, {"s": "RKT", "mv": 13.7, "pnl": 2.72, "q": 1.0, "st": 1.0, "th": "Fintech", "d": -2.0}, {"s": "FSM", "mv": 8.37, "pnl": 3.97, "q": 1.0, "st": 1.0, "th": "Materials / Rare Earth", "d": -0.59}, {"s": "POET", "mv": 6.37, "pnl": -1.33, "q": 1.0, "st": 1.0, "th": "AI & Semis", "d": -5.77}, {"s": "GEMI", "mv": 4.07, "pnl": -23.93, "q": 1.0, "st": 1.0, "th": "Crypto & Miners", "d": -7.19}, {"s": "OPENL", "mv": 0.17, "pnl": 0.17, "q": 1.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -9.88}, {"s": "OPENZ", "mv": 0.15, "pnl": 0.15, "q": 1.0, "st": 1.0, "th": "Speculative / Meme / Other", "d": -8.49}], SIM_CUT=["TSLY", "NVDY", "MSTY", "SPCE", "FIG", "OPENW", "ORBS", "OLOX", "FEED", "GEMI"], SIM_D=55896.79, SIM_E=80234.37, SIM_R=4.80;
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
  else if(net>0){note.innerHTML='Interest saved exceeds the tax cost by <b>'+fmt(net)+'</b> in year one, and the cushion moves from -'+(0.4759).toFixed(1)+'% to -'+callAt.toFixed(1)+'%. This one pays for itself.';note.className='sim-note ok';}
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
