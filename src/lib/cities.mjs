import cities from '../../data/cities.json' with { type: 'json' };
import { SHOW_UNVERIFIED_VALUES } from './site-config.mjs';

export const UNKNOWN = 'Unknown, check with your city';
export const allCities = [...cities].sort((a, b) => a.state.localeCompare(b.state) || a.city.localeCompare(b.city));

// True when this one field was checked against an official source.
export function isVerified(row, field) {
  return row.field_status?.[field]?.verified === true;
}

// Returns the value to show for a legal field, or null when it must render as unknown.
export function legalValue(row, field) {
  const v = row[field];
  if (v === null || v === undefined) return null;
  if (isVerified(row, field)) return v;
  return SHOW_UNVERIFIED_VALUES ? v : null;
}

export function display(v) {
  if (v === null || v === undefined) return UNKNOWN;
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  return String(v);
}

export function pageTitle(r) {
  return `${r.city}, ${r.state} ${r.sale_term} Rules: Permits, Fees and Signs`;
}

export function metaDescription(r) {
  if (r.confidence === 'verified') {
    const permit = legalValue(r, 'permit_required') ? 'You need a permit' : 'No permit needed';
    const parts = [`${permit} for a ${r.sale_term.toLowerCase()} in ${r.city}, ${r.state}.`];
    const fee = legalValue(r, 'fee');
    if (fee) parts.push(`Fee: ${fee.split(';')[0].split('(')[0].trim()}.`);
    if (legalValue(r, 'sales_per_year')) parts.push(`Limit ${r.sales_per_year} sales a year.`);
    parts.push(`Checked ${r.last_checked} against the city's own page.`);
    return parts.join(' ').slice(0, 160);
  }
  return `Planning a ${r.sale_term.toLowerCase()} in ${r.city}, ${r.state}? What we know about permits, fees, and signs, the best season, and where to post your sale.`.slice(0, 160);
}

// Where the "permit page" link points. Replaces the live site's broken nested-shortcode
// fallback (it printed "+garage+sale+permit']" after the URL). Order: a verified permit link,
// then the official page we checked, then a properly encoded search of government sites.
export function permitLink(r) {
  if (isVerified(r, 'permit_link') && r.permit_link) {
    return { href: r.permit_link, label: 'City permit page', kind: 'verified' };
  }
  if (r.confidence !== 'unverified' && r.official_source_url) {
    return { href: r.official_source_url, label: `${new URL(r.official_source_url).hostname} (the page we checked)`, kind: 'official' };
  }
  const q = `${r.city} ${r.state} ${(r.sale_term ?? 'garage sale').toLowerCase()} permit site:.gov OR site:.us`;
  return { href: `https://www.google.com/search?${new URLSearchParams({ q })}`, label: `Search for ${r.city}'s official permit page`, kind: 'search' };
}
