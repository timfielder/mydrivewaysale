#!/usr/bin/env python3
"""Turn live WordPress snapshots of the hub template (page 392) into build templates.

Input (saved from https://mydrivewaysale.net on 2026-11-17):
  _import/live-2026-11-17/austin-tx-garage-sale-guide.html  (a city URL the pSEO router sends to page 392)
  _import/live-2026-11-17/hub.html                            (/hub/ itself, no city)
Output:
  src/live/city-guide.html  body markup with %%TOKENS%% filled per city by src/lib/live-hub.mjs
  src/live/hub.html         body markup for /hub/
  public/_live/hub-head.css live inline <head> styles (WP global styles, Elementor inline CSS),
                            linked as a file instead of inline

Changes from live, all from approved items or ads being off (see the progress log):
  - AdSense markup removed (ads are off until Tim's account is approved; slots were placeholders).
  - WordPress/Elementor runtime scripts removed; the page's own inline scripts are kept verbatim.
  - City topic links: router suffix -> the national page that exists in this build; suffixes that
    404 on live are left as unlinked text (approved item 31). /wp-admin/stickercalc-app -> /stickercalc-app/.
  - [INSERT_..._AFFILIATE_LINK] placeholder hrefs are dropped (text kept) until Tim supplies real links.
  - Stray "] after the cross-posting list removed (approved item 5); &#038; in URLs written as &amp;.
  - Em dashes in visible copy become " - " (site rule; check-dist bans them).
  - Footer shortcode output is replaced by %%FOOTER%% (rendered by MasterFooter.astro, same markup).
Re-run: python3 scripts/port-live-hub.py
"""
import re, json, html, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SNAP = ROOT / '_import' / 'live-2026-11-17'
OUT = ROOT / 'src' / 'live'

# Router suffix (snippet 05) -> path in this build. None = no page yet (live 404) -> unlinked.
ENDPOINT_PATH = {
    'calculator': '/stickercalc-web/', 'app': '/stickercalc-app/', 'bundle-calculator': '/stickercalc-app/',
    'beamme-app': '/stickercalc-app/',  # live: city -beamme-app serves the StickerCalc App page
    'liability': '/driveway-liability-checklist/', 'nuisance': '/attractive-nuisance-warning/',
    'dogs': '/animal-protocol/', 'multi-family': '/multifamily-sales/',
    'weather-plan': '/the-weather-rain-pivot-plan/', 'security-lockdown': '/house-security-lockdown/',
    'host-comfort': '/the-host-comfort-survival-kit/', 'best-weekends': '/local-best-weekends-data/',
    'color-sticker-pricing': '/the-ultimate-color-sticker-pricing-strategy/',
    'pricing-appraisal': '/the-pricing-and-appriasal-protocol/',
}
UNBUILT = ['local-regulations', 'apparel-display', 'item-presentation', 'digital-listings', 'photo-strategy',
           'sign-font-size', 'signage-gear', 'mobile-payments', 'scam-defense', 'distraction-play', 'sticker-swap',
           'lowball-scripts', 'no-haggle-items', 'curbside-clearance', 'donation-tax-writeoff']
KEEP_SCRIPT = ('onSkipLinkClick', 'pseo-scroll-tracker', 'official-permit-btn', 'mds_lead_secure', 'open-menu')


def balanced_div_end(s, start):
    """Index just past the </div> that closes the <div at start."""
    depth, i = 0, start
    for m in re.compile(r'<div\b|</div>').finditer(s, start):
        depth += 1 if m.group(0) == '<div' else -1
        if depth == 0:
            return m.end()
    raise ValueError('unbalanced div')


def body_of(path):
    raw = path.read_text()
    head = raw[:raw.find('<body')]
    b = raw[raw.find('<body'):]
    body_class = re.match(r'<body class="([^"]*)"', b).group(1)
    b = b[b.find('>') + 1:b.rfind('</body>')]
    return head, body_class, b


def clean(b):
    # Scripts: keep the page's own behavior scripts, drop WordPress/Elementor/Google runtime.
    def script(m):
        attrs, inner = m.group(1), m.group(2)
        if 'src=' in attrs or 'speculationrules' in attrs or 'application/json' in attrs or 'module' in attrs:
            return ''
        if 'adsbygoogle' in inner:
            return ''
        return m.group(0) if any(k in inner for k in KEEP_SCRIPT + ('pseo-footer-submit',)) else ''
    b = re.sub(r'<script([^>]*)>(.*?)</script>', script, b, flags=re.S)
    # AdSense: header bottom anchor and every ad container.
    b = re.sub(r'\s*<!-- Isolated High-Yield Bottom Anchor Ad Layout\[cite: 1\] -->', '', b)
    while True:
        i = b.find('<ins class="adsbygoogle"')
        if i < 0:
            break
        anchor = b.rfind('<div class="ad-anchor-container"', 0, i)
        sc = b.rfind('<div class="elementor-shortcode">', 0, i)
        if anchor > sc:
            b = b[:anchor] + b[balanced_div_end(b, anchor):]
        else:
            inner = sc + len('<div class="elementor-shortcode">')
            first = b.find('<div', inner)
            b = b[:first] + b[balanced_div_end(b, first):]
    b = b.replace('https://mydrivewaysale.net/', '/')
    b = b.replace('&#038;', '&amp;')  # same URL, the encoding the build check parses
    # Stray "] after the cross-posting list (nested shortcode leftover on live; approved item 5).
    b = re.sub(r'(padding-left: 12px;">\s*[^<]*?)"\]', r'\1', b)
    b = b.replace('href="/wp-admin/stickercalc-app"', 'href="/stickercalc-app/"')
    b = re.sub(r'\s*href="\[INSERT_[A-Z0-9_]+\]"', '', b)
    # Em/en dashes in visible text (outside scripts) -> " - ".
    parts = re.split(r'(<script.*?</script>)', b, flags=re.S)
    parts = [p if p.startswith('<script') else re.sub(r'\s*[\u2013\u2014]\s*', ' - ', p) for p in parts]
    b = ''.join(parts)
    # Footer shortcode output -> %%FOOTER%%.
    i = b.find('<div class="pseo-footer-wrap">')
    sc = b.rfind('<div class="elementor-shortcode">', 0, i) + len('<div class="elementor-shortcode">')
    sc_open = sc - len('<div class="elementor-shortcode">')
    sc_close = balanced_div_end(b, sc_open) - len('</div>')
    b = b[:sc] + '%%FOOTER%%' + b[sc_close:]
    return b


def link_city(b, prefix):
    def rep(m):
        ep = m.group(1)
        if ep in ENDPOINT_PATH:
            return f'href="{ENDPOINT_PATH[ep]}"'
        assert ep in UNBUILT, ep
        return 'data-live-href="unbuilt"'
    return re.sub(r'href="/' + re.escape(prefix) + r'([a-z0-9-]+)/"', rep, b)


def link_hub(b):
    def rep(m):
        ep = m.group(1)
        if ep in ENDPOINT_PATH:
            return f'href="{ENDPOINT_PATH[ep]}"'
        if ep in UNBUILT:
            return 'data-live-href="unbuilt"'
        return m.group(0)
    return re.sub(r'href="/([a-z0-9-]+)/"', rep, b)


def strip_unbuilt(b):
    return re.sub(r'\s*data-live-href="unbuilt"', '', b)


def tokenize_city(b):
    """Austin values -> tokens. Order matters: specific spots first, then the plain fields."""
    subs = [
        # Step 01 permit answer, cards and outbound button (law fields: item 2 wording applies).
        ('The short answer is <strong>No</strong>.', '%%PERMIT_SENTENCE%%'),
        ('href="+garage+sale+permit&#039;]"', 'href="%%PERMIT_HREF%%"'),
        ("attempted_url: ''", "attempted_url: '%%JS_PERMIT_URL%%'"),
        ("city: 'Austin'", "city: '%%JS_CITY%%'"),
        ("state: 'TX'", "state: '%%JS_ST%%'"),
        ('Permitted only on the property where the sale is held. Prohibited on public right-of-ways and utility poles.', '%%SIGNAGE%%'),
        ('Spring and Fall (March-May, October-November)', '%%BEST%%'),
        ('Craigslist Austin, Nextdoor Travis County, Austin Yard/Garage Sale Facebook Groups', '%%CROSSPOST%%'),
    ]
    for a, t in subs:
        n = b.count(a)
        assert n >= 1, a
        b = b.replace(a, t)
    # Source/date line for checked law fields goes right after the intro paragraph.
    i = b.find('</p>', b.find('%%PERMIT_SENTENCE%%')) + len('</p>')
    b = b[:i] + '%%CHECKED%%' + b[i:]
    # Permit and fee cards: the value div right after each label.
    for label, tok in (('Permit Required?', '%%PERMIT_CARD%%'), ('Estimated Fee', '%%FEE_CARD%%')):
        b, n = re.subn(r'(' + re.escape(label) + r'</span>\s*<div[^>]*>)[^<]*(</div>)', r'\g<1>' + tok + r'\g<2>', b, count=1)
        assert n == 1, label
    b = b.replace('Travis', '%%COUNTY%%')
    b = re.sub(r'\bAustin\b', '%%CITY%%', b)
    b = re.sub(r'\bTX\b', '%%ST%%', b)
    b = re.sub(r'\bTexas\b', '%%REGION%%', b)
    b = b.replace('Garage Sale', '%%DIALECT%%')
    return b


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    head, body_class, b = body_of(SNAP / 'austin-tx-garage-sale-guide.html')
    city = tokenize_city(strip_unbuilt(link_city(clean(b), 'austin-tx-garage-sale-')))
    hhead, hub_class, hb = body_of(SNAP / 'hub.html')
    hub = strip_unbuilt(link_hub(clean(hb)))
    # No city on /hub/, so live's permit button href is only the broken tail; drop it (approved item 5).
    hub, n = re.subn(r'(id="official-permit-btn") href="\+garage\+sale\+permit&#039;\]"', r'\1', hub)
    assert n == 1
    hub = re.sub(r'(Estimated Fee</span>\s*<div[^>]*>)Free / None(</div>)', r'\g<1>%%HUB_FEE%%\g<2>', hub)
    assert '%%HUB_FEE%%' in hub
    css = ''.join(m.group(1) for m in re.finditer(r'<style id="(?:global-styles|elementor-frontend|wp-img-auto-sizes-contain|wp-emoji-styles)-inline-css">(.*?)</style>', head, re.S))
    css = re.sub(r'/\*# sourceURL=[^*]*\*/', '', css)
    (OUT / 'city-guide.html').write_text(city)
    (OUT / 'hub.html').write_text(hub)
    (ROOT / 'public' / '_live').mkdir(parents=True, exist_ok=True)
    (ROOT / 'public' / '_live' / 'hub-head.css').write_text(css)
    (OUT / 'meta.json').write_text(json.dumps({'body_class_city': body_class, 'body_class_hub': hub_class}, indent=1))
    for n, s in (('city', city), ('hub', hub)):
        for bad in ('adsbygoogle', '[INSERT_', '/wp-admin', '\u2014', '\u2013', '[pseo'):
            assert bad not in re.sub(r'<script.*?</script>', '', s, flags=re.S), (n, bad)
    print('city tokens', sorted(set(re.findall(r'%%[A-Z_]+%%', city))))
    print('hub tokens', sorted(set(re.findall(r'%%[A-Z_]+%%', hub))))


if __name__ == '__main__':
    main()
