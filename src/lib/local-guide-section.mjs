// Local-rules and same-state comparison copy for city guides.
// Uses official-source legal fields (verified or partial) plus structural
// city, county, and state data. No unsourced law, seasons, or invented
// neighborhoods, events, or stats. There is no sourced state-season
// dataset in the repo, so none is used.
import { isVerified, permitLink, allCities } from './cities.mjs';
import { STATES } from './states.mjs';

const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const STATE_NAME = Object.fromEntries(Object.entries(STATES).map(([name, code]) => [code, name]));

const LEGAL = [
  'permit_required', 'fee', 'sales_per_year', 'max_days',
  'hours', 'sign_rules', 'how_to_apply',
];

function withPeriod(s) {
  const t = String(s).trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function pick(slug, variants) {
  let h = 0;
  for (const c of slug) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  return variants[h % variants.length];
}

function sourced(r, field) {
  if (!isVerified(r, field)) return null;
  const v = r[field];
  if (v === null || v === undefined || v === '') return null;
  if (field === 'permit_required' && typeof v !== 'boolean') return null;
  if ((field === 'sales_per_year' || field === 'max_days') && typeof v !== 'number') return null;
  return v;
}

function sourcedMap(r) {
  return Object.fromEntries(LEGAL.filter((f) => sourced(r, f) !== null).map((f) => [f, sourced(r, f)]));
}

function stateName(r) {
  return STATE_NAME[r.state] ?? r.state;
}

function saleTerm(r) {
  return (r.sale_term || 'garage sale').toLowerCase();
}

function daysPhrase(n) {
  return n === 1 ? '1 day' : `${n} days`;
}

function salesPhrase(n) {
  return n === 1 ? '1 sale a year' : `${n} sales a year`;
}

function sourceLine(r) {
  if (!r.official_source_url || !r.last_checked) return '';
  let host = r.official_source_url;
  try { host = new URL(r.official_source_url).hostname; } catch {}
  return `<p style="margin: 12px 0 0 0; font-size: 15px; line-height: 1.55; color: #2D3748;">We checked this against the official source (<a href="${esc(r.official_source_url)}" target="_blank" rel="noopener" style="color: #4A7D8F;">${esc(host)}</a>) on ${esc(r.last_checked)}. Read that page before you advertise or set out tables, because cities do change the rules.</p>`;
}

function lookLine(r) {
  const link = permitLink(r);
  return `<p style="margin: 8px 0 0 0; font-size: 15px; line-height: 1.55; color: #2D3748;"><a href="${esc(link.href)}" target="_blank" rel="noopener" style="color: #4A7D8F;">${esc(link.label)}</a>.</p>`;
}

function pWrap(text) {
  return `<p style="margin: 0 0 10px 0; font-size: 15px; line-height: 1.55; color: #2D3748;">${text}</p>`;
}

function h3(id, title) {
  const ident = id ? ` id="${id}"` : '';
  return `<h3${ident} style="margin: 16px 0 8px 0; color: #00264C; font-size: 16px; font-weight: 700;">${esc(title)}</h3>`;
}

export function countyLabel(r) {
  const raw = (r.county || '').trim();
  if (!raw) return '';
  if (/\b(County|Parish|Borough|District|City)\b/i.test(raw)) return raw;
  return `${raw} County`;
}

function contextParagraph(r) {
  const city = esc(r.city);
  const county = esc(countyLabel(r));
  const state = esc(stateName(r));
  const sale = esc(saleTerm(r));
  const slug = r.slug;
  if (county) {
    return pick(slug, [
      `This guide covers a ${sale} in ${city}, in ${county}, ${state}.`,
      `${city} is in ${county}, ${state}. The notes below are for a ${sale} at a home in that city.`,
      `If you are hosting a ${sale} in ${city} (${county}, ${state}), start with the official rules we have already checked, when we have them.`,
    ]);
  }
  return `This guide covers a ${sale} in ${city}, ${state}.`;
}

function permitOpeners(city, state, sale, required) {
  if (required) {
    return [
      `If you host a ${sale} in ${city}, ${state}, start with the permit. The official rules we checked say you need one.`,
      `${city} requires a permit before you run a ${sale}. Get that squared away before you put a sign in the yard.`,
      `A ${sale} in ${city}, ${state} is allowed, and the official source says the permit comes first.`,
    ];
  }
  return [
    `Under the official ${city} rules we checked, a ${sale} does not take a general city permit.`,
    `You can hold a ${sale} in ${city}, ${state} without going through a general permit process, according to the official source we checked.`,
    `${city} does not make you pull a general ${sale} permit first. Still read the official source, because other limits may apply.`,
  ];
}

function feeSentence(fee, required) {
  const f = esc(fee);
  if (required) {
    return [
      `Budget for the official fee: ${f}.`,
      `When you apply, the fee on the official source is ${f}.`,
      `The official fee listed is ${f}.`,
    ];
  }
  return [
    `On fees, the official source says ${f}.`,
    `The official fee note is ${f}.`,
  ];
}

function limitsParagraph(sales, maxDays, hours, city, sale) {
  const parts = [];
  if (sales != null && maxDays != null) {
    parts.push(pick(city + sale + 'lim', [
      `Official limits are ${salesPhrase(sales)}, with each sale lasting no more than ${daysPhrase(maxDays)}.`,
      `Plan around ${salesPhrase(sales)} and a cap of ${daysPhrase(maxDays)} per sale.`,
    ]));
  } else if (sales != null) {
    parts.push(`${city} caps you at ${salesPhrase(sales)} for a ${sale}.`);
  } else if (maxDays != null) {
    parts.push(`A sale may last no more than ${daysPhrase(maxDays)}.`);
  }
  if (hours) {
    const h = withPeriod(esc(hours));
    parts.push(parts.length
      ? `Hours listed in the official source are ${h}`
      : `The official source lists the hours as ${h}`);
  }
  return parts.length ? parts.join(' ') : '';
}

function neighborsFor(row, limit = 3) {
  const all = allCities
    .filter((c) => c.state === row.state)
    .sort((a, b) => a.city.localeCompare(b.city));
  const i = all.findIndex((c) => c.slug === row.slug);
  const others = all.filter((c) => c.slug !== row.slug);
  if (!others.length) return [];
  const start = (i < 0 ? 0 : i) % others.length;
  return others.slice(start).concat(others.slice(0, start)).slice(0, Math.min(limit, others.length));
}

function guideLink(r) {
  return `<a href="/${esc(r.slug)}/" style="color: #4A7D8F;">${esc(r.city)} guide</a>`;
}

function fieldDiffs(self, other) {
  const a = sourcedMap(self);
  const b = sourcedMap(other);
  const out = [];
  for (const f of LEGAL) {
    if (f in a && f in b && String(a[f]) !== String(b[f])) out.push(f);
    else if (!(f in a) && f in b) out.push(f);
  }
  return out;
}

function describeField(r, field) {
  const v = sourced(r, field);
  if (v === null) return '';
  if (field === 'permit_required') {
    return v
      ? `${r.city} requires a permit`
      : `${r.city} does not require a general permit under the official source we checked`;
  }
  if (field === 'fee') return `the official fee in ${r.city} is ${esc(v)}`;
  if (field === 'sales_per_year') return `${r.city} lists ${salesPhrase(v)}`;
  if (field === 'max_days') return `${r.city} caps a sale at ${daysPhrase(v)}`;
  if (field === 'hours') return `${r.city} hours are ${esc(v).replace(/[.]$/, '')}`;
  if (field === 'sign_rules') return `${r.city} sign rules are: ${esc(v)}`;
  if (field === 'how_to_apply') return `in ${r.city}, how to apply is: ${esc(v)}`;
  return '';
}

function comparisonSentence(self, other, diffs) {
  if (!diffs.length) {
    const otherFields = sourcedMap(other);
    if (!Object.keys(otherFields).length) {
      return `We also have not finished a full official-source check for ${esc(other.city)}. See the ${guideLink(other)} if you want that page's current status.`;
    }
    // Same sourced values where they overlap; mention that briefly and point to the guide.
    return pick(self.slug + other.slug, [
      `The official numbers we have for ${esc(other.city)} match ${esc(self.city)} on the fields both cities have sourced. The ${guideLink(other)} still has the local wording.`,
      `${esc(other.city)} lines up with ${esc(self.city)} on the sourced fields they share. Read the ${guideLink(other)} for its own official link.`,
    ]);
  }
  // Prefer short, high-signal diffs (permit, fee, sales, days) over copying long sign essays onto many pages.
  const prefer = ['permit_required', 'fee', 'sales_per_year', 'max_days', 'hours'];
  const lead = prefer.filter((f) => diffs.includes(f)).slice(0, 2);
  const extra = diffs.includes('sign_rules') && lead.length < 2 ? ['sign_rules'] : [];
  const use = lead.concat(extra).slice(0, 2);
  const bits = use.map((f) => describeField(other, f)).filter(Boolean);
  if (!bits.length) {
    return `The ${guideLink(other)} records a different official rule set. Open that guide for the details.`;
  }
  if (use.length === 1) {
    return pick(self.slug + other.slug, [
      `By comparison, ${bits[0]}. Details are in the ${guideLink(other)}.`,
      `Next door in the same state, ${bits[0]}. See the ${guideLink(other)}.`,
    ]);
  }
  return `By comparison, ${bits[0]}, and ${bits[1]}. See the ${guideLink(other)}.`;
}

function comparisonSection(r) {
  const next = neighborsFor(r, 3);
  if (!next.length) {
    return h3('local-compare', `Other ${stateName(r)} city guides`)
      + pWrap(`This is the only ${esc(stateName(r))} city with a guide on this site so far, so there is no same-state comparison to draw yet.`);
  }
  const intro = pWrap(`Here is how official rules in ${esc(r.city)} compare with nearby ${esc(stateName(r))} guides on this site. These are not neighborhood tips; they are differences in the official-source fields we have actually checked.`);
  const items = next.map((other) => pWrap(comparisonSentence(r, other, fieldDiffs(r, other)))).join('');
  return h3('local-compare', `How ${r.city} compares with other ${stateName(r)} cities`) + intro + items;
}

function rulesSection(r) {
  const city = esc(r.city);
  const state = esc(stateName(r));
  const sale = esc(saleTerm(r));
  const slug = r.slug;
  const fields = sourcedMap(r);
  const paragraphs = [];

  if (typeof fields.permit_required === 'boolean') {
    paragraphs.push(pick(slug, permitOpeners(city, state, sale, fields.permit_required)));
  } else if (Object.keys(fields).length) {
    paragraphs.push(`The official ${city} source we checked does not give a complete yes-or-no permit answer, so that question stays unverified. It does spell out other rules.`);
  }

  if (fields.fee) {
    paragraphs.push(pick(slug + 'fee', feeSentence(fields.fee, fields.permit_required === true)));
  }

  const limits = limitsParagraph(fields.sales_per_year, fields.max_days, fields.hours, city, sale);
  if (limits) paragraphs.push(limits);

  if (fields.sign_rules) {
    paragraphs.push(withPeriod(`On signs, the official rule is: ${esc(fields.sign_rules)}`));
  }
  if (fields.how_to_apply) {
    const how = esc(fields.how_to_apply);
    paragraphs.push(pick(slug + 'apply', [
      `How to apply: ${how}`,
      `The official application path is this: ${how}`,
      `A related official note on applying: ${how}`,
    ].map(withPeriod)));
  }

  if (paragraphs.length > 2) {
    const body = paragraphs.slice(1);
    const rot = (slug.length + body.length) % body.length;
    paragraphs.splice(1, body.length, ...body.slice(rot).concat(body.slice(0, rot)));
  }

  if (!paragraphs.length) {
    const look = `We haven't verified this for ${city} yet, here's where to look.`;
    const extra = r.official_source_url
      ? pWrap(`${look} We did find an official page to start with, and we have not treated it as a complete permit answer.`)
        + sourceLine(r) + lookLine(r)
      : pWrap(look) + lookLine(r);
    return h3(null, `What we know so far for ${r.city}`) + extra;
  }

  const title = Object.keys(fields).length
    ? `What official ${r.city} sources say`
    : `What we know so far for ${r.city}`;
  return h3(null, title) + paragraphs.map(pWrap).join('') + sourceLine(r) + (r.official_source_url ? '' : lookLine(r));
}

export function renderLocalGuideSection(r) {
  const inner = pWrap(contextParagraph(r)) + rulesSection(r) + comparisonSection(r);
  return `<section class="mds-local-section" style="background: #F5F7FA; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px 18px; margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    ${inner}
  </section>`;
}
