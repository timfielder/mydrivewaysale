// Post-build check of the generated HTML in dist/. Fails (exit 1) on any error.
// Guards the money and SEO basics so a template change can't quietly break them.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_URL, AMAZON_TAG, APPS } from '../src/lib/site-config.mjs';
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
  else if (!/noindex/.test(html)) titles.set(title, [...(titles.get(title) ?? []), rel]);
}
for (const [t, list] of titles) if (list.length > 1) err(list.join(', '), `duplicate title "${t}"`);

// Every city page: own canonical, own description, in the sitemap.
const sitemap = walk(DIST).filter((f) => /sitemap-\d+\.xml$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n');
const descs = new Map();
for (const c of cities) {
  const f = join(DIST, c.slug, 'index.html');
  if (!existsSync(f)) { err(c.slug, 'city page not built'); continue; }
  const html = readFileSync(f, 'utf8');
  const url = `${SITE_URL}/${c.slug}/`;
  if (!html.includes(`<link rel="canonical" href="${url}">`)) err(c.slug, 'canonical is not the page itself');
  const d = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!d) err(c.slug, 'missing meta description'); else descs.set(d, (descs.get(d) ?? 0) + 1);
  if (!sitemap.includes(`<loc>${url}</loc>`)) err(c.slug, 'not in sitemap');
  if (/noindex/.test(html)) err(c.slug, 'city page is noindex');
}
for (const [d, n] of descs) if (n > 1) err('cities', `meta description used ${n} times: ${d}`);

// The app store links we promote must be on the built site.
const all = htmlFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
for (const [name, a] of Object.entries(APPS)) for (const k of ['appStore', 'googlePlay']) if (a[k] && !all.includes(a[k])) err(name, `${k} link not used anywhere`);

console.log(`dist check: ${htmlFiles.length} HTML files, ${cities.length} city pages, ${amazonLinks} Amazon links, ads ${ADS_ENABLED ? 'ON' : 'off'}`);
if (errors.length) {
  console.error(`\nFAILED with ${errors.length} error(s):`);
  for (const e of errors.slice(0, 60)) console.error('  ' + e);
  process.exit(1);
}
console.log('Dist check passed.');
