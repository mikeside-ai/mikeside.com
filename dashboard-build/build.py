# -*- coding: utf-8 -*-
# Committed dashboard builder for the scheduled auto-refresh. Fully self-contained.
# Run: write /tmp/data.json then `python3 build.py` -> writes index.html
import html, json
_D = json.load(open("/tmp/data.json"))
data = [tuple(x) for x in _D["positions"]]
asof = _D.get("asof","latest")
crypto_value = _D["crypto_value"]; cash = _D["cash"]; net_account = _D["net_account"]; buying_power = _D["buying_power"]

theme = {
"AI & Semis":["PLTR","NVDA","NOW","BBAI","SOUN","NVDL","NVDY","PLTY","QCOM","TSM","INTC","INFQ","POET","META","YELP"],
"Space & Satellite":["RKLB","ASTS","LUNR","RDW","PL","SPCE","VSAT","VOYG","VYGR","SPCX","KULR","REA","VCX","CBRS"],
"eVTOL / Air Taxi":["JOBY","ACHR","EVTL"],
"Quantum":["IONQ","RGTI","QBTS","DFTX"],
"Nuclear / Energy Tech":["OKLO","AMPX"],
"Crypto & Miners":["BITO","MARA","IREN","BMNR","MSTY","GEMI","BLSH","ORBS"],
"Fintech":["HOOD","SOFI","AFRM","PYPL","FISV","RKT","STUB","FIG"],
"EV & Auto":["TSLA","NIO","LCID","F"],
"Energy (Oil & Gas)":["CVX","SHEL","BP","SLB"],
"Materials / Rare Earth":["MP","REMX","CRML","CDE","FSM","SFGYY"],
"Speculative / Meme / Other":["AMC","GPRO","KSS","OPEN","OPENW","OPENZ","OPENL","WEN","GIS","MNRO","NWL",
   "NOK","BB","KTOS","HIMS","VKTX","ABSI","AAL","VWO","HRZN","CEPO","OLOX","HON","HONA"],
}
sym_theme = {}
for t, syms in theme.items():
    for s in syms:
        sym_theme[s] = t

rows = []
tot_mv = tot_cost = 0.0
for sym, qty, avg, p in data:
    mv = qty * p
    cost = qty * avg
    pnl = mv - cost
    pnlpct = (pnl / cost * 100) if cost > 0 else None
    tot_mv += mv
    tot_cost += cost
    rows.append(dict(sym=sym, qty=qty, avg=avg, price=p, mv=mv, cost=cost,
                     pnl=pnl, pnlpct=pnlpct, theme=sym_theme.get(sym,"Speculative / Meme / Other")))
tot_pnl = tot_mv - tot_cost
tot_pnlpct = tot_pnl / tot_cost * 100


theme_mv = {}
for r in rows:
    theme_mv[r["theme"]] = theme_mv.get(r["theme"], 0.0) + r["mv"]
theme_sorted = sorted(theme_mv.items(), key=lambda x: -x[1])
rows_by_mv = sorted(rows, key=lambda r: -r["mv"])
top10 = rows_by_mv[:10]
by_pnl = sorted([r for r in rows if r["pnlpct"] is not None], key=lambda r: -r["pnl"])
winners = by_pnl[:5]
losers = by_pnl[-5:][::-1]

ai = theme_mv.get("AI & Semis",0); space = theme_mv.get("Space & Satellite",0)
ai_pct = ai/tot_mv*100; space_pct = space/tot_mv*100
top4 = sum(r["mv"] for r in rows_by_mv[:4]); top4_pct = top4/tot_mv*100

def money(x): return "${:,.0f}".format(x)
def d2(x): return "${:,.2f}".format(x)

# cut list (recomputed live)
def rowfor(sym):
    for r in rows:
        if r["sym"]==sym: return r
sell = ["BITO","TSLY","NVDY","PLTY","MSTY","SPCE","FIG","OPENW"]
dust = ["ORBS","OLOX","FEED","GEMI"]
cut_freed = sum(rowfor(s)["mv"] for s in sell+dust)

bp = buying_power
idx = {r["sym"]: r for r in rows}

def money(x): return "${:,.0f}".format(x)
def sgn(x): return ("${:,.0f}".format(x)) if x>=0 else ("-${:,.0f}".format(abs(x)))
def pct(x): return ("+%0.1f%%"%x) if x>=0 else ("%0.1f%%"%x)

# theme bars
tb=""
for name,mv in theme_sorted:
    p=mv/tot_mv*100
    tb+='<div class="tb"><div class="tb-top"><span>%s</span><span>%s &middot; %0.0f%%</span></div><div class="tb-bar"><div style="width:%0.1f%%"></div></div></div>'%(name.replace("&","&amp;"),money(mv),p,p)

# top10
t10=""
for r in top10:
    t10+='<div class="alloc-row"><span class="sym">%s</span><span class="num">%s</span><span class="num muted">%0.1f%%</span></div>'%(r["sym"],money(r["mv"]),r["mv"]/tot_mv*100)

# winners/losers
def wl(lst):
    s=""
    for r in lst:
        cls="pos" if r["pnl"]>=0 else "neg"
        s+='<div class="alloc-row"><span class="sym">%s</span><span class="num %s">%s</span><span class="num %s">%s</span></div>'%(r["sym"],cls,sgn(r["pnl"]),cls,pct(r["pnlpct"]))
    return s
win_html=wl(winners); los_html=wl(losers)

# holdings table
tr=""
for r in rows_by_mv:
    if r["pnlpct"] is None:
        pnlpct_txt="&mdash;"; pcls="pos"
    else:
        pcls="pos" if r["pnl"]>=0 else "neg"; pnlpct_txt=pct(r["pnlpct"])
    dcls="pos" if r["pnl"]>=0 else "neg"
    tr+="<tr><td><b>%s</b></td><td class='num'>%s</td><td class='num'>$%0.2f</td><td class='num'>$%0.2f</td><td class='num'>%s</td><td class='num'>%0.1f%%</td><td class='num %s'>%s</td><td class='num %s'>%s</td></tr>"%(
        r["sym"], ("%g"%r["qty"]), r["avg"], r["price"], money(r["mv"]), r["mv"]/tot_mv*100, dcls, sgn(r["pnl"]), pcls, pnlpct_txt)

# cut table rows
def cutrow(sym, why, tag, tagcls):
    r=idx[sym]
    return '<tr><td><b>%s</b></td><td class="num">%s</td><td class="num neg">%s</td><td>%s</td><td><span class="cut-tag %s">%s</span></td></tr>'%(
        sym, money(r["mv"]), pct(r["pnlpct"]), why, tagcls, tag)

sell_specs=[
("BITO","Bitcoin-futures ETF; roll decay, and redundant with the crypto you already hold directly"),
("TSLY","YieldMax TSLA income ETF &mdash; NAV erodes structurally over time"),
("NVDY","YieldMax NVDA income ETF &mdash; same decay; own NVDA directly instead (you do)"),
("PLTY","YieldMax PLTR income ETF &mdash; down over half, structural erosion"),
("MSTY","YieldMax MSTR income ETF &mdash; nearly gone; no recovery mechanism"),
]
broken_specs=[
("SPCE","Virgin Galactic &mdash; still cash-burning and binary on unproven 2026 commercial flights; a lottery ticket, not a hold (see sentiment section for the live catalyst)"),
("FIG","Down ~75% from cost with no working thesis to defend the hold"),
("OPENW","Speculative, down ~76%; size and odds don't justify holding"),
]
dust_specs=[
("ORBS","Penny position, immaterial &mdash; just clutter and tax-lot tracking"),
("OLOX","Effectively wiped out; nothing to preserve"),
("FEED","Sub-$20 dust"),
("GEMI","A few dollars left &mdash; close it out"),
]
reassess=[
("PLTR","Your #2 position and a conviction name &mdash; a drawdown, not a broken thesis. Cutting locks the loss.","Keep","c-keep"),
("OKLO","Real nuclear company, highly volatile &mdash; decide on the thesis, not the price","Judgment","c-keep"),
("LCID","Struggling but an operating EV maker with backing &mdash; a bet, not dead money","Judgment","c-keep"),
]
quantum_mv = idx["IONQ"]["mv"]+idx["RGTI"]["mv"]+idx["QBTS"]["mv"]

cut_body=""
cut_body+='<tr><td colspan="5" class="grp">Structural decay &mdash; income &amp; leveraged ETFs (bleed by design)</td></tr>'
for s,w in sell_specs: cut_body+=cutrow(s,w,"Sell","c-sell")
cut_body+='<tr><td colspan="5" class="grp">Broken thesis &mdash; impaired companies</td></tr>'
for s,w in broken_specs: cut_body+=cutrow(s,w,"Sell","c-sell")
cut_body+='<tr><td colspan="5" class="grp">Clear the dust &mdash; near-total loss, too small to matter</td></tr>'
for s,w in dust_specs: cut_body+=cutrow(s,w,"Clear","c-dust")
cut_body+='<tr><td colspan="5" class="grp">Reassess &mdash; down big, but DON\'T auto-cut (thesis may still hold)</td></tr>'
for s,w,tag,tc in reassess: cut_body+=cutrow(s,w,tag,tc)
cut_body+='<tr><td><b>IONQ / RGTI / QBTS</b></td><td class="num">%s</td><td class="num neg">-35 to -40%%</td><td>Early-stage quantum basket &mdash; hold or cut as one thematic bet, your call on the theme</td><td><span class="cut-tag c-keep">Judgment</span></td></tr>'%money(quantum_mv)

freed_txt = "${:,.0f}".format(round(cut_freed/50)*50)
npos = len(rows)
marginval = ("-${:,.0f}".format(abs(cash))) if cash < 0 else money(cash)
bptxt = ("-${:,.2f}".format(abs(bp))) if bp < 0 else ("${:,.2f}".format(bp))

SENT = '''
  <div class="card context" style="margin-top:16px">
    <h2 style="display:flex;align-items:center;flex-wrap:wrap;gap:2px">Market Sentiment &amp; External Factors <span class="sbadge">Context &middot; not advice</span></h2>
    <p style="font-size:12px;color:var(--muted);margin:0 0 16px;line-height:1.55">Market context and crowd/analyst sentiment &mdash; deliberately kept separate from the Suggested Moves above, which are my own analysis. Sentiment is a read on what others think, not a recommendation. Compiled Jul 24, 2026.</p>

    <h3 class="sh" style="margin-top:0">Why the tape is red right now</h3>
    <p style="font-size:13px;line-height:1.55;color:#cdd6e2;margin:0 0 10px">Today&rsquo;s drop is mostly a market-wide risk-off &mdash; not your individual companies breaking:</p>
    <div class="factor"><div class="fn">1</div><div><b>AI-spending rout.</b> The &ldquo;Magnificent Seven&rdquo; shed roughly <b>$800B</b> Thursday as investors balked at ballooning AI capex; Alphabet and Tesla led the drop, and chip momentum faded (NVDA is down ~18% in 2026, with DeepSeek&rsquo;s in-house chip an overhang).</div></div>
    <div class="factor"><div class="fn">2</div><div><b>New tariffs took effect.</b> A fresh Section 301 package (roughly <b>10&ndash;12.5%</b> on nearly all imports; energy exempted) landed this week &mdash; a renewed inflation and margin worry.</div></div>
    <div class="factor"><div class="fn">3</div><div><b>Oil near triple digits.</b> Brent touched $100 before easing ~2% &mdash; higher energy costs keep inflation, and rate-cut hopes, in question.</div></div>
    <div class="factor"><div class="fn">4</div><div><b>The risk-off math is the real story for you.</b> When inflation and rate fears rise, the highest-beta, least-profitable, longest-duration names fall hardest &mdash; exactly space, quantum, eVTOL, EV, crypto and unprofitable AI. Your book is ~70% AI + Space plus a long tail of speculative small caps, so it is <b>built to fall more than the index</b> on days like this (and rise more on green days). That&rsquo;s the concentration trade-off showing up live.</div></div>

    <h3 class="sh">Crowd &amp; analyst sentiment &mdash; your key names</h3>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Name</th><th>Street &amp; crowd read</th><th>Tone</th></tr></thead>
      <tbody>
        <tr><td><b>RKLB</b></td><td>Analyst targets ~$83&ndash;$119, above the current price; a $266M Air Force deal, a Space Force launch ceiling raised to $17B, and an Iridium acquisition add real backlog. Bulls love the pipeline; skeptics flag a premium vs SpaceX and continued cash burn.</td><td><span class="stag s-const">Constructive</span></td></tr>
        <tr><td><b>PLTR</b></td><td>32 analysts, 19 Strong Buy, average target ~$183 (~+47%); revenue projected +72% in 2026. But forward P/E is ~84 &mdash; priced for perfection, so any stumble de-rates it hard.</td><td><span class="stag s-bull">Bullish, pricey</span></td></tr>
        <tr><td><b>HOOD</b></td><td>Down ~11% in H1 2026 on worries about its consumer-credit expansion and fundraising, plus crypto beta and an ARK trim. Q2 earnings on Jul 29 is the next real catalyst.</td><td><span class="stag s-mix">Mixed</span></td></tr>
        <tr><td><b>NVDA</b></td><td>Off ~18% YTD on AI-capex digestion and DeepSeek&rsquo;s in-house chip threat, but the Street stays bullish &mdash; 12-month targets around $250 and calls that &ldquo;the dip is a gift, $1.1T of AI spend is coming.&rdquo;</td><td><span class="stag s-const">Constructive</span></td></tr>
        <tr><td><b>OKLO</b></td><td>Down ~41&ndash;46% in 2026. Pre-revenue nuclear/SMR story; some valuations lean on 2032 projections. The crowd is split between &ldquo;screaming buy&rdquo; and &ldquo;far too early.&rdquo;</td><td><span class="stag s-spec">Speculative</span></td></tr>
        <tr><td><b>IONQ / RGTI / QBTS</b></td><td>&ldquo;Quantum bubble&rdquo; fears are loud: thin revenue, repeated 5&ndash;8% down days on risk-off, and a reported ~$988M insider-selling warning across the group.</td><td><span class="stag s-bear">Cautious</span></td></tr>
        <tr><td><b>SPCE</b></td><td>Bounced in June on Delta-ship progress, an extended cash runway and a tightened 2026 launch plan &mdash; but the bull case still needs &ldquo;everything to go right.&rdquo; Binary on unproven commercial flights.</td><td><span class="stag s-spec">Speculative</span></td></tr>
      </tbody>
    </table></div>

    <h3 class="sh">Grounded outlook &mdash; recovery vs. downside</h3>
    <div class="out">
      <div class="ocard"><h4>RKLB &mdash; Space &amp; Satellite</h4>
        <p class="ln up">Real, funded contracts and a $2.2B backlog; the Neutron rocket and the Iridium deal add second and third growth engines. Targets sit above today&rsquo;s price.</p>
        <p class="ln dn">Still unprofitable (~-$45M net, ~-$77M free cash flow) and richly valued; as a high-beta name it swings hard with risk sentiment.</p>
        <p class="vd">Straight read: the business is executing and today&rsquo;s drop is mostly macro, not deterioration &mdash; but it stays volatile and hostage to the tape near term.</p></div>
      <div class="ocard"><h4>PLTR &mdash; AI</h4>
        <p class="ln up">Best-in-class growth (+72% revenue) and entrenched in government and enterprise AI; analysts still see meaningful upside.</p>
        <p class="ln dn">A ~84x forward multiple means the valuation itself is the risk &mdash; it can keep de-rating even if the business is fine.</p>
        <p class="vd">Straight read: not broken, but priced for perfection. Long-run upside is real if growth holds; near term it trades on multiple, not fundamentals.</p></div>
      <div class="ocard"><h4>NVDA &mdash; AI / Semis</h4>
        <p class="ln up">Still the AI-infrastructure leader, at a cheaper multiple than a year ago; Street targets imply solid upside if capex keeps flowing.</p>
        <p class="ln dn">The &ldquo;is AI spending peaking?&rdquo; debate plus DeepSeek and China competition caps the stock until it resolves.</p>
        <p class="vd">Straight read: a quality name on sale, but momentum is broken &mdash; likely range-bound and headline-driven until the capex question clears.</p></div>
      <div class="ocard"><h4>HOOD &mdash; Fintech</h4>
        <p class="ln up">Profitable, growing brokerage; the consumer-finance push is a genuine expansion of the model, and earnings could reset the story.</p>
        <p class="ln dn">That same credit expansion &mdash; plus fundraising and crypto beta &mdash; is exactly what&rsquo;s unsettling investors right now.</p>
        <p class="vd">Straight read: still a strong holding (up ~99% for you), but the strategy shift adds real execution and credit risk. Jul 29 earnings is a swing point.</p></div>
      <div class="ocard"><h4>OKLO &mdash; Nuclear</h4>
        <p class="ln up">Large addressable market if small modular reactors work; enormous optionality on a multi-year horizon.</p>
        <p class="ln dn">Pre-revenue and cash-burning, with valuations resting on ~2032 projections &mdash; a long-dated, binary bet.</p>
        <p class="vd">Straight read: a story stock years from proving itself. Justifiable only as a small speculative position, not a fundamentals-based hold.</p></div>
      <div class="ocard"><h4>Quantum &mdash; IONQ / RGTI / QBTS</h4>
        <p class="ln up">Real long-term optionality if quantum reaches commercial scale; these are the liquid pure-plays.</p>
        <p class="ln dn">Pre-commercial with thin revenue; bubble talk and heavy insider selling are real red flags.</p>
        <p class="vd">Straight read: lottery tickets, not investments. Fine to hold small for the optionality &mdash; just size them like the speculation they are.</p></div>
    </div>
    <p style="font-size:11px;color:var(--faint);margin:16px 0 0;line-height:1.6">Sentiment and external-factor context compiled Jul 24, 2026 from market coverage (Yahoo Finance, CNBC, Motley Fool, 24/7 Wall St., Benzinga, StockAnalysis, TipRanks, Timothy Sykes). Informational context, not a recommendation; it can change quickly, and analyst targets are opinions, not guarantees.</p>
  </div>
'''

HTML = """<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta name="robots" content="noindex, nofollow"/>
<title>Robinhood Portfolio Dashboard</title>
<style>
  :root{{--bg:#0b0e13;--panel:#141922;--panel-2:#1b212c;--line:#232b38;--text:#e7ecf3;--muted:#8b97a8;--faint:#5b6675;
    --green:#3fd68a;--red:#ff5c72;--accent:#6ea8fe;--gold:#f5c451;--radius:16px;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}}
  *{{box-sizing:border-box}} body{{margin:0;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}}
  a{{color:var(--accent);text-decoration:none}}
  #app{{max-width:1180px;margin:0 auto;padding:22px 20px 60px}}
  .topbar{{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px;flex-wrap:wrap}}
  .brand{{display:flex;align-items:center;gap:12px}}
  .brand .dot{{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--green),var(--accent));
    display:flex;align-items:center;justify-content:center;font-weight:700;color:#0b0e13}}
  .brand h1{{font-size:17px;margin:0;font-weight:650}} .brand .sub{{font-size:12px;color:var(--muted);margin-top:1px}}
  .whoami{{display:flex;align-items:center;gap:12px;font-size:13px;color:var(--muted)}}
  .btn{{background:var(--panel-2);border:1px solid var(--line);color:var(--text);padding:8px 14px;border-radius:10px;
    font-size:13px;cursor:pointer;text-decoration:none;display:inline-block}} .btn:hover{{border-color:#3a475a}}
  .pill{{display:inline-block;font-size:11px;padding:3px 9px;border-radius:999px;background:var(--panel-2);
    border:1px solid var(--line);color:var(--muted)}}
  .warn{{background:linear-gradient(90deg,rgba(255,92,114,.14),rgba(255,92,114,0));border:1px solid rgba(255,92,114,.35);
    border-left:3px solid var(--red);border-radius:12px;padding:12px 16px;margin-bottom:18px;font-size:13px;color:#ffd9df}}
  .warn b{{color:#fff}}
  .grid{{display:grid;gap:16px}} .kpis{{grid-template-columns:repeat(4,1fr)}}
  @media(max-width:880px){{.kpis{{grid-template-columns:repeat(2,1fr)}}}}
  .card{{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:18px}}
  .card h2{{font-size:13px;font-weight:600;color:var(--muted);margin:0 0 14px;letter-spacing:.02em;text-transform:uppercase}}
  .kpi .label{{font-size:12px;color:var(--muted);margin-bottom:8px}}
  .kpi .value{{font-size:24px;font-weight:680;letter-spacing:-.5px}}
  .kpi .delta{{font-size:12px;margin-top:6px;color:var(--faint)}}
  .pos{{color:var(--green)}} .neg{{color:var(--red)}} .muted{{color:var(--muted)}}
  .cols{{grid-template-columns:1.4fr 1fr;margin-top:16px}} @media(max-width:880px){{.cols{{grid-template-columns:1fr}}}}
  .cols3{{grid-template-columns:1fr 1fr;margin-top:16px}} @media(max-width:880px){{.cols3{{grid-template-columns:1fr}}}}
  .move{{border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:12px;background:var(--panel-2)}}
  .move:last-child{{margin-bottom:0}}
  .move-h{{display:flex;align-items:center;gap:10px;margin-bottom:6px}}
  .move-h h3{{font-size:14px;margin:0;font-weight:640}}
  .move p{{margin:0;font-size:13px;line-height:1.55;color:#cdd6e2}}
  .prio{{font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:3px 8px;border-radius:6px}}
  .p-high{{background:rgba(255,92,114,.16);color:#ff8a9b;border:1px solid rgba(255,92,114,.3)}}
  .p-med{{background:rgba(245,196,81,.14);color:var(--gold);border:1px solid rgba(245,196,81,.3)}}
  .p-low{{background:rgba(139,151,168,.14);color:var(--muted);border:1px solid var(--line)}}
  .today{{border:1px solid rgba(110,168,254,.45);border-left:3px solid var(--accent);
    background:linear-gradient(180deg,rgba(110,168,254,.06),transparent)}}
  .step{{display:flex;gap:13px;padding:13px 0;border-bottom:1px solid var(--line)}} .step:last-child{{border-bottom:0;padding-bottom:2px}}
  .step .n{{flex:none;width:24px;height:24px;border-radius:7px;background:var(--accent);color:#0b0e13;
    font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center}}
  .step .body h3{{margin:0 0 3px;font-size:14px;font-weight:640}} .step .body p{{margin:0;font-size:13px;line-height:1.55;color:#cdd6e2}}
  .cut-tag{{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;padding:2px 7px;border-radius:5px;white-space:nowrap}}
  .c-sell{{background:rgba(255,92,114,.16);color:#ff8a9b;border:1px solid rgba(255,92,114,.3)}}
  .c-dust{{background:rgba(139,151,168,.14);color:var(--muted);border:1px solid var(--line)}}
  .c-keep{{background:rgba(63,214,138,.14);color:var(--green);border:1px solid rgba(63,214,138,.3)}}
  .cut-note{{font-size:13px;line-height:1.55;color:#cdd6e2;margin:0 0 14px}}
  .cut-note b{{color:var(--gold)}}
  .grp{{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;padding:14px 8px 6px}}
  .tb{{margin-bottom:11px}} .tb-top{{display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;color:#cdd6e2}}
  .tb-bar{{height:8px;background:var(--panel-2);border-radius:6px;overflow:hidden}}
  .tb-bar>div{{height:100%;background:linear-gradient(90deg,var(--accent),var(--green));border-radius:6px}}
  .alloc-row{{display:grid;grid-template-columns:1fr auto auto;gap:12px;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px}}
  .alloc-row .sym{{font-weight:600}} .num{{text-align:right;font-variant-numeric:tabular-nums}}
  table{{width:100%;border-collapse:collapse;font-size:12.5px}}
  th{{text-align:left;color:var(--muted);font-weight:600;padding:8px 8px;border-bottom:1px solid var(--line);font-size:11px;
    text-transform:uppercase;letter-spacing:.03em;position:sticky;top:0;background:var(--panel)}}
  td{{padding:8px 8px;border-bottom:1px solid var(--line)}}
  .tbl-wrap{{max-height:520px;overflow:auto}}
  .disclaimer{{margin-top:24px;font-size:11px;color:var(--faint);line-height:1.6;border-top:1px solid var(--line);padding-top:16px}}
  .context{{border:1px solid rgba(155,140,255,.4);border-left:3px solid #9b8cff;background:linear-gradient(180deg,rgba(155,140,255,.05),transparent)}}
  .sbadge{{display:inline-block;font-size:11px;padding:3px 10px;border-radius:999px;background:rgba(155,140,255,.14);
    border:1px solid rgba(155,140,255,.35);color:#c4b8ff;margin-left:10px;vertical-align:middle;text-transform:none;letter-spacing:0;font-weight:600}}
  .factor{{display:flex;gap:12px;padding:11px 0;border-bottom:1px solid var(--line);font-size:13px;line-height:1.55;color:#cdd6e2}} .factor:last-child{{border-bottom:0}}
  .factor .fn{{flex:none;width:22px;height:22px;border-radius:6px;background:rgba(155,140,255,.18);color:#c4b8ff;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center}}
  .factor b{{color:var(--text)}}
  .stag{{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;padding:2px 7px;border-radius:5px;white-space:nowrap}}
  .s-bull{{background:rgba(63,214,138,.16);color:var(--green);border:1px solid rgba(63,214,138,.3)}}
  .s-const{{background:rgba(110,168,254,.14);color:var(--accent);border:1px solid rgba(110,168,254,.3)}}
  .s-mix{{background:rgba(245,196,81,.14);color:var(--gold);border:1px solid rgba(245,196,81,.3)}}
  .s-bear{{background:rgba(255,92,114,.16);color:#ff8a9b;border:1px solid rgba(255,92,114,.3)}}
  .s-spec{{background:rgba(155,140,255,.16);color:#c4b8ff;border:1px solid rgba(155,140,255,.35)}}
  .sh{{font-size:12px;font-weight:700;color:#c4b8ff;text-transform:uppercase;letter-spacing:.04em;margin:22px 0 10px}}
  .out{{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px}} @media(max-width:880px){{.out{{grid-template-columns:1fr}}}}
  .ocard{{border:1px solid var(--line);border-radius:12px;padding:13px 15px;background:var(--panel-2)}}
  .ocard h4{{margin:0 0 8px;font-size:13px;font-weight:650}}
  .ocard .ln{{font-size:12.5px;line-height:1.5;margin:0 0 6px;color:#cdd6e2;padding-left:16px;position:relative}}
  .ocard .up:before{{content:"\\25B2";position:absolute;left:0;color:var(--green);font-size:9px;top:3px}}
  .ocard .dn:before{{content:"\\25BC";position:absolute;left:0;color:var(--red);font-size:9px;top:3px}}
  .ocard .vd{{font-size:12px;color:var(--faint);margin:7px 0 0;padding-top:7px;border-top:1px solid var(--line)}}
</style></head><body>
<div id="app">
  <div class="topbar">
    <div class="brand"><div class="dot">R</div>
      <div><h1>Robinhood Portfolio</h1><div class="sub">Monitor &amp; advisory &middot; read-only &middot; live &middot; Jul 24, 2026 ~10:31am ET</div></div></div>
    <div class="whoami"><span class="pill">&#128274; Cloudflare Access</span>
      <a class="btn" href="/cdn-cgi/access/logout">Log out</a></div>
  </div>

  <div class="warn"><b>Leverage alert:</b> you're carrying about $62,185 in margin with buying power of -$185.02 &mdash; effectively maxed out. Reducing this is the top risk priority (see Suggested Moves).</div>

  <div class="grid kpis">
    <div class="card kpi"><div class="label">Stock Holdings (live)</div>
      <div class="value">{stock_mv}</div><div class="delta">{npos} positions &middot; intraday</div></div>
    <div class="card kpi"><div class="label">Unrealized Return</div>
      <div class="value neg">{unreal}</div>
      <div class="delta neg">{unrealpct} vs cost</div></div>
    <div class="card kpi"><div class="label">Net Account Value</div>
      <div class="value">{net}</div><div class="delta">after margin &amp; incl. crypto</div></div>
    <div class="card kpi"><div class="label">Margin / Buying Power</div>
      <div class="value neg">{marginval}</div><div class="delta neg">buying power {bpval}</div></div>
  </div>

  <div class="card today" style="margin-top:16px">
    <h2>Suggested Moves &mdash; Today (Jul 24)</h2>
    <div class="step"><div class="n">1</div><div class="body"><h3>Do the cleanup sells first</h3><p>Sell the decaying ETFs and dead-money positions in the cut-loss list below &mdash; about <b>{freed}</b> of stock. This is the lowest-regret cash in the account: nothing there is coming back, the proceeds pay straight down your margin, and you book tax losses to offset gains from anything you trim next. Start here before touching a single winner.</p></div></div>
    <div class="step"><div class="n">2</div><div class="body"><h3>Trim winners to rebuild a cushion</h3><p>Even after the cleanup you're still near maxed. Trimming roughly <b>$8&ndash;10k</b> off your biggest gainers &mdash; a slice of RKLB (+59%, $13k), PL (+324%), TSM (+163%), HOOD (+99%) &mdash; takes margin from ~$62k toward ~$47k and restores real buying power. Take some off the table; keep the position and the thesis.</p></div></div>
    <div class="step"><div class="n">3</div><div class="body"><h3>Leave PLTR and your core alone</h3><p>PLTR is down 24% (~$3,950) but it's your #2 holding and a name you clearly have conviction in &mdash; that's a temporary drawdown, not a loss to cut. Selling it now just locks the loss on a stock you'd want to own. Cut the dead weight, not the core.</p></div></div>
    <p style="font-size:11px;color:var(--faint);margin:12px 0 0">Order matters: dead weight before winners &mdash; same cash raised, far less regret, cleaner tax outcome. Live intraday prices as of ~10:31am ET Jul 24; figures move during the session.</p>
  </div>

  <div class="card" style="margin-top:16px">
    <h2>Cut your losses &mdash; where the money isn't coming back</h2>
    <p class="cut-note">These are down hard <b>and</b> structurally broken &mdash; income/leveraged ETFs that bleed by design, companies with impaired theses, or dust positions too small to matter. Clearing them frees <b>{freed}</b>, cuts your margin, and harvests tax losses. Separate from your <i>conviction</i> names that are just temporarily red (bottom group) &mdash; those aren't cuts.</p>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Symbol</th><th class="num">Mkt Value</th><th class="num">Unreal. %</th><th>Why cut</th><th></th></tr></thead>
      <tbody>{cut_body}</tbody>
    </table></div>
    <p style="font-size:11px;color:var(--faint);margin:12px 0 0">Analytical observations on your own positions, not personalized investment advice or buy/sell instructions. Trimming positions up 300%+ has tax consequences &mdash; run the actual sells past a licensed advisor or tax pro first.</p>
  </div>

  <div class="card" style="margin-top:16px">
    <h2>Suggested Moves &mdash; considerations for your review</h2>
    <div class="move"><div class="move-h"><span class="prio p-high">High</span><h3>Reduce margin &mdash; you have no cushion</h3></div><p>You're borrowing about $62,185 against roughly $102k of assets, and buying power is -$185.02 &mdash; essentially maxed. Leverage cuts both ways; with zero headroom a market dip could trigger a margin call and forced selling at the worst time. Trimming some positions to pay down the balance is the single highest-impact risk move here.</p></div><div class="move"><div class="move-h"><span class="prio p-high">High</span><h3>Two themes are ~70% of your stocks</h3></div><p>AI &amp; Semis ({ai}%) and Space &amp; Satellite ({space}%) together are ~70% of your equity, and your top 4 names (RKLB, PLTR, NVDA, NOW) are {top4}%. Fitting for a growth tilt, but the account now lives and dies on AI + space sentiment. Locking in some of the big winners below would both diversify and fund paying down margin.</p></div><div class="move"><div class="move-h"><span class="prio p-med">Medium</span><h3>Harvest some outsized winners</h3></div><p>PL is +324%, TSM +163%, HOOD +99%, RKLB +59%. Trimming a portion (not all) of these takes risk off the table, raises cash to cut margin, and keeps your thesis intact. Winners this size rarely stay this size.</p></div><div class="move"><div class="move-h"><span class="prio p-med">Medium</span><h3>23 positions are under $100</h3></div><p>One-share lots of META, TSLA, CVX, SHEL, RKT and ~18 others add tax and tracking complexity without meaningfully affecting returns. Consolidating or clearing these simplifies the account.</p></div><div class="move"><div class="move-h"><span class="prio p-med">Medium</span><h3>Leveraged / income ETFs decay</h3></div><p>NVDY, TSLY, MSTY, PLTY (YieldMax-style), NVDL (2x NVDA) and BITO carry high fees and erode in NAV over time. Fine to hold intentionally for income &mdash; just make sure you're not treating them as long-term growth compounders.</p></div><div class="move"><div class="move-h"><span class="prio p-low">Low</span><h3>Deep losers worth a fresh look</h3></div><p>VCX -80%, SPCE -74%, OKLO -69%, BITO -59%. Not a sell signal by itself &mdash; but revisit whether each thesis still holds. If any no longer do, harvesting the tax loss could offset gains from trimming winners.</p></div>
    <p style="font-size:11px;color:var(--faint);margin:12px 0 0">These are analytical observations, not personalized investment advice or buy/sell instructions. Run any significant move past a licensed financial advisor.</p>
  </div>
{sentiment}
  <div class="grid cols">
    <div class="card"><h2>Allocation by theme</h2>{tb}
      <p style="font-size:12px;color:var(--faint);margin:10px 0 0">AI + Space = <b style="color:var(--gold)">{aispace}%</b> of equity. Top 4 names = <b style="color:var(--gold)">{top4}%</b>.</p></div>
    <div class="card"><h2>Top 10 holdings</h2>{t10}</div>
  </div>

  <div class="grid cols3">
    <div class="card"><h2>Biggest winners</h2>{win}</div>
    <div class="card"><h2>Biggest losers</h2>{los}</div>
  </div>

  <div class="card" style="margin-top:16px">
    <h2>All holdings ({npos}) &mdash; by market value</h2>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Symbol</th><th class="num">Shares</th><th class="num">Avg Cost</th><th class="num">Price</th>
      <th class="num">Mkt Value</th><th class="num">Weight</th><th class="num">Unreal. $</th><th class="num">Unreal. %</th></tr></thead>
      <tbody>{tr}</tbody></table></div>
  </div>

  <div class="disclaimer">
    Live intraday snapshot as of approximately 10:31am ET on Jul 24, 2026, from your Robinhood main individual account (read-only via Robinhood's official Agentic Trading MCP). Prices are last-trade during the open session and move continuously; they may differ slightly from your app. This dashboard does not place trades. Nothing here is personalized investment advice or a recommendation to buy or sell any security; for major allocation decisions consult a licensed financial advisor. Values exclude your crypto holdings ($13,503) except where "Net Account Value" is shown. To refresh, re-run the data pull.
  </div>
</div>
</body></html>""".format(
    stock_mv=money(tot_mv), unreal=sgn(tot_pnl), unrealpct=pct(tot_pnlpct),
    net=money(net_account), freed=freed_txt, cut_body=cut_body,
    ai="%0.0f"%ai_pct, space="%0.0f"%space_pct, top4="%0.0f"%top4_pct,
    aispace="%0.0f"%(ai_pct+space_pct), tb=tb, t10=t10, win=win_html, los=los_html, tr=tr, sentiment=SENT,
    npos=npos, marginval=marginval, bpval=bptxt)

# make the snapshot timestamp reflect this run
HTML = HTML.replace("live &middot; Jul 24, 2026 ~10:31am ET", "live &middot; " + asof)
HTML = HTML.replace("as of ~10:31am ET Jul 24", "as of " + asof)
HTML = HTML.replace("approximately 10:31am ET on Jul 24, 2026", asof)
open("index.html","w").write(HTML)
print("rebuilt", len(HTML), "bytes; asof", asof)
