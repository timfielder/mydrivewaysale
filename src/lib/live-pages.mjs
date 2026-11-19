// Renders the live WordPress article, topic guide and legal pages (Elementor Canvas pages
// 543..1073, 123, 137, 146) and the 10 articles the live pSEO router serves per city at
// /<city>-<suffix>/. Templates (src/live/pages/, src/live/city-topics/) come from
// scripts/port-live-pages.py (live snapshots of 2026-11-17); scripts/check-live-pages.py checks the
// city templates against all 1000 live city topic pages.
// City fields are the live non-law values (cities.json "original", what the live router reads).
// Law fields on topic pages come from renderLocalSnapshot (verified official-source values only).
// The multi-family permit link still uses permitLink (verified, official source, or a search).
import { permitLink } from './cities.mjs';
import { renderLocalSnapshot } from './topic-snapshot.mjs';
import meta from '../live/pages-meta.json' with { type: 'json' };

const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export const PAGE_META = meta.pages;
// Router suffix -> national article slug (snippet 05), only the 10 articles that exist on live.
export const CITY_TOPICS = meta.city_topics;

function fill(tpl, values) {
  return tpl.replace(/%%([A-Z_]+)%%/g, (m, k) => {
    if (!(k in values)) throw new Error(`live-pages: no value for ${m}`);
    return values[k];
  });
}

export function cityTopicSlug(city, suffix) {
  return city.slug.replace(/guide$/, suffix);
}

export function renderCityTopic(tpl, r, suffix) {
  const o = r.original;
  const link = permitLink(r);
  return fill(tpl, {
    CITY: esc(o.city_name), ST: esc(o.state_code), DIALECT: esc(o.sale_dialect),
    COUNTY: esc(o.county), REGION: esc(o.region), SLUGBASE: r.slug.replace(/guide$/, ''),
    PERMIT_LINK: `<a href="${esc(link.href)}" target="_blank" rel="noopener">${esc(link.label)}</a>`,
    LOCAL_SNAPSHOT: renderLocalSnapshot(r, suffix),
    FOOTER: '%%FOOTER%%',
  });
}
