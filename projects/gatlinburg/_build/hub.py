#!/usr/bin/env python3
"""Regenerates the day cards inside index.html from planA.json + days.json (so the hub and the
day pages share one source), adds the bonus card, photo thumbnails, and rating pills.
Everything outside the cards is left alone. Run after build.py."""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import build  # reuse slot_html, rate_html, commons, credit, order, days, planA

p = os.path.join(ROOT, 'index.html'); s = open(p).read()

def card(key):
    d = build.days[key]; a = build.planA[key]
    date = key if key != 'bonus' else 'bonus'
    plan = {'2026-11-23':'oldmill','2026-11-24':'anakeesta','2026-11-25':'cades-cove','2026-11-26':'thanksgiving','2026-11-27':'kuwohi','bonus':'dollywood'}.get(key)
    plan_attr = ' data-plan="%s"' % plan if plan else ''
    tag = '<span class="tag %s">%s</span>' % (a['tagcls'], a['tag']) if a['tag'] else ''
    photo = '<a class="day-photo" href="%s" style="background-image:url(\'%s\')" aria-label="Open %s"></a>' % (d['file'], build.commons(d['banner'], 480), d['name'])
    slots = '\n'.join('        ' + build.slot_html(x) for x in a['slots'])
    callouts = '\n'.join('      <div class="callout sun">\n        <h3>%s</h3>%s\n      </div>' % (c['h'], c['body']) for c in a['callouts'])
    note = '      <p class="day-note">%s</p>\n' % a['note'] if a.get('note') else ''
    return ('<div class="day" data-date="%s"%s>\n      %s<div class="day-head"><h3>%s</h3><span class="day-date">%s</span>%s</div>\n%s      <ul class="slots">\n%s\n      </ul>\n      <a class="day-link" href="%s">Open %s: map, photos, Plan B &rarr;</a>\n%s\n    </div>\n'
            % (date, plan_attr, photo, a['title'], a['date'], tag, note, slots, d['file'], d['name'], callouts)).replace('\n\n    </div>', '\n    </div>')

n = 0
for key in build.order:
    if key == 'bonus': continue
    m = re.search(r'<div class="day" data-date="' + key + r'"[^>]*>.*?\n    </div>\n', s, re.S)
    assert m, key
    s = s[:m.start()] + card(key) + s[m.end():]; n += 1
# bonus card: after the Saturday card, inside #days
if 'data-date="bonus"' not in s:
    m = re.search(r'(<div class="day" data-date="2026-11-28"[^>]*>.*?\n    </div>\n)', s, re.S)
    s = s[:m.end()] + '\n    ' + card('bonus') + s[m.end():]
else:
    m = re.search(r'<div class="day" data-date="bonus"[^>]*>.*?\n    </div>\n', s, re.S)
    s = s[:m.start()] + card('bonus') + s[m.end():]
print('cards rebuilt:', n, '+ bonus')

# rating pills in the numbers table (first cell = place)
def table_rate(m):
    place = m.group(1)
    r = build.rate_html(place)
    return '<tr><td>%s%s</td>' % (place, r)
s, c = re.subn(r'<tr><td>([^<]+)</td>', table_rate, s)
print('table rows checked:', c)
open(p, 'w').write(s)
