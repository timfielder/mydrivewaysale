// Renders the live WordPress hub template (page 392) for /hub/ and each city guide.
// Templates (src/live/*.html, passed in by the pages) come from scripts/port-live-hub.py
// (live snapshots of 2026-11-17).
// Non-law fields (city, state, region, sale term, county, best season, cross-posting) are the
// live values (cities.json "original", the same data the live pSEO router reads).
// Law fields (permit required, fee, sign rules, permit link) follow approved item 2: a value is
// shown only when it was checked against an official source; otherwise the approved wording.
import { isVerified, permitLink } from './cities.mjs';
import { renderLocalGuideSection } from './local-guide-section.mjs';

const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const jsStr = (s) => String(s).replaceAll('\\', '\\\\').replaceAll("'", "\\'").replaceAll('<', '\\u003c');
export const NOT_VERIFIED = 'Not verified';
const unverified = (city) => `We haven't verified this for ${esc(city)} yet, here's where to look.`;
const yesNo = (v) => (v ? 'Yes' : 'No');

function fill(tpl, values) {
  return tpl.replace(/%%([A-Z_]+)%%/g, (m, k) => {
    if (!(k in values)) throw new Error(`live-hub: no value for ${m}`);
    return values[k];
  });
}

// liveMode reproduces live WordPress output exactly (used only by scripts/check-live-hub.mjs).
export function cityValues(r, { liveMode = false } = {}) {
  const o = r.original;
  const base = {
    CITY: esc(o.city_name), ST: esc(o.state_code), REGION: esc(o.region), DIALECT: esc(o.sale_dialect),
    COUNTY: esc(o.county), BEST: esc(o.best_weekends), CROSSPOST: esc(o.local_crosspost_sites.join(', ')),
    JS_CITY: jsStr(o.city_name), JS_ST: jsStr(o.state_code), SLUGBASE: r.slug.replace(/guide$/, ''),
  };
  if (liveMode) {
    const link = o.permit_link && o.permit_link !== 'N/A' ? o.permit_link : '';
    return { ...base,
      PERMIT_SENTENCE: `The short answer is <strong>${yesNo(o.permit_required)}</strong>.`,
      PERMIT_CARD: yesNo(o.permit_required), FEE_CARD: esc(o.permit_cost),
      PERMIT_HREF: esc(link + "+garage+sale+permit']").replace("'", '&#039;'), JS_PERMIT_URL: jsStr(link),
      SIGNAGE: esc(o.signage_rules), CHECKED: '', LOCAL_SECTION: '' };
  }
  const permitOk = isVerified(r, 'permit_required') && typeof r.permit_required === 'boolean';
  const feeOk = isVerified(r, 'fee') && r.fee;
  const signOk = isVerified(r, 'sign_rules') && r.sign_rules;
  const link = permitLink(r).href;
  const anyChecked = permitOk || feeOk || signOk;
  const checked = anyChecked && r.official_source_url && r.last_checked
    ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #718096;">Checked against the official source (<a href="${esc(r.official_source_url)}" target="_blank" rel="noopener" style="color: #4A7D8F;">${esc(new URL(r.official_source_url).hostname)}</a>) on ${esc(r.last_checked)}.</p>`
    : '';
  return { ...base,
    PERMIT_SENTENCE: permitOk ? `The short answer is <strong>${yesNo(r.permit_required)}</strong>.` : unverified(o.city_name),
    CHECKED: checked,
    PERMIT_CARD: permitOk ? yesNo(r.permit_required) : NOT_VERIFIED,
    FEE_CARD: feeOk ? esc(r.fee) : NOT_VERIFIED,
    PERMIT_HREF: esc(link), JS_PERMIT_URL: jsStr(link),
    SIGNAGE: signOk ? esc(r.sign_rules) : unverified(o.city_name),
    LOCAL_SECTION: renderLocalGuideSection(r) };
}

export function renderCityGuide(cityTemplate, r, footerHtml, opts) {
  return fill(cityTemplate, { ...cityValues(r, opts), FOOTER: footerHtml });
}

export function renderHub(hubTemplate, footerHtml) {
  return fill(hubTemplate, { HUB_FEE: NOT_VERIFIED, FOOTER: footerHtml });
}

// State guides use the same hub template, but fill the blank location slots with the
// state name, written naturally (Tim, 2026-11-17). Sale terms already in the template
// stay as they are; the empty sale-term slot in the permit sentence uses "garage sale",
// the term the template uses in the other "Wondering..." lines. Law and fee fields
// stay "Not verified". /hub/ and the international guide keep using renderHub, blanks and all.
const PERMIT_BLANK = 'Wondering if you need a permit for a <strong></strong> in <strong>, </strong>? The short answer is <strong></strong>. While regulations vary across the <strong></strong> region';
const PERMIT_CARD_BLANK = 'Permit Required?</span>\n      <div style="font-size: 16px; font-weight: bold; color: #00264C;"></div>';

export function renderStateGuide(hubTemplate, footerHtml, stateName) {
  const name = esc(stateName);
  const permit = `Wondering if you need a permit for a <strong>garage sale</strong> in <strong>${name}</strong>? The short answer is <strong>${NOT_VERIFIED}</strong>. While regulations vary across the <strong>${name}</strong> region`;
  const permitCard = `Permit Required?</span>\n      <div style="font-size: 16px; font-weight: bold; color: #00264C;">${NOT_VERIFIED}</div>`;
  let html = fill(hubTemplate, { HUB_FEE: NOT_VERIFIED, FOOTER: footerHtml });
  if (!html.includes(PERMIT_BLANK)) throw new Error('live-hub: state permit sentence not found');
  if (!html.includes(PERMIT_CARD_BLANK)) throw new Error('live-hub: state permit card not found');
  html = html.replace(PERMIT_BLANK, permit).replace(PERMIT_CARD_BLANK, permitCard);
  html = html.replaceAll('Planning a successful Driveway Sale in the  area', `Planning a successful Driveway Sale in ${name}`);
  html = html.replaceAll('in <strong></strong>?', `in <strong>${name}</strong>?`);
  html = html.replaceAll('in <strong>your city</strong>?', `in <strong>${name}</strong>?`);
  html = html.replaceAll('near .', `near ${name}.`);
  html = html.replaceAll('Open  Permitting Page', `Open ${name} Permitting Page`);
  return html;
}
