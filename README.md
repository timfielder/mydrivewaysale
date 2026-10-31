# MyDrivewaySale (static rebuild)

Astro static site generated from one data file. Local work only; nothing here is deployed.

- `data/cities.json`: one row per city (100). Source of truth. Rows are `unverified` until checked against an official source.
- `data/pages.json`: the 18 existing WordPress pages (stubs for now). `data/url-inventory.csv`: every live URL to preserve.
- `src/lib/site-config.mjs`: site URL, Amazon tag (`mydriveways0a-20`), StickerCalc and BeamMe store links (`APPS`), and `SHOW_UNVERIFIED_VALUES` (false: unverified legal fields show "Unknown, check with your city").
- `src/lib/ads-config.mjs`: AdSense switch (`ADS_ENABLED`, off), publisher and slot IDs (TODO until AdSense approves the site), and the ad placement map per page type. Nothing ad-related renders while off.
- `src/lib/amazon.mjs`: tagged Amazon search links (no ASINs), product groups, and which pages show which group. `src/components/`: `AdSlot`, `AdSenseLoader`, `AmazonPicks`, `AppPromo`.
- `scripts/check-data.mjs`: schema and trust check, runs before every build (`npm run check:data`).
- `scripts/check-dist.mjs`: runs after every build. Fails on a stray `"]`, the old permit-link tail, `/wp-admin` links, `[INSERT_` placeholders, em or en dashes, untagged Amazon links, ad markup while ads are off, duplicate titles or descriptions, and any city page without a self canonical or sitemap entry.
- `_import/`: raw copies of the live site and official sources pulled 2026-10-27, plus `LIVE-SOURCE-FINDINGS.md`.
- `location_rules_database.json`: Tim's original 2026-07-09 upload, kept for reference.

Needs Node 22.23.4+ (see `.nvmrc`). `npm install && npm run build` writes to `dist/`.
