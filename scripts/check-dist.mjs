// Post-build check of the generated HTML in dist/. Fails (exit 1) on any error.
// Guards the money and SEO basics so a template change can't quietly break them.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_URL, AMAZON_TAG, APPS } from '../src/lib/site-config.mjs';
import { cityGuideTitle, withSiteName } from '../src/lib/titles.mjs';
import { ADS_ENABLED } from '../src/lib/ads-config.mjs';
import cities from '../data/cities.json' with { type: 'json' };

const DIST = new URL('../dist/', import.meta.url).pathname;
const errors = [];
const err = (f, m) => errors.push(`${f}: ${m}`);
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const htmlFiles = walk(DIST).filter((f) => f.endsWith('.html'));

const BAD = [
  [/"\]/, 'stray "]'], [/\+sale\+permit(['"]|&#8221;|&quot;|&#39;|&#x27;)/i, 'broken permit link tail'], [/\/wp-admin/, '/wp-admin link'],
  [/\[INSERT_/i, '[INSERT_...] placeholder'], [/\[pseo/i, 'raw [pseo] shortcode'], [/[\u2013\u2014]/, 'em or en dash'],
  [/1000000\d{3}/, 'placeholder AdSense slot'],
];

const titles = new Map();
const indexableUrls = new Set();
const canonicalOf = new Map();
let amazonLinks = 0;
for (const f of htmlFiles) {
  const rel = '/' + f.slice(DIST.length).replace(/index\.html$/, '');
  const html = readFileSync(f, 'utf8');
  const scan = html.replace(/<script[\s\S]*?<\/script>/g, ' ');
  for (const [re, what] of BAD) if (re.test(scan)) err(rel, what);
  for (const m of html.matchAll(/href="(https:\/\/www\.amazon\.com[^"]*)"/g)) {
    amazonLinks++;
    const u = new URL(m[1].replaceAll('&amp;', '&'));
    if (u.searchParams.get('tag') !== AMAZON_TAG) err(rel, `Amazon link without tag ${AMAZON_TAG}: ${m[1]}`);
    if (!/^\/(s|dp\/[A-Z0-9]{10})\/?$/.test(u.pathname)) err(rel, `Amazon link is not a search or product URL: ${m[1]}`);
    if (!html.includes('As an Amazon Associate')) err(rel, 'Amazon links without the Associates disclosure');
  }
  if (!ADS_ENABLED && /adsbygoogle|pagead2\.googlesyndication/.test(html)) err(rel, 'AdSense markup while ads are disabled');
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  if (!title) err(rel, 'missing <title>');
  else titles.set(title, [...(titles.get(title) ?? []), rel]);
  // Indexable pages must canonical to their own URL on SITE_URL. Noindex pages may omit it.
  const noindex = /<meta name="robots" content="[^"]*noindex/i.test(html);
  const canonical = html.match(/<link rel="canonical" href="([^"]*)">/)?.[1];
  const self = `${SITE_URL}${rel}`;
  canonicalOf.set(self, canonical);
  if (!noindex) {
    indexableUrls.add(self);
    if (canonical !== self) err(rel, `canonical is not the page itself (got ${canonical ?? 'none'})`);
  }
}
for (const [t, list] of titles) if (list.length > 1) err(list.join(', '), `duplicate title "${t}"`);

// Every city page: own canonical, own description, not noindex.
const descs = new Map();
for (const c of cities) {
  const f = join(DIST, c.slug, 'index.html');
  if (!existsSync(f)) { err(c.slug, 'city page not built'); continue; }
  const html = readFileSync(f, 'utf8');
  const url = `${SITE_URL}/${c.slug}/`;
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  const expected = withSiteName(cityGuideTitle(c));
  if (title !== expected) err(c.slug, `title does not match the city-guide formula (got "${title}")`);
  if (!html.includes(`<link rel="canonical" href="${url}">`)) err(c.slug, 'canonical is not the page itself');
  const d = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!d) err(c.slug, 'missing meta description'); else descs.set(d, (descs.get(d) ?? 0) + 1);
  if (/noindex/.test(html)) err(c.slug, 'city page is noindex');
}
for (const [d, n] of descs) if (n > 1) err('cities', `meta description used ${n} times: ${d}`);

// Sitemap lists exactly the indexable pages (no noindex meta), each at its self-canonical URL.
if (!existsSync(join(DIST, 'sitemap-index.xml'))) err('sitemap-index.xml', 'missing');
const robots = join(DIST, 'robots.txt');
if (!existsSync(robots)) err('robots.txt', 'missing');
else if (!readFileSync(robots, 'utf8').includes(`Sitemap: ${SITE_URL}/sitemap-index.xml`)) {
  err('robots.txt', 'does not reference the sitemap index');
}
const sitemapUrls = new Set();
for (const f of walk(DIST).filter((p) => p.endsWith('.xml'))) {
  const xml = readFileSync(f, 'utf8');
  if (!xml.includes('<urlset')) continue;
  for (const m of xml.matchAll(/<loc>([^<]*)<\/loc>/g)) sitemapUrls.add(m[1]);
}
for (const u of indexableUrls) {
  if (!sitemapUrls.has(u)) err(u.slice(SITE_URL.length), 'indexable page missing from sitemap');
}
for (const u of sitemapUrls) {
  if (!indexableUrls.has(u)) err(u, 'sitemap URL is not an indexable built page');
  else if (canonicalOf.get(u) !== u) err(u, `sitemap URL canonical is not itself (got ${canonicalOf.get(u) ?? 'none'})`);
}

// The app store links we promote must be on the built site.
const all = htmlFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
for (const [name, a] of Object.entries(APPS)) for (const k of ['appStore', 'googlePlay']) if (a[k] && !all.includes(a[k])) err(name, `${k} link not used anywhere`);

console.log(`dist check: ${htmlFiles.length} HTML files, ${cities.length} city pages, ${indexableUrls.size} indexable, ${sitemapUrls.size} sitemap URLs, ${amazonLinks} Amazon links, ads ${ADS_ENABLED ? 'ON' : 'off'}`);
if (errors.length) {
  console.error(`\nFAILED with ${errors.length} error(s):`);
  for (const e of errors.slice(0, 60)) console.error('  ' + e);
  process.exit(1);
}
console.log('Dist check passed.');
