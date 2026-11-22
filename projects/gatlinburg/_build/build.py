#!/usr/bin/env python3
"""Generates the seven day pages for projects/gatlinburg/ from days.json (Plan B, photos,
map stops, kids notes) and planA.json (the timelines, extracted from index.html).
Run from anywhere: python3 _build/build.py. Hand-edit the day pages afterwards if you
want, but re-running this overwrites them, so put durable changes in the JSON."""
import json, os, re, urllib.parse, html

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
days = json.load(open(os.path.join(HERE, 'days.json')))
planA = json.load(open(os.path.join(HERE, 'planA.json')))
credits = json.load(open(os.path.join(HERE, 'credits.json')))
ratings = {k: v for k, v in json.load(open(os.path.join(HERE, 'ratings.json'))).items() if not k.startswith('_')}

order = sorted(k for k in days.keys() if k != 'bonus') + (['bonus'] if 'bonus' in days else [])

def rate_html(text):
    """A Google-rating pill if a known place name appears in the text (what + dest)."""
    t = html.unescape(re.sub('<[^>]+>', '', text)).lower()
    best = None
    for name, r in ratings.items():
        key = name.lower().replace('the ', '')
        if key in t and (best is None or len(name) > len(best[0])): best = (name, r)
    if not best: return ''
    name, r = best
    return ' <span class="rate" data-say="%s" title="Google rating, %s reviews">&#9733; %s<small>%s</small></span>' % (html.escape(r['say'], quote=True), '{:,}'.format(r['n']), r['r'], ('{:,}'.format(r['n']) if r['n'] < 1000 else str(round(r['n']/1000)) + 'k'))

def mapsdir(dest):
    if not dest: return ''
    return 'https://www.google.com/maps/dir/?api=1&destination=' + (dest if '%' in dest else urllib.parse.quote(dest))

def commons(name, width):
    return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + urllib.parse.quote(name) + '?width=%d' % width

def credit(name):
    c = credits.get(name, {})
    who = c.get('artist', 'Wikimedia Commons'); lic = c.get('lic', '')
    return html.escape(who) + (' · ' + html.escape(lic) if lic else '')

def slot_html(s, coords=None, idx=None):
    dest = s.get('dest', '')
    nav = ' <a class="nav" href="%s" target="_blank" rel="noopener">Directions</a>' % mapsdir(dest) if dest else ''
    addr = '<div class="addr">%s</div>' % s['addr'] if s.get('addr') else ''
    why = '<div class="why">%s</div>' % s['why'] if s.get('why') else ''
    rate = rate_html(s['what'] + ' ' + (s.get('addr') or '') + ' ' + urllib.parse.unquote(dest))
    attrs = ''
    dq = urllib.parse.unquote(dest)
    if dq and not re.match(r'^-?\d', dq):
        attrs += ' data-q="%s"' % html.escape(dq, quote=True)
    if coords is not None and s['what'] in coords:
        attrs += ' data-lat="%s" data-lng="%s" data-stop="%s"' % (coords[s['what']][0], coords[s['what']][1], html.escape(re.sub('<[^>]+>', '', s['what'])))
    return '<li class="slot"%s><time>%s</time><div><div class="what">%s%s%s</div>%s%s</div></li>' % (attrs, s['t'], s['what'], rate, nav, addr, why)

def page(date):
    d = days[date]; a = planA[date]
    i = order.index(date)
    prev_ = days[order[i-1]] if i > 0 else None
    next_ = days[order[i+1]] if i < len(order)-1 else None
    chips = ''.join('<a class="chip%s" href="%s">%s</a>' % (' on' if k == date else '', days[k]['file'], days[k]['short']) for k in order)
    route_pts = [[d['coords'][n][0], d['coords'][n][1], re.sub('<[^>]+>', '', n)] for n in d['route'] if n in d['coords']]
    routeB = d['planB'].get('routeB') or []
    slotsA = '\n'.join('        ' + slot_html(s, d['coords']) for s in a['slots'])
    slotsB = '\n'.join('        ' + slot_html(s) for s in d['planB']['slots'])
    callouts = '\n'.join('      <div class="callout sun"><h3>%s</h3>%s</div>' % (c['h'], c['body']) for c in a['callouts'])
    strip = '\n'.join('        <figure><img loading="lazy" src="%s" alt=""><figcaption>%s</figcaption></figure>' % (commons(n, 800), credit(n)) for n in d['strip'])
    kids = '\n'.join('        <li>%s</li>' % k for k in d['kids'])
    tag = '<span class="tag %s">%s</span>' % (a['tagcls'], a['tag']) if a['tag'] else ''
    title_plain = re.sub('<[^>]+>', '', a['title']).replace('&rarr;', '→').replace('&amp;', '&')
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0b1411">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
<title>{html.escape(title_plain)} — {d['name']} · Gatlinburg week</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="">
<link rel="stylesheet" href="site.css?v=12">
<script>try{{var t=localStorage.getItem("gatlinburg-2026-theme");if(t&&t!=="spruce")document.documentElement.setAttribute("data-theme",t)}}catch(e){{}}</script>
</head>
<body class="locked day-page" data-date="{date if date != 'bonus' else ''}" data-page="{date}">

<div id="gate">
  <form class="gate-box" id="gate-form" autocomplete="off">
    <span class="logo"><span class="logo-mark big" aria-hidden="true">&#x1F43B;</span></span>
    <h1>Gatlinburg week</h1>
    <p>Family page. Enter the PIN to open it.</p>
    <input id="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="12" aria-label="PIN" autofocus>
    <button type="submit">Open</button>
    <div class="err" id="gate-err"></div>
  </form>
</div>

<header>
  <div class="container nav">
    <a class="logo" href="index.html"><span class="logo-mark" aria-hidden="true">&#x1F43B;</span>Gatlinburg <span>week</span></a>
    <nav aria-label="Trip pages">
      <ul>
        <li><a href="index.html">Hub</a></li>
        {('<li><a href="%s">&larr; %s</a></li>' % (prev_['file'], prev_['short'])) if prev_ else ''}
        {('<li><a href="%s">%s &rarr;</a></li>' % (next_['file'], next_['short'])) if next_ else ''}
        <li><a href="#plan">Plan</a></li>
        <li><a href="#map">Map</a></li>
        <li><a href="trails.html">Trails</a></li>
        <li><a href="#journal">Journal</a></li>
      </ul>
    </nav>
  </div>
</header>

<div class="banner" style="background-image:url('{commons(d['banner'], 1400)}')">
  <div class="banner-shade"></div>
  <div class="container banner-text">
    <p class="kicker">{d['kicker']}</p>
    <h1>{a['title']}</h1>
    <p class="banner-date">{a['date']} {tag}</p>
  </div>
  <span class="credit">{credit(d['banner'])}</span>
</div>

<div class="chips container" aria-label="Days">{chips}<a class="chip" href="trails.html">Trails</a><a class="chip" href="fishing.html">Fishing</a><a class="chip" href="cabin.html">Cabin</a><a class="chip" href="bears.html">Bears</a></div>

<section class="daytop">
  <div class="container">
    <p class="lede">{d['lede']}</p>
    <dl class="facts facts-day">
      <div class="fact"><dt>Forecast</dt><dd id="day-wx">Loading&hellip;<small id="day-wx-ridge"></small></dd></div>
      <div class="fact"><dt>Right now</dt><dd id="now-temp">&mdash;<small id="now-clock"></small></dd></div>
      <div class="fact"><dt>Daylight</dt><dd id="daylight">7:30a &rarr; 5:25p<small id="dark-in"></small></dd></div>
      <div class="fact nap"><dt>Nap clock</dt><dd><span id="nap-text">Not started</span><small><button type="button" class="ghost" id="nap-btn">Start nap</button></small></dd></div>
    </dl>
  </div>
</section>

<section id="plan">
  <div class="container">
    <p class="eyebrow">The plan</p>
    <div class="plan-head">
      <h2 id="plan-title">Plan A</h2>
      <div class="plan-toggle" role="tablist">
        <button type="button" class="pt on" data-plan="a" role="tab">Plan A</button>
        <button type="button" class="pt" data-plan="b" role="tab">Plan B</button>
        <button type="button" class="ghost" id="copy-plan">Copy as text</button>
      </div>
    </div>
    <div class="plan" id="plan-a">
      {('<p class="day-note">%s</p>' % a['note']) if a.get('note') else ''}
      <ul class="slots" id="slots-a">
{slotsA}
      </ul>
{callouts}
    </div>
    <div class="plan" id="plan-b" hidden>
      <div class="callout water"><h3>{d['planB']['title']}</h3><p>{d['planB']['when']}</p></div>
      <ul class="slots" id="slots-b">
{slotsB}
      </ul>
    </div>
    <div class="bail">
      <h3>Bail-out: {d['bail']['name']}{rate_html(d['bail']['name'] + ' ' + d['bail']['dest'])} <a class="nav" href="{mapsdir(d['bail']['dest'])}" target="_blank" rel="noopener">Directions</a></h3>
      <p>{d['bail']['why']}</p>
    </div>
  </div>
</section>

<section id="map">
  <div class="container">
    <p class="eyebrow">The ground</p>
    <h2>Map</h2>
    <p class="intro">Stops for the plan you have selected. The solid line is the road route; it is drawn live from OpenStreetMap, so it needs signal. Tap a marker for directions.</p>
    <div id="leaflet" class="map" data-route='{json.dumps(route_pts)}' data-route-b='{json.dumps(routeB)}'></div>
  </div>
</section>

<section id="photos">
  <div class="container">
    <p class="eyebrow">What it looks like</p>
    <h2>The places</h2>
    <div class="strip">
{strip}
    </div>
  </div>
</section>

<section id="kids">
  <div class="container">
    <p class="eyebrow">Three cubs</p>
    <h2>Today, each of them</h2>
    <div class="kid">
      <ul>
{kids}
      </ul>
    </div>
  </div>
</section>

<section id="journal">
  <div class="container">
    <p class="eyebrow">Trip log</p>
    <h2>What actually happened</h2>
    <p class="intro">Notes stay on this phone. A line a day is plenty; it's what you'll read next November.</p>
    <textarea id="journal-text" rows="6" placeholder="Who saw the first bear, what the kids ate, what you'd change."></textarea>
    <div class="journal-bar"><span id="journal-saved"></span><button type="button" class="ghost" id="journal-copy">Copy</button></div>
  </div>
</section>

<footer>
  <div class="container">
    <div class="pager">
      {('<a href="%s">&larr; %s: %s</a>' % (prev_['file'], prev_['name'], re.sub('<[^>]+>', '', planA[order[i-1]]['title']))) if prev_ else '<span></span>'}
      <a href="index.html">Hub</a>
      {('<a href="%s">%s: %s &rarr;</a>' % (next_['file'], next_['name'], re.sub('<[^>]+>', '', planA[order[i+1]]['title']))) if next_ else '<span></span>'}
    </div>
    <p>Photos are from Wikimedia Commons under the licenses shown. Hours, prices and park roads change with the weather; check the hub's road status link each morning.</p>
  </div>
</footer>

<div class="bear-toast" id="bear-toast" role="status"></div>
<div class="bear-peek" id="bear-peek" aria-hidden="true">
  <svg viewBox="0 0 120 100"><g fill="#2b1d14"><ellipse cx="60" cy="78" rx="46" ry="30"/><circle cx="60" cy="44" r="30"/><circle cx="36" cy="22" r="11"/><circle cx="84" cy="22" r="11"/></g><g fill="#6b4a33"><circle cx="36" cy="22" r="5"/><circle cx="84" cy="22" r="5"/><ellipse cx="60" cy="56" rx="14" ry="10"/></g><g fill="#0b1411"><circle cx="48" cy="40" r="3.5"/><circle cx="72" cy="40" r="3.5"/><ellipse cx="60" cy="52" rx="6" ry="4"/></g><circle cx="49.5" cy="38.5" r="1.2" fill="#fff"/><circle cx="73.5" cy="38.5" r="1.2" fill="#fff"/></svg>
</div>
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="bear-side" viewBox="0 0 140 90"><g fill="#2b1d14"><ellipse cx="62" cy="50" rx="44" ry="26"/><circle cx="108" cy="36" r="18"/><circle cx="98" cy="22" r="6"/><circle cx="118" cy="22" r="6"/><circle cx="20" cy="50" r="12"/><rect x="30" y="62" width="12" height="26" rx="5"/><rect x="52" y="64" width="12" height="24" rx="5"/><rect x="78" y="64" width="12" height="24" rx="5"/><rect x="96" y="60" width="12" height="28" rx="5"/></g><g fill="#6b4a33"><ellipse cx="122" cy="42" rx="9" ry="6"/></g><circle cx="114" cy="33" r="2.5" fill="#0b1411"/><circle cx="129" cy="41" r="3" fill="#0b1411"/></symbol>
</svg>

<nav class="tabbar" aria-label="Quick links">
  <a href="index.html"><span>&#8962;</span>Hub</a>
  {('<a href="%s"><span>&larr;</span>%s</a>' % (prev_['file'], prev_['short'])) if prev_ else '<a href="trails.html"><span>&#9650;</span>Trails</a>'}
  <a href="#plan"><span>&#9776;</span>Plan</a>
  <a href="#map"><span>&#9673;</span>Map</a>
  {('<a href="%s"><span>&rarr;</span>%s</a>' % (next_['file'], next_['short'])) if next_ else '<a href="trails.html"><span>&#9650;</span>Trails</a>'}
</nav>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
<script src="site.js?v=10"></script>
<script src="day.js?v=7"></script>
<script src="photos.js?v=1" defer></script>
</body>
</html>
'''

if __name__ == '__main__':
    for date in order:
        out = os.path.join(ROOT, days[date]['file'])
        open(out, 'w').write(page(date))
        print('wrote', days[date]['file'])


# ---------------- Trails page ----------------
def trails_page():
    T = json.load(open(os.path.join(HERE, 'trails.json')))
    chips = ''.join('<a class="chip" href="%s">%s</a>' % (days[k]['file'], days[k]['short']) for k in order)
    cards = []
    pins = []
    for t in T['trails']:
        kid = '&#9679;' * t['kid'] + '<i>' + '&#9679;' * (5 - t['kid']) + '</i>'
        g = rate_html(t['g']) if t.get('g') else ''
        cards.append(f'''      <div class="trail" data-lat="{t['lat']}" data-lng="{t['lng']}" data-name="{html.escape(t['name'], quote=True)}" data-q="{html.escape(t['name'] + ' Great Smoky Mountains', quote=True)}">
        <div class="trail-photo" style="background-image:url('{commons(t['photo'], 480)}')"><span class="credit">{credit(t['photo'])}</span></div>
        <div class="trail-body">
          <h3>{t['name']}{g} <a class="nav" href="{mapsdir(t['dest'])}" target="_blank" rel="noopener">Directions</a></h3>
          <p class="meta">{t['area']} &middot; {t['drive']} from the cabin</p>
          <dl class="trail-facts">
            <div><dt>Round trip</dt><dd>{t['rt']}</dd></div>
            <div><dt>Climb</dt><dd>{t['gain']}</dd></div>
            <div><dt>Time</dt><dd>{t['time']}</dd></div>
            <div><dt>Underfoot</dt><dd>{t['surface']}</dd></div>
            <div><dt>Stroller</dt><dd>{t['stroller']}</dd></div>
            <div><dt>Restrooms</dt><dd>{t['restroom']}</dd></div>
          </dl>
          <p class="kidscore" title="Our score for ages 1 to 7 and grandparents">Kid and grandparent score <span>{kid}</span></p>
          <p>{t['why']}</p>
          <p class="when">Best slot: {t['day']}</p>
        </div>
      </div>''')
    skip = '\n'.join('        <tr><td>%s</td><td>%s</td></tr>' % (a, b) for a, b in T['not_this_trip'])
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0b1411">
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
<title>Trails the kids can do · Gatlinburg week</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="">
<link rel="stylesheet" href="site.css?v=12">
<script>try{{var t=localStorage.getItem("gatlinburg-2026-theme");if(t&&t!=="spruce")document.documentElement.setAttribute("data-theme",t)}}catch(e){{}}</script>
</head>
<body class="locked day-page trails-page" data-page="trails">

<div id="gate">
  <form class="gate-box" id="gate-form" autocomplete="off">
    <span class="logo"><span class="logo-mark big" aria-hidden="true">&#x1F43B;</span></span>
    <h1>Gatlinburg week</h1>
    <p>Family page. Enter the PIN to open it.</p>
    <input id="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="12" aria-label="PIN" autofocus>
    <button type="submit">Open</button>
    <div class="err" id="gate-err"></div>
  </form>
</div>

<header>
  <div class="container nav">
    <a class="logo" href="index.html"><span class="logo-mark" aria-hidden="true">&#x1F43B;</span>Gatlinburg <span>week</span></a>
    <nav aria-label="Trip pages">
      <ul>
        <li><a href="index.html">Hub</a></li>
        <li><a href="#list">Trails</a></li>
        <li><a href="#map">Map</a></li>
        <li><a href="#skip">Not this trip</a></li>
      </ul>
    </nav>
  </div>
</header>

<div class="banner" style="background-image:url('{commons('Little River Road - October 2025 - Sarah Stierch.jpg', 1400)}')">
  <div class="banner-shade"></div>
  <div class="container banner-text">
    <p class="kicker">Walks, not hikes</p>
    <h1>Trails the whole crew can do</h1>
    <p class="banner-date">Under five miles round trip, no sustained steep grades, for ages one to seven and knees over sixty</p>
  </div>
  <span class="credit">{credit('Little River Road - October 2025 - Sarah Stierch.jpg')}</span>
</div>

<div class="chips container" aria-label="Days">{chips}<a class="chip on" href="trails.html">Trails</a><a class="chip" href="fishing.html">Fishing</a><a class="chip" href="cabin.html">Cabin</a><a class="chip" href="bears.html">Bears</a></div>

<section class="daytop">
  <div class="container">
    <p class="lede">Every walk here was chosen with the slowest person in mind. The kid-and-grandparent score is ours: five dots means a two-year-old walks most of it and nobody's knees complain; two dots means it's worth it but somebody will be carried or will want to stop. Every one of these needs the $15 weekly parking tag on the dash. Pack the carrier; the stroller only works where it says so.</p>
  </div>
</section>

<section id="list">
  <div class="container">
    <p class="eyebrow">The list</p>
    <h2>Thirteen walks, easiest first</h2>
    <div class="trails">
{chr(10).join(cards)}
    </div>
  </div>
</section>

<section id="map">
  <div class="container">
    <p class="eyebrow">Where they are</p>
    <h2>Map</h2>
    <p class="intro">Tap a pin for the name and directions. The cabin side of the park is the top half; Cades Cove and Tremont are left; Kuwohi and Oconaluftee are down the middle.</p>
    <div id="leaflet" class="map" data-route="[]" data-route-b="[]"></div>
  </div>
</section>

<section id="skip">
  <div class="container">
    <p class="eyebrow">The bench</p>
    <h2>Famous, and not this trip</h2>
    <div class="table-wrap"><table class="numbers">
      <thead><tr><th>Trail</th><th>Why not</th></tr></thead>
      <tbody>
{skip}
      </tbody>
    </table></div>
  </div>
</section>

<footer>
  <div class="container">
    <div class="pager"><a href="index.html">&larr; Hub</a><span></span><a href="day-2-tue.html">Tuesday's walks &rarr;</a></div>
    <p>Distances and climbs are from park signage and trail guides and rounded. Photos from Wikimedia Commons under the licenses shown.</p>
  </div>
</footer>

<div class="bear-toast" id="bear-toast" role="status"></div>
<div class="bear-peek" id="bear-peek" aria-hidden="true"><svg viewBox="0 0 120 100"><g fill="#2b1d14"><ellipse cx="60" cy="78" rx="46" ry="30"/><circle cx="60" cy="44" r="30"/><circle cx="36" cy="22" r="11"/><circle cx="84" cy="22" r="11"/></g><g fill="#6b4a33"><circle cx="36" cy="22" r="5"/><circle cx="84" cy="22" r="5"/><ellipse cx="60" cy="56" rx="14" ry="10"/></g><g fill="#0b1411"><circle cx="48" cy="40" r="3.5"/><circle cx="72" cy="40" r="3.5"/><ellipse cx="60" cy="52" rx="6" ry="4"/></g></svg></div>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="bear-side" viewBox="0 0 140 90"><g fill="#2b1d14"><ellipse cx="62" cy="50" rx="44" ry="26"/><circle cx="108" cy="36" r="18"/><circle cx="98" cy="22" r="6"/><circle cx="118" cy="22" r="6"/><circle cx="20" cy="50" r="12"/><rect x="30" y="62" width="12" height="26" rx="5"/><rect x="52" y="64" width="12" height="24" rx="5"/><rect x="78" y="64" width="12" height="24" rx="5"/><rect x="96" y="60" width="12" height="28" rx="5"/></g><g fill="#6b4a33"><ellipse cx="122" cy="42" rx="9" ry="6"/></g><circle cx="114" cy="33" r="2.5" fill="#0b1411"/><circle cx="129" cy="41" r="3" fill="#0b1411"/></symbol></svg>

<nav class="tabbar" aria-label="Quick links">
  <a href="index.html"><span>&#8962;</span>Hub</a>
  <a href="#list"><span>&#9650;</span>Trails</a>
  <a href="#map"><span>&#9673;</span>Map</a>
  <a href="index.html#packing"><span>&#9745;</span>Pack</a>
  <a href="index.html#numbers"><span>&#9742;</span>Numbers</a>
</nav>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
<script src="site.js?v=10"></script>
<script src="day.js?v=7"></script>
<script src="photos.js?v=1" defer></script>
</body>
</html>
'''

if __name__ == '__main__':
    open(os.path.join(ROOT, 'trails.html'), 'w').write(trails_page())
    print('wrote trails.html')


# ---------------- Packing page (shared list) ----------------
def packing_page():
    P = json.load(open(os.path.join(HERE, 'packing.json')))
    chips = ''.join('<a class="chip" href="%s">%s</a>' % (days[k]['file'], days[k]['short']) for k in order)
    cats = []
    opts = []
    jumps = []
    for c in P['categories']:
        slug = re.sub(r'[^a-z0-9]+', '-', c['name'].lower()).strip('-')
        opts.append('<option value="%s">%s</option>' % (slug, c['name']))
        jumps.append('<a class="jump" href="#cat-%s" data-jump="%s">%s <b class="jump-count">0/%d</b></a>' % (slug, slug, c['name'], len(c['items'])))
        items = '\n'.join('          <li data-id="%s"><label><input type="checkbox"><span>%s%s%s<small class="by"></small></span></label></li>' % (
            it['id'], '<span class="star">&#9733;</span> ' if it['star'] else '', it['name'], ('<em>%s</em>' % it['why']) if it['why'] else '') for it in c['items'])
        cats.append('''      <div class="pack-cat" id="cat-%s" data-cat="%s">
        <h3>%s <span class="cat-count"></span></h3>
        <p class="who">%s</p>
        <ul>
%s
        </ul>
      </div>''' % (slug, slug, c['name'], c['who'], items))
    jumps.append('<a class="jump" href="#cat-extra" data-jump="extra">Added <b class="jump-count">0/0</b></a>')
    cats.append('''      <div class="pack-cat" id="cat-extra" data-cat="extra">
        <h3>Added on the way <span class="cat-count"></span></h3>
        <p class="who">Things somebody thought of after the list was made</p>
        <ul></ul>
      </div>''')
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0b1411">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
<title>Packing list · Gatlinburg week</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="site.css?v=12">
<script>try{{var t=localStorage.getItem("gatlinburg-2026-theme");if(t&&t!=="spruce")document.documentElement.setAttribute("data-theme",t)}}catch(e){{}}</script>
</head>
<body class="locked day-page packing-page" data-page="packing">

<div id="gate">
  <form class="gate-box" id="gate-form" autocomplete="off">
    <span class="logo"><span class="logo-mark big" aria-hidden="true">&#x1F43B;</span></span>
    <h1>Gatlinburg week</h1>
    <p>Family page. Enter the PIN to open it.</p>
    <input id="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="12" aria-label="PIN" autofocus>
    <button type="submit">Open</button>
    <div class="err" id="gate-err"></div>
  </form>
</div>

<header>
  <div class="container nav">
    <a class="logo" href="index.html"><span class="logo-mark" aria-hidden="true">&#x1F43B;</span>Gatlinburg <span>week</span></a>
    <nav aria-label="Trip pages">
      <ul>
        <li><a href="index.html">Hub</a></li>
        <li><a href="#grid">List</a></li>
        <li><a href="#add">Add</a></li>
        <li><a href="trails.html">Trails</a></li>
      </ul>
    </nav>
  </div>
</header>

<div class="banner" style="background-image:url('{commons('Little River Road - October 2025 - Sarah Stierch.jpg', 1400)}')">
  <div class="banner-shade"></div>
  <div class="container banner-text">
    <p class="kicker">One list, every phone</p>
    <h1>Packing list</h1>
    <p class="banner-date">Tick it on any phone and it's ticked on all of them. Shows who packed what.</p>
  </div>
  <span class="credit">{credit('Little River Road - October 2025 - Sarah Stierch.jpg')}</span>
</div>

<div class="chips container" aria-label="Pages">{chips}<a class="chip" href="trails.html">Trails</a><a class="chip" href="fishing.html">Fishing</a><a class="chip" href="cabin.html">Cabin</a><a class="chip" href="bears.html">Bears</a><a class="chip on" href="packing.html">Packing</a></div>

<section id="list">
  <div class="container">
    <p class="eyebrow">Pack-out</p>
    <h2>Tick as you load</h2>
    <p class="intro"><span class="star">&#9733;</span> marks the things that are hard or expensive to replace once you're up there. The list is shared: Allison ticks the baby bag, you tick the car, and both phones show both. Add anything missing at the bottom.</p>

    <nav class="jumps" aria-label="Lists">{''.join(jumps)}</nav>

    <div class="pack-bar">
      <span class="hint">Packed <output id="count">0</output> of <span id="total">0</span> &middot; <span id="sync-status" class="sync">Loading&hellip;</span></span>
      <button class="ghost" type="button" id="name-btn">Who's packing?</button>
      <button class="ghost" type="button" id="clear">Untick all</button>
      <button class="ghost" type="button" id="print">Print</button>
    </div>

    <div class="pack-grid" id="grid">
{chr(10).join(cats)}
    </div>
  </div>
</section>

<section id="add">
  <div class="container">
    <p class="eyebrow">Forgot something?</p>
    <h2>Add an item</h2>
    <form class="add-form" id="add-form">
      <input id="add-name" type="text" maxlength="80" placeholder="Slavik's rain boots" aria-label="Item" required>
      <select id="add-cat" aria-label="Category">{''.join(opts)}<option value="extra" selected>Added on the way</option></select>
      <button type="submit" class="go">Add for everyone</button>
    </form>
  </div>
</section>

<footer>
  <div class="container">
    <div class="pager"><a href="index.html">&larr; Hub</a><span></span><a href="day-0-sun.html">Sunday's drive &rarr;</a></div>
    <p>Ticks are stored on the trip's own server and shared with everyone who has the PIN. If a phone is offline, its ticks wait and sync when signal returns.</p>
  </div>
</footer>

<div class="bear-toast" id="bear-toast" role="status"></div>
<div class="bear-peek" id="bear-peek" aria-hidden="true"><svg viewBox="0 0 120 100"><g fill="#2b1d14"><ellipse cx="60" cy="78" rx="46" ry="30"/><circle cx="60" cy="44" r="30"/><circle cx="36" cy="22" r="11"/><circle cx="84" cy="22" r="11"/></g><g fill="#6b4a33"><circle cx="36" cy="22" r="5"/><circle cx="84" cy="22" r="5"/><ellipse cx="60" cy="56" rx="14" ry="10"/></g><g fill="#0b1411"><circle cx="48" cy="40" r="3.5"/><circle cx="72" cy="40" r="3.5"/><ellipse cx="60" cy="52" rx="6" ry="4"/></g></svg></div>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="bear-side" viewBox="0 0 140 90"><g fill="#2b1d14"><ellipse cx="62" cy="50" rx="44" ry="26"/><circle cx="108" cy="36" r="18"/><circle cx="98" cy="22" r="6"/><circle cx="118" cy="22" r="6"/><circle cx="20" cy="50" r="12"/><rect x="30" y="62" width="12" height="26" rx="5"/><rect x="52" y="64" width="12" height="24" rx="5"/><rect x="78" y="64" width="12" height="24" rx="5"/><rect x="96" y="60" width="12" height="28" rx="5"/></g><g fill="#6b4a33"><ellipse cx="122" cy="42" rx="9" ry="6"/></g><circle cx="114" cy="33" r="2.5" fill="#0b1411"/><circle cx="129" cy="41" r="3" fill="#0b1411"/></symbol></svg>

<nav class="tabbar" aria-label="Quick links">
  <a href="index.html"><span>&#8962;</span>Hub</a>
  <a href="#grid"><span>&#9745;</span>List</a>
  <a href="#add"><span>&#43;</span>Add</a>
  <a href="trails.html"><span>&#9650;</span>Trails</a>
  <a href="index.html#numbers"><span>&#9742;</span>Numbers</a>
</nav>

<script src="site.js?v=10"></script>
<script src="packing.js?v=3"></script>
</body>
</html>
'''

if __name__ == '__main__':
    open(os.path.join(ROOT, 'packing.html'), 'w').write(packing_page())
    print('wrote packing.html')
