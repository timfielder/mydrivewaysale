#!/usr/bin/env python3
"""Turn live WordPress snapshots of the article, topic guide and legal pages into build templates.

Input (saved from https://mydrivewaysale.net on 2026-11-17):
  _import/live-2026-11-17/pages/<slug>.html          national pages (WP pages 543..1073, 123, 137, 146)
  _import/live-2026-11-17/city-topics/austin-tx-garage-sale-<suffix>.html
      the same 10 articles as the live pSEO router serves them for a city (snippet 05:
      /<city>-<suffix>/ -> article page with city_slug, [pseo field=...] filled from the city data)
Output:
  src/live/pages/<slug>.html        body markup (%%FOOTER%% = MasterFooter)
  src/live/city-topics/<suffix>.html body markup with %%TOKENS%% filled per city by src/lib/live-pages.mjs
  src/live/pages-meta.json          per page: WP id, body class, stylesheet list, head css file
  public/_live/<slug>-head.css      live inline <head> styles of that page

Same cleanups as scripts/port-live-hub.py (shared clean()): ads removed, WP/Elementor runtime
scripts removed, the page's own inline scripts kept verbatim, [INSERT_...] hrefs dropped,
/wp-admin/stickercalc-app -> /stickercalc-app/, em/en dashes in visible copy -> " - ".
Links (approved item 31, valid internal links):
  - router suffix links (/liability/, /app/, ...) on national pages -> same ENDPOINT_PATH map as /hub/
  - /guide/#x (national pages, 404 on live) -> unlinked
  - /house-guide/#x (live serves the hub template there) -> /hub/#x
  - /home (live 301 to /) -> /
  - city pages: /<city>-<suffix>/ links to the 10 built articles stay at the live city URL;
    other suffixes as on the city guides (port-live-hub.py).
Re-run: python3 scripts/port-live-pages.py
"""
import re, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import importlib
hub = importlib.import_module('port-live-hub')

ROOT = hub.ROOT
SNAP = ROOT / '_import' / 'live-2026-11-17'
OUT = ROOT / 'src' / 'live'

NATIONAL = ['animal-protocol', 'driveway-liability-checklist', 'attractive-nuisance-warning', 'multifamily-sales',
            'the-host-comfort-survival-kit', 'the-weather-rain-pivot-plan', 'local-best-weekends-data',
            'local_regulations_guide', 'house-security-lockdown', 'the-ultimate-color-sticker-pricing-strategy',
            'the-pricing-and-appriasal-protocol', 'privacy-policy', 'terms-of-service', 'about-contact',
            'stickercalc-web', 'stickercalc-app']  # StickerCalc pages 328 (App Wrapper snippet 13, iframe /app/) and 251
# Router suffix -> article (snippet 05). local-regulations points at a page slug that does not exist
# on live (local-regulations-guide vs local_regulations_guide), so it 404s there and is not built.
CITY_TOPICS = {s: p.strip('/') for s, p in hub.ENDPOINT_PATH.items() if p not in ('/stickercalc-web/', '/stickercalc-app/')}


def head_assets(head):
    css = []
    for m in re.finditer(r"<link rel='stylesheet' id='([^']*)' href='([^']*)'[^>]*media='([^']*)'", head):
        href = m.group(2)
        if 'fonts.googleapis.com' in href:
            continue
        path = re.sub(r'\?.*$', '', href.replace('https://mydrivewaysale.net/wp-content/', ''))
        css.append([path, m.group(3)])
    inline = ''.join(m.group(1) for m in re.finditer(r'<style id="(?:global-styles|elementor-frontend|wp-img-auto-sizes-contain|wp-emoji-styles)-inline-css">(.*?)</style>', head, re.S))
    return css, re.sub(r'/\*# sourceURL=[^*]*\*/', '', inline)


AD_WRAP = re.compile(r'<div class="(pseo-ad-[a-z-]+|ad-anchor-container|[a-z-]*multiplex[a-z-]*)"')


def strip_ads(b):
    """Article pages carry their ad boxes inline in text widgets (snippets 16/19/20 output).
    Remove the whole box around each <ins class="adsbygoogle"> (ads are off, like /hub/)."""
    while True:
        i = b.find('<ins class="adsbygoogle"')
        if i < 0:
            return b
        start = None
        for d in reversed(list(re.finditer(r'<div\b[^>]*>', b[:i]))):
            if hub.balanced_div_end(b, d.start()) > i and AD_WRAP.match(d.group(0)):
                start = d.start()
                break
        assert start is not None, b[i - 300:i]
        AD_CLASSES.add(AD_WRAP.match(b[start:]).group(1))
        b = b[:start] + b[hub.balanced_div_end(b, start):]


AD_CLASSES = set()


def link_national(b):
    b = hub.strip_unbuilt(hub.link_hub(b))
    b = re.sub(r'\s*href="/guide/(#[^"]*)?"', '', b)
    b = re.sub(r'href="/house-guide/(#[^"]*)?"', r'href="/hub/\1"', b)
    b = b.replace('href="/home"', 'href="/"')
    # StickerCalc App "Back to the Local Guide": live /stickercalc-guide/ is the router serving the
    # empty hub template (page 392, canonical /hub/), so it goes to /hub/.
    b = b.replace('href="/stickercalc-guide/"', 'href="/hub/"')
    return b


def link_city_topic(b, prefix):
    def rep(m):
        ep, frag = m.group(1), m.group(2) or ''
        if ep == 'guide':
            return f'href="/%%SLUGBASE%%guide/{frag}"'
        if ep in CITY_TOPICS:
            return f'href="/%%SLUGBASE%%{ep}/{frag}"'
        if ep in hub.ENDPOINT_PATH:
            return f'href="{hub.ENDPOINT_PATH[ep]}{frag}"'
        assert ep in hub.UNBUILT, ep
        return 'data-live-href="unbuilt"'
    b = re.sub(r'href="/' + re.escape(prefix) + r'([a-z0-9-]+)/(#[^"]*)?"', rep, b)
    b = b.replace('href="/home"', 'href="/"')
    return hub.strip_unbuilt(b)


def tokenize_topic(b):
    subs = [('Spring and Fall (March-May, October-November)', '%%BEST%%')]
    for a, t in subs:
        b = b.replace(a, t)
    b = b.replace('Travis', '%%COUNTY%%')
    b = re.sub(r'\bAustin\b', '%%CITY%%', b)
    b = re.sub(r'\bTX\b', '%%ST%%', b)
    b = re.sub(r'\bTexas\b', '%%REGION%%', b)
    b = b.replace('Garage Sale', '%%DIALECT%%')
    # Live bug kept as is: the color sticker page prints a raw <a href=...> as visible text with
    # the city's app URL in it.
    b = b.replace('austin-tx-garage-sale-', '%%SLUGBASE%%')
    return permit_tail(b, '%%PERMIT_LINK%%')


# Multi-family: live prints "[permit_link]+garage+sale+permit"]" (broken shortcode tail, same bug as
# the city guide permit button, approved item 3). City pages: the permit link the city guide button
# uses. National page (no city): the broken tail is dropped.
PERMIT_TAIL = re.compile(r' at (\S*?)\+garage\+sale\+permit&#8221;\]\.')


def permit_tail(b, repl):
    return PERMIT_TAIL.sub((' at ' + repl + '.') if repl else '.', b)


def check(name, s):
    vis = re.sub(r'<script.*?</script>', '', s, flags=re.S)
    for bad in ('adsbygoogle', '[INSERT_', '/wp-admin', '\u2014', '\u2013', '[pseo'):
        assert bad not in vis, (name, bad)


def main():
    (OUT / 'pages').mkdir(parents=True, exist_ok=True)
    (OUT / 'city-topics').mkdir(parents=True, exist_ok=True)
    meta = {}
    for slug in NATIONAL:
        head, body_class, b = hub.body_of(SNAP / 'pages' / f'{slug}.html')
        wp_id = re.search(r'page-id-(\d+)', body_class).group(1)
        css, inline = head_assets(head)
        out = permit_tail(link_national(hub.clean(strip_ads(b))), '')
        check(slug, out)
        (OUT / 'pages' / f'{slug}.html').write_text(out)
        (ROOT / 'public' / '_live' / f'{slug}-head.css').write_text(inline)
        meta[slug] = {'wp_id': wp_id, 'body_class': body_class, 'css': css, 'head_css': f'/_live/{slug}-head.css'}
    for suffix, slug in CITY_TOPICS.items():
        f = SNAP / 'city-topics' / f'austin-tx-garage-sale-{suffix}.html'
        _, body_class, b = hub.body_of(f)
        assert body_class == meta[slug]['body_class'], suffix
        out = tokenize_topic(link_city_topic(hub.clean(strip_ads(b)), 'austin-tx-garage-sale-'))
        check(suffix, out)
        (OUT / 'city-topics' / f'{suffix}.html').write_text(out)
    print('ad boxes removed:', sorted(AD_CLASSES))
    (OUT / 'pages-meta.json').write_text(json.dumps({'pages': meta, 'city_topics': CITY_TOPICS}, indent=1))
    for suffix in CITY_TOPICS:
        t = (OUT / 'city-topics' / f'{suffix}.html').read_text()
        print(suffix, sorted(set(re.findall(r'%%[A-Z_]+%%', t))))


if __name__ == '__main__':
    main()
