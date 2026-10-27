# Where the live site gets its city data (checked 2026-10-27, public GETs only)

## Result
No public data file. The city values are injected server side when WordPress renders the page.
Nothing under /wp-content/uploads/, the theme, a script URL, inline JS, the REST media library, or Firebase serves them.

Evidence:
- Hub page HTML (/hub/) and its REST content (/wp-json/wp/v2/pages/392) contain the template with defaults
  ("Free / None", "Check local ordinances for pole placement restrictions.", empty permit field). No city data, no JSON, no data-* attributes.
- Each city URL returns the same page 392 with values already filled in the HTML. No fetch/XHR loads them (only Firebase POSTs and Open-Meteo).
- Homepage only embeds supportedCities (city, state, slug) for the search box. Saved: supportedCities.json.
- REST media library: 39 items (23 jpeg, 13 png, 3 pdf). search=json/location/rules/database/cities and mime_type=application/json all return [].
- HEAD probes for location_rules_database.json(.js) at 10 likely paths: all 404. /wp-content/uploads/2026/07/ listing: 403.
- Firebase root read (?shallow=true): "Permission denied". Hub/home only POST to drivewaysale_requests, drivewaysale_leads, broken_links, link_intent_clicks, asset_bypass_clicks.
- REST namespaces include code-snippets/v1 (not touched). Most likely the data sits in a PHP snippet or a server-side file it reads; that can only be confirmed with a login.
- City pages send no Last-Modified header (LiteSpeed cache hit).

## Diff: live rendered values vs GitHub repo file
GitHub: timfielder/mydrivewaysale, main @ 1ff4bcf, location_rules_database.json, committed 2026-07-09 15:32 CDT,
60,137 bytes, sha256 b2d1be57636549fe8bcfe6a2551668b606c01aff84d9e70d3422e91b295bd25a. raw.githubusercontent.com copy: github_location_rules_database.json (byte identical to the clone).

Compared all 100 live city pages (city_pages/, parsed by scripts/import-live.py) field by field:
- permit_required, permit_cost, signage_rules, best_weekends, local_crosspost_sites: 0 differences in 100 rows.
- permit_link: 0 differences once you account for the render bug: live href = permit_link + "+garage+sale+permit']", and "N/A" renders as empty.
- Cross-posting renders as the joined list plus a stray `"]`.
- Same 100 cities, same order as supportedCities.
- county and region are in the file but not shown on the page.

Fields in the file: city_name, county, state_code, region, sale_dialect, permit_required, permit_cost, permit_link,
signage_rules, best_weekends, local_crosspost_sites.
Conclusion: the live site is serving exactly the 2026-07-09 GitHub data. data/cities.json is built from the live rendered values (identical).
