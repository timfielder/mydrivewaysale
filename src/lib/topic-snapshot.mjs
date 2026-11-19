// Local rules snapshot for city topic pages. Only official-source verified legal
// fields are shown. Unsourced original_db values, seasons, and cross-posting lists
// are never published here. There is no state-law dataset, so none is invented.
import { isVerified, permitLink, allCities } from './cities.mjs';
import { STATES } from './states.mjs';

const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const STATE_NAME = Object.fromEntries(Object.entries(STATES).map(([name, code]) => [code, name]));

const LEGAL_FIELDS = [
  'permit_required', 'fee', 'sales_per_year', 'max_days',
  'hours', 'sign_rules', 'how_to_apply', 'permit_link',
];

// Topic-relevant fields lead the list. Every other verified legal field still follows.
const TOPIC_PRIORITY = {
  'best-weekends': ['hours', 'max_days', 'sales_per_year'],
  'weather-plan': ['hours', 'max_days', 'sales_per_year'],
  'multi-family': ['permit_required', 'fee', 'how_to_apply', 'permit_link', 'sales_per_year', 'max_days'],
  'nuisance': ['sign_rules', 'hours', 'max_days', 'permit_required'],
  'liability': ['hours', 'sign_rules', 'permit_required', 'fee'],
  'dogs': ['hours', 'sign_rules', 'permit_required'],
  'host-comfort': ['hours', 'max_days', 'permit_required'],
  'security-lockdown': ['hours', 'sign_rules', 'permit_required'],
  'color-sticker-pricing': ['sales_per_year', 'max_days', 'fee', 'hours', 'permit_required'],
  'pricing-appraisal': ['sales_per_year', 'max_days', 'fee', 'hours', 'permit_required'],
};

const LABELS = {
  permit_required: 'Permit required',
  fee: 'Fee',
  sales_per_year: 'Sales per year',
  max_days: 'Maximum days',
  hours: 'Hours',
  sign_rules: 'Sign rules',
  how_to_apply: 'How to apply',
  permit_link: 'Permit page',
};

function fieldVerified(row, field) {
  if (!isVerified(row, field)) return false;
  const v = row[field];
  if (field === 'permit_required') return typeof v === 'boolean';
  if (field === 'sales_per_year' || field === 'max_days') return typeof v === 'number';
  return v !== null && v !== undefined && v !== '';
}

function verifiedFields(row) {
  return Object.fromEntries(LEGAL_FIELDS.filter((f) => fieldVerified(row, f)).map((f) => [f, row[f]]));
}

function formatValue(field, row) {
  const v = row[field];
  if (field === 'permit_required') return v ? 'Yes' : 'No';
  if (field === 'sales_per_year') return `${v} per year`;
  if (field === 'max_days') return `${v} day${v === 1 ? '' : 's'}`;
  if (field === 'permit_link') {
    const link = permitLink(row);
    return `<a href="${esc(link.href)}" target="_blank" rel="noopener">${esc(link.label)}</a>`;
  }
  return esc(v);
}

function fieldOrder(suffix) {
  const lead = TOPIC_PRIORITY[suffix] ?? [];
  return [...lead, ...LEGAL_FIELDS.filter((f) => !lead.includes(f))];
}

function neighbors(row) {
  return allCities
    .filter((c) => c.state === row.state && c.slug !== row.slug)
    .sort((a, b) => a.city.localeCompare(b.city));
}

function stateLabel(row) {
  return STATE_NAME[row.state] ?? row.region ?? row.state;
}

function saleTerm(row) {
  return (row.sale_term ?? 'garage sale').toLowerCase();
}

function guideHref(row) {
  return `/${row.slug}/`;
}

function guideLink(row) {
  return `<a href="${esc(guideHref(row))}">${esc(row.city)} ${saleTerm(row)} guide</a>`;
}

function nearbyHtml(row) {
  const next = neighbors(row);
  if (!next.length) return '';
  const links = next.map((c) => `<a href="${esc(guideHref(c))}">${esc(c.city)}</a>`).join(', ');
  return `<p style="margin: 8px 0 0 0; font-size: 15px; line-height: 1.55;">Nearby city guides in ${esc(stateLabel(row))}: ${links}.</p>`;
}

function leadSentence(row, suffix, fields) {
  const city = row.city;
  const term = saleTerm(row);
  const parts = [];
  const scheduling = suffix === 'best-weekends' || suffix === 'weather-plan';
  const pricing = suffix === 'color-sticker-pricing' || suffix === 'pricing-appraisal';

  if (scheduling) {
    if ('hours' in fields) parts.push(`In ${esc(city)}, sales may run ${esc(fields.hours)}.`);
    if ('max_days' in fields) parts.push(`A sale may last up to ${fields.max_days} day${fields.max_days === 1 ? '' : 's'}.`);
    if ('sales_per_year' in fields) parts.push(`The city limit is ${fields.sales_per_year} sale${fields.sales_per_year === 1 ? '' : 's'} per year.`);
  } else if (suffix === 'multi-family') {
    if ('permit_required' in fields) {
      parts.push(`For a multi-family ${esc(term)} in ${esc(city)}, a permit is ${fields.permit_required ? 'required' : 'not required'}.`);
    }
    if ('fee' in fields) parts.push(`The fee is ${esc(fields.fee)}.`);
    if ('how_to_apply' in fields) parts.push(esc(fields.how_to_apply));
  } else if (pricing) {
    if ('sales_per_year' in fields) {
      parts.push(`In ${esc(city)}, the city limit is ${fields.sales_per_year} sale${fields.sales_per_year === 1 ? '' : 's'} per year, so a clear pricing system helps you move inventory on the days you have.`);
    } else if ('max_days' in fields) {
      parts.push(`In ${esc(city)}, a sale may last up to ${fields.max_days} day${fields.max_days === 1 ? '' : 's'}.`);
    }
  } else if (suffix === 'nuisance' && 'sign_rules' in fields) {
    parts.push(`Sign rules are often what gets a host cited. Here is what we checked for ${esc(city)}.`);
  } else if ((suffix === 'liability' || suffix === 'dogs' || suffix === 'security-lockdown' || suffix === 'host-comfort') && ('hours' in fields || 'sign_rules' in fields)) {
    if ('hours' in fields) parts.push(`In ${esc(city)}, sales may run ${esc(fields.hours)}.`);
  }
  return parts.join(' ');
}

function wrap(title, body) {
  return `<div class="mds-local-snapshot" style="margin: 0 0 28px 0; padding: 20px 22px; background: #F5F7FA; border: 1px solid #E6E9ED; border-left: 4px solid #E0B42D; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #00264C;">
  <h3 style="margin: 0 0 12px 0; font-size: 16px; line-height: 1.3;">${title}</h3>
  ${body}
</div>`;
}

function checkedLine(row) {
  if (!row.official_source_url || !row.last_checked) return '';
  let host;
  try { host = new URL(row.official_source_url).hostname; } catch { return ''; }
  return `<p style="margin: 8px 0 0 0; font-size: 12px; color: #718096;">Checked against the official source (<a href="${esc(row.official_source_url)}" target="_blank" rel="noopener" style="color: #4A7D8F;">${esc(host)}</a>) on ${esc(row.last_checked)}.</p>`;
}

export function renderLocalSnapshot(row, suffix) {
  const title = `Local rules snapshot for ${esc(row.city)}, ${esc(row.state)}`;
  const guide = `<p style="margin: 12px 0 0 0; font-size: 15px; line-height: 1.55;">Read the ${guideLink(row)} for the full playbook.</p>`;
  const nearby = nearbyHtml(row);
  const fields = verifiedFields(row);
  const sourced = Boolean(row.official_source_url && row.last_checked);
  const names = fieldOrder(suffix).filter((f) => f in fields);

  if (!sourced) {
    const search = permitLink(row);
    const look = `We haven't verified this for ${esc(row.city)} yet, here's where to look.`;
    const searchLine = `<p style="margin: 8px 0 0 0; font-size: 15px; line-height: 1.55;"><a href="${esc(search.href)}" target="_blank" rel="noopener">${esc(search.label)}</a>.</p>`;
    return wrap(title, `<p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.55;">${look}</p>${guide}${searchLine}${nearby}`);
  }

  const lead = leadSentence(row, suffix, fields);
  const leadHtml = lead ? `<p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.55;">${lead}</p>` : '';
  const rows = names.map((f) => {
    const value = formatValue(f, row);
    const block = f === 'sign_rules' || f === 'how_to_apply';
    if (block) {
      return `<div style="margin: 0 0 10px 0; font-size: 15px; line-height: 1.55;"><div style="font-weight: 700;">${esc(LABELS[f])}</div><div>${value}</div></div>`;
    }
    return `<div style="margin: 0 0 8px 0; font-size: 15px; line-height: 1.55;"><span style="font-weight: 700;">${esc(LABELS[f])}: </span>${value}</div>`;
  }).join('');
  return wrap(title, `${leadHtml}${rows}${checkedLine(row)}${guide}${nearby}`);
}
