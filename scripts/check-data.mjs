// Schema and trust check for data/cities.json. Plain Node, no dependencies.
// Fails (exit 1) on any error. Always prints counts.
import { readFileSync } from 'node:fs';

const rows = JSON.parse(readFileSync(new URL('../data/cities.json', import.meta.url), 'utf8'));
const original = JSON.parse(readFileSync(new URL('../location_rules_database.json', import.meta.url), 'utf8'));
const errors = [];
const err = (slug, msg) => errors.push(`${slug}: ${msg}`);

// Every data field is a claim and gets a field_status entry.
const DATA_FIELDS = {
  city: 'string', state: 'string', county: 'string|null', region: 'string|null', sale_term: 'string|null',
  permit_required: 'boolean|null', fee: 'string|null', sales_per_year: 'number|null', max_days: 'number|null',
  hours: 'string|null', sign_rules: 'string|null', how_to_apply: 'string|null', permit_link: 'string|null',
  best_season: 'string|null', cross_posting: 'array',
};
const META_FIELDS = {
  slug: 'string', official_source_url: 'string|null', last_checked: 'string|null', confidence: 'string',
  field_status: 'object', notes: 'string|null', original: 'object',
};
const ALL = { ...DATA_FIELDS, ...META_FIELDS };
const LEGAL = ['permit_required', 'fee', 'sales_per_year', 'max_days', 'hours', 'sign_rules', 'how_to_apply'];
const CONFIDENCE = ['verified', 'partial', 'unverified'];
const ORIGINS = ['official_source', 'original_db', 'none'];
const ORIGINAL_KEYS = Object.keys(original[0]).sort().join(',');
const originalByKey = new Map(original.map((o) => [`${o.city_name}|${o.state_code}`, JSON.stringify(o)]));
const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
const BAD_TEXT = [/\[INSERT_/i, /"\]/, /\u2013|\u2014/, /\/wp-admin/];
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? '');
const isUrl = (s) => /^https:\/\/\S+$/.test(s ?? '');

if (!Array.isArray(rows)) { console.error('cities.json must be an array'); process.exit(1); }
const seen = new Set();
const verifiedCount = Object.fromEntries(Object.keys(DATA_FIELDS).map((f) => [f, 0]));
for (const r of rows) {
  const id = r.slug ?? '(no slug)';
  for (const [k, t] of Object.entries(ALL)) {
    if (!(k in r)) { err(id, `missing field ${k}`); continue; }
    if (!t.split('|').includes(typeOf(r[k]))) err(id, `${k} should be ${t}, got ${typeOf(r[k])}`);
  }
  for (const k of Object.keys(r)) if (!(k in ALL)) err(id, `unknown field ${k}`);
  if (seen.has(r.slug)) err(id, 'duplicate slug');
  seen.add(r.slug);
  if (!/^[a-z0-9.-]+-[a-z]{2}-(garage|yard|tag|rummage)-sale-guide$/.test(r.slug ?? '')) err(id, 'slug does not match the city URL pattern');
  if (!CONFIDENCE.includes(r.confidence)) err(id, `confidence must be one of ${CONFIDENCE.join(', ')}`);
  if (r.official_source_url !== null && !isUrl(r.official_source_url)) err(id, 'official_source_url must be https or null');
  if (r.last_checked !== null && !isDate(r.last_checked)) err(id, 'last_checked must be YYYY-MM-DD or null');

  // Tim's original row must be kept verbatim.
  if (typeOf(r.original) === 'object') {
    if (Object.keys(r.original).sort().join(',') !== ORIGINAL_KEYS) err(id, 'original is missing or has extra keys from location_rules_database.json');
    const match = originalByKey.get(`${r.original.city_name}|${r.original.state_code}`);
    if (match !== JSON.stringify(r.original)) err(id, 'original does not match location_rules_database.json verbatim');
  }

  // Per-field verification.
  const fs = r.field_status ?? {};
  for (const f of Object.keys(DATA_FIELDS)) {
    const s = fs[f];
    if (!s) { err(id, `field_status missing ${f}`); continue; }
    if (typeof s.verified !== 'boolean') err(id, `field_status.${f}.verified must be boolean`);
    if (!ORIGINS.includes(s.origin)) err(id, `field_status.${f}.origin must be one of ${ORIGINS.join(', ')}`);
    if (s.verified) {
      verifiedCount[f]++;
      if (!isUrl(s.source)) err(id, `${f} is verified but has no https source`);
      if (!isDate(s.checked)) err(id, `${f} is verified but has no checked date`);
      if (s.origin !== 'official_source') err(id, `${f} is verified but origin is ${s.origin}`);
    } else if (s.origin === 'official_source') err(id, `${f} has origin official_source but is not verified`);
  }
  for (const k of Object.keys(fs)) if (!(k in DATA_FIELDS)) err(id, `field_status has unknown field ${k}`);

  // Row confidence describes the legal fields.
  const legalVerified = LEGAL.filter((f) => fs[f]?.verified).length;
  if (r.confidence !== 'unverified') {
    if (!legalVerified) err(id, `marked ${r.confidence} but no legal field is verified`);
    if (!isUrl(r.official_source_url)) err(id, `marked ${r.confidence} but has no official_source_url`);
    if (!isDate(r.last_checked)) err(id, `marked ${r.confidence} but has no last_checked date`);
  } else if (legalVerified) err(id, 'marked unverified but has verified legal fields');

  const strings = Object.keys(DATA_FIELDS).flatMap((k) => (Array.isArray(r[k]) ? r[k].map((x) => [k, x]) : [[k, r[k]]]))
    .filter(([, v]) => typeof v === 'string');
  for (const [k, v] of strings) for (const re of BAD_TEXT) if (re.test(v)) err(id, `${k} contains banned text ${re}`);
}

const count = (fn) => rows.filter(fn).length;
console.log(`cities.json: ${rows.length} rows (original database: ${original.length} rows)`);
for (const c of CONFIDENCE) console.log(`  ${c}: ${count((r) => r.confidence === c)}`);
console.log('  per field: verified / has a value / total');
for (const f of Object.keys(DATA_FIELDS)) {
  const has = count((r) => r[f] !== null && !(Array.isArray(r[f]) && !r[f].length));
  console.log(`    ${f.padEnd(16)} ${String(verifiedCount[f]).padStart(3)} / ${String(has).padStart(3)} / ${rows.length}`);
}
if (rows.length !== original.length) console.log(`  note: original database has ${original.length} rows, cities.json has ${rows.length}`);
if (errors.length) {
  console.error(`\nFAILED with ${errors.length} error(s):`);
  for (const e of errors.slice(0, 50)) console.error('  ' + e);
  process.exit(1);
}
console.log('\nData check passed.');
