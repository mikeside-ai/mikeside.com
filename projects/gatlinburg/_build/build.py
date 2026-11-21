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

order = sorted(days.keys())

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
    attrs = ''
    if coords is not None and s['what'] in coords:
        attrs = ' data-lat="%s" data-lng="%s" data-stop="%s"' % (coords[s['what']][0], coords[s['what']][1], html.escape(re.sub('<[^>]+>', '', s['what'])))
    return '<li class="slot"%s><time>%s</time><div><div class="what">%s%s</div>%s%s</div></li>' % (attrs, s['t'], s['what'], nav, addr, why)

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
<title>{html.escape(title_plain)} — {d['name']}, {a['date'].split(', ')[-1]} · Gatlinburg week</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="">
<link rel="stylesheet" href="site.css?v=3">
</head>
<body class="locked day-page" data-date="{date}">

<div id="gate">
  <form class="gate-box" id="gate-form" autocomplete="off">
    <span class="logo">mike<span>side</span></span>
    <h1>Gatlinburg week</h1>
    <p>Family page. Enter the PIN to open it.</p>
    <input id="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="12" aria-label="PIN" autofocus>
    <button type="submit">Open</button>
    <div class="err" id="gate-err"></div>
  </form>
</div>

<header>
  <div class="container nav">
    <a class="logo" href="/">mike<span>side</span></a>
    <nav aria-label="Trip pages">
      <ul>
        <li><a href="index.html">Hub</a></li>
        {('<li><a href="%s">&larr; %s</a></li>' % (prev_['file'], prev_['short'])) if prev_ else ''}
        {('<li><a href="%s">%s &rarr;</a></li>' % (next_['file'], next_['short'])) if next_ else ''}
        <li><a href="#plan">Plan</a></li>
        <li><a href="#map">Map</a></li>
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

<div class="chips container" aria-label="Days">{chips}</div>

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
      <h3>Bail-out: {d['bail']['name']} <a class="nav" href="{mapsdir(d['bail']['dest'])}" target="_blank" rel="noopener">Directions</a></h3>
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

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
<script src="site.js?v=3"></script>
<script src="day.js?v=3"></script>
</body>
</html>
'''

for date in order:
    out = os.path.join(ROOT, days[date]['file'])
    open(out, 'w').write(page(date))
    print('wrote', days[date]['file'])
