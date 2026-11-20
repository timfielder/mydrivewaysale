// Short, city-specific local-rules copy for city guides.
// Uses only official-source legal fields. Phrasing branches on the actual
// values (permit yes/no, fee text, limits, hours, signs, how to apply).
// Partial and unverified rows get the approved "not verified yet" wording,
// plus the official source link when we have one.
import { isVerified, permitLink } from './cities.mjs';

const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function verifiedValue(r, field) {
  if (!isVerified(r, field)) return null;
  const v = r[field];
  if (v === null || v === undefined || v === '') return null;
  return v;
}

function pick(slug, variants) {
  let h = 0;
  for (const c of slug) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  return variants[h % variants.length];
}

function sourceLine(r) {
  if (!r.official_source_url || !r.last_checked) return '';
  let host = r.official_source_url;
  try { host = new URL(r.official_source_url).hostname; } catch {}
  return `<p style="margin: 12px 0 0 0; font-size: 14px; line-height: 1.55; color: #2D3748;">We checked this against the official source (<a href="${esc(r.official_source_url)}" target="_blank" rel="noopener" style="color: #4A7D8F;">${esc(host)}</a>) on ${esc(r.last_checked)}. Read that page before you advertise or set out tables, because cities do change the rules.</p>`;
}

function lookLine(r) {
  const link = permitLink(r);
  return `<p style="margin: 8px 0 0 0; font-size: 14px; line-height: 1.55; color: #2D3748;"><a href="${esc(link.href)}" target="_blank" rel="noopener" style="color: #4A7D8F;">${esc(link.label)}</a>.</p>`;
}

function wrap(title, inner) {
  return `<section class="mds-local-section" style="background: #F5F7FA; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px 18px; margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <h3 style="margin: 0 0 10px 0; color: #00264C; font-size: 16px; font-weight: 700;">${esc(title)}</h3>
    ${inner}
  </section>`;
}

function withPeriod(s) {
  const t = String(s).trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function daysPhrase(n) {
  return n === 1 ? '1 day' : `${n} days`;
}

function salesPhrase(n) {
  return n === 1 ? '1 sale a year' : `${n} sales a year`;
}

function permitOpeners(city, state, sale, required) {
  if (required) {
    return [
      `If you host a ${sale} in ${city}, ${state}, start with the permit. The official rules we checked say you need one.`,
      `${city} requires a permit before you run a ${sale}. Get that squared away before you put a sign in the yard.`,
      `A ${sale} in ${city}, ${state} is allowed, and the city wants the permit handled first.`,
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
    if (/free|\$0|0\.00|no fee|none/i.test(fee) && !/\d+\s*\/\s*\$|\d+\s+for/i.test(fee)) {
      return [
        `The official fee listed is ${f}.`,
        `The city lists the fee as ${f}, so budget for the application steps rather than a big payment.`,
      ];
    }
    return [
      `Budget for the official fee: ${f}.`,
      `The permit carries an official fee of ${f}.`,
      `When you apply, the fee on the official source is ${f}.`,
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
    parts.push(`Official limits are ${salesPhrase(sales)}, with each sale lasting no more than ${daysPhrase(maxDays)}.`);
  } else if (sales != null) {
    parts.push(`${city} caps you at ${salesPhrase(sales)} for a ${sale}.`);
  } else if (maxDays != null) {
    parts.push(`A sale may last no more than ${daysPhrase(maxDays)}.`);
  }
  if (hours) {
    const h = esc(hours);
    if (parts.length) {
      parts.push(`Hours listed in the official source are ${withPeriod(h)}`);
    } else {
      parts.push(`The official source lists the hours as ${withPeriod(h)}`);
    }
  }
  return parts.length ? parts.join(' ') : '';
}

function signsSentence(signs) {
  return withPeriod(`On signs, the official rule is: ${esc(signs)}`);
}

function applySentence(how, required) {
  const h = esc(how);
  if (required) {
    return [
      `How to apply: ${h}`,
      `The official application path is this: ${h}`,
    ];
  }
  return [
    `The official source also notes: ${h}`,
    `A related official note on applying: ${h}`,
  ];
}

export function renderLocalGuideSection(r) {
  const cityName = r.city;
  const city = esc(r.city);
  const state = esc(r.state);
  const sale = esc((r.sale_term || 'garage sale').toLowerCase());
  const slug = r.slug;

  if (r.confidence !== 'verified') {
    const title = `What we know so far for ${cityName}`;
    const look = `We haven't verified this for ${city} yet, here's where to look.`;
    const extra = r.official_source_url
      ? `<p style="margin: 0 0 8px 0; font-size: 15px; line-height: 1.55; color: #2D3748;">${look} We did find an official page to start with, and we have not treated it as a complete permit answer.</p>${sourceLine(r)}${lookLine(r)}`
      : `<p style="margin: 0; font-size: 15px; line-height: 1.55; color: #2D3748;">${look}</p>${lookLine(r)}`;
    return wrap(title, extra);
  }

  const permit = verifiedValue(r, 'permit_required');
  const fee = verifiedValue(r, 'fee');
  const sales = verifiedValue(r, 'sales_per_year');
  const maxDays = verifiedValue(r, 'max_days');
  const hours = verifiedValue(r, 'hours');
  const signs = verifiedValue(r, 'sign_rules');
  const how = verifiedValue(r, 'how_to_apply');

  const paragraphs = [];
  if (typeof permit === 'boolean') {
    paragraphs.push(pick(slug, permitOpeners(city, state, sale, permit)));
  } else {
    paragraphs.push(`Here is what the official ${city} source we checked actually spells out for a ${sale}.`);
  }

  if (fee) {
    paragraphs.push(pick(slug + 'fee', feeSentence(fee, permit === true)));
  }

  const limits = limitsParagraph(sales, maxDays, hours, city, sale);
  if (limits) paragraphs.push(limits);

  if (signs) paragraphs.push(signsSentence(signs));
  if (how) paragraphs.push(pick(slug + 'apply', applySentence(how, permit === true)));

  // Reorder mid paragraphs by slug so two cities with a similar fact set
  // do not share the same sequence. Keep the opener first and the source last.
  const body = paragraphs.slice(1);
  if (body.length > 1) {
    const rot = (slug.length + body.length) % body.length;
    const rotated = body.slice(rot).concat(body.slice(0, rot));
    paragraphs.splice(1, body.length, ...rotated);
  }

  const inner = paragraphs.map((p) => `<p style="margin: 0 0 10px 0; font-size: 15px; line-height: 1.55; color: #2D3748;">${p}</p>`).join('') + sourceLine(r);
  return wrap(`What the official ${cityName} rules say`, inner);
}
