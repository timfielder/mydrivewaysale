#!/usr/bin/env python3
"""Check the city topic templates against every live city topic page (100 cities x 10 topics).
Live snapshots: /tmp/livearts/ct/<city>-<suffix>.html (fetched 2026-11-17; not committed, 55 MB).
Expected = live page through the same cleanups as port-live-pages.py; got = template filled with
the city's live data (cities.json "original"), exactly as src/lib/live-pages.mjs fills it."""
import sys, json, re, pathlib, importlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
p = importlib.import_module('port-live-pages')
hub = p.hub
SNAPDIR = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/livearts/ct')
esc = lambda s: str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')
cities = json.load(open(hub.ROOT / 'data' / 'cities.json'))
bad = 0
for c in cities:
    o = c['original']
    base = c['slug'][:-len('guide')]
    vals = {'CITY': esc(o['city_name']), 'ST': esc(o['state_code']), 'DIALECT': esc(o['sale_dialect']),
            'BEST': esc(o['best_weekends']), 'COUNTY': esc(o['county']), 'REGION': esc(o['region']),
            'SLUGBASE': base, 'PERMIT_LINK': '%%PERMIT_LINK%%', 'FOOTER': '%%FOOTER%%'}
    for suffix in p.CITY_TOPICS:
        tpl = (hub.ROOT / 'src' / 'live' / 'city-topics' / f'{suffix}.html').read_text()
        got = re.sub(r'%%([A-Z_]+)%%', lambda m: vals[m.group(1)], tpl)
        _, _, b = hub.body_of(SNAPDIR / f'{base}{suffix}.html')
        exp = p.link_city_topic(hub.clean(p.strip_ads(b)), base).replace('%%SLUGBASE%%', base)
        exp = p.permit_tail(exp, '%%PERMIT_LINK%%')
        got, exp = (re.sub(r'pseo_[0-9a-f]{13}', 'pseo_ID', x) for x in (got, exp))  # live uniqid() per render
        if got != exp:
            bad += 1
            i = next(k for k in range(min(len(got), len(exp))) if got[k] != exp[k])
            print('DIFF', base + suffix, repr(exp[i - 80:i + 80]), '|||', repr(got[i - 80:i + 80]))
print(f'{len(cities) * len(p.CITY_TOPICS) - bad} of {len(cities) * len(p.CITY_TOPICS)} city topic pages match live byte for byte')
sys.exit(1 if bad else 0)
