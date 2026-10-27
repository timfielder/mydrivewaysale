import cities from '../../data/cities.json' with { type: 'json' };
import { SHOW_UNVERIFIED_VALUES } from './site-config.mjs';

export const UNKNOWN = 'Unknown, check with your city';
export const allCities = [...cities].sort((a, b) => a.state.localeCompare(b.state) || a.city.localeCompare(b.city));

// Returns the value to show for a legal field, or null when it must render as unknown.
export function legalValue(row, field) {
  const v = row[field];
  if (v === null || v === undefined) return null;
  if (row.confidence === 'verified' && row.verified_fields.includes(field)) return v;
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
    const permit = r.permit_required ? 'You need a permit' : 'No permit needed';
    const parts = [`${permit} for a ${r.sale_term.toLowerCase()} in ${r.city}, ${r.state}.`];
    if (r.fee) parts.push(`Fee: ${r.fee.split(';')[0].split('(')[0].trim()}.`);
    if (r.sales_per_year) parts.push(`Limit ${r.sales_per_year} sales a year.`);
    parts.push(`Checked ${r.last_checked} against the city's own page.`);
    return parts.join(' ').slice(0, 160);
  }
  return `Planning a ${r.sale_term.toLowerCase()} in ${r.city}, ${r.state}? What we know about permits, fees, and signs, the best season, and where to post your sale.`.slice(0, 160);
}
