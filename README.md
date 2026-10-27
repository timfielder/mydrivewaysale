# MyDrivewaySale (static rebuild)

Astro static site generated from one data file. Local work only; nothing here is deployed.

- `data/cities.json`: one row per city (100). Source of truth. Rows are `unverified` until checked against an official source.
- `data/pages.json`: the 18 existing WordPress pages (stubs for now). `data/url-inventory.csv`: every live URL to preserve.
- `src/lib/site-config.mjs`: site URL, Amazon tag (`mydrivewaysal-20`), BeamMe link, and `SHOW_UNVERIFIED_VALUES` (false: unverified legal fields show "Unknown, check with your city").
- `scripts/check-data.mjs`: schema and trust check, runs before every build (`npm run check:data`).
- `_import/`: raw copies of the live site and official sources pulled 2026-10-27, plus `LIVE-SOURCE-FINDINGS.md`.
- `location_rules_database.json`: Tim's original 2026-07-09 upload, kept for reference.

Needs Node 22.23.4+ (see `.nvmrc`). `npm install && npm run build` writes to `dist/`.
