// Schema and trust check for data/cities.json. Plain Node, no dependencies.
// Fails (exit 1) on any error. Always prints counts.
import { readFileSync } from 'node:fs';

const rows = JSON.parse(readFileSync(new URL('../data/cities.json', import.meta.url), 'utf8'));
const errors = [];
const err = (slug, msg) => errors.push(`${slug}: ${msg}`);

const FIELDS = {
  slug: 'string', city: 'string', state: 'string', sale_term: 'string',
  permit_required: 'boolean|null', fee: 'string|null', sales_per_year: 'number|null',
  max_days: 'number|null', hours: 'string|null', sign_rules: 'string|null',
  how_to_apply: 'string|null', official_source_url: 'string|null', last_checked: 'string|null',
  confidence: 'string', verified_fields: 'array', best_season: 'string|null',
  cross_posting: 'array', notes: 'string|null',
};
const LEGAL = ['permit_required', 'fee', 'sales_per_year', 'max_days', 'hours', 'sign_rules', 'how_to_apply'];
const CONFIDENCE = ['verified', 'partial', 'unverified'];
const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
const BAD_TEXT = [/\[INSERT_/i, /"\]/, /\u2013|\u2014/, /\/wp-admin/];

if (!Array.isArray(rows)) { console.error('cities.json must be an array'); process.exit(1); }
const seen = new Set();
for (const r of rows) {
  const id = r.slug ?? '(no slug)';
  for (const [k, t] of Object.entries(FIELDS)) {
    if (!(k in r)) { err(id, `missing field ${k}`); continue; }
    if (!t.split('|').includes(typeOf(r[k]))) err(id, `${k} should be ${t}, got ${typeOf(r[k])}`);
  }
  for (const k of Object.keys(r)) if (!(k in FIELDS)) err(id, `unknown field ${k}`);
  if (seen.has(r.slug)) err(id, 'duplicate slug');
  seen.add(r.slug);
  if (!/^[a-z0-9.-]+-[a-z]{2}-(garage|yard|tag|rummage)-sale-guide$/.test(r.slug ?? '')) err(id, 'slug does not match the city URL pattern');
  if (!/^[A-Z]{2}$/.test(r.state ?? '')) err(id, 'state must be a 2-letter code');
  if (!CONFIDENCE.includes(r.confidence)) err(id, `confidence must be one of ${CONFIDENCE.join(', ')}`);
  if (r.official_source_url !== null && !/^https:\/\/\S+$/.test(r.official_source_url)) err(id, 'official_source_url must be an https URL or null');
  if (r.last_checked !== null && !/^\d{4}-\d{2}-\d{2}$/.test(r.last_checked)) err(id, 'last_checked must be YYYY-MM-DD or null');
  if (r.confidence !== 'unverified') {
    if (!r.official_source_url) err(id, `marked ${r.confidence} but has no official_source_url`);
    if (!r.last_checked) err(id, `marked ${r.confidence} but has no last_checked date`);
    if (!r.verified_fields?.length) err(id, `marked ${r.confidence} but lists no verified_fields`);
  } else if (r.verified_fields?.length) err(id, 'unverified row lists verified_fields');
  for (const f of r.verified_fields ?? []) if (!LEGAL.includes(f)) err(id, `verified_fields has unknown field ${f}`);
  const strings = Object.entries(r).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : [[k, v]]))
    .filter(([k, v]) => typeof v === 'string' && k !== 'notes'); // notes may quote broken live values
  for (const [k, v] of strings) for (const re of BAD_TEXT) if (re.test(v)) err(id, `${k} contains banned text ${re}`);
}

const count = (fn) => rows.filter(fn).length;
console.log(`cities.json: ${rows.length} rows`);
for (const c of CONFIDENCE) console.log(`  ${c}: ${count((r) => r.confidence === c)}`);
console.log('  field coverage (non-null / total):');
for (const k of [...LEGAL, 'official_source_url', 'last_checked', 'best_season']) {
  console.log(`    ${k.padEnd(20)} ${count((r) => r[k] !== null)}/${rows.length}`);
}
if (rows.length !== 100) console.log(`  note: expected 100 cities, found ${rows.length}`);
if (errors.length) {
  console.error(`\nFAILED with ${errors.length} error(s):`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log('\nData check passed.');
