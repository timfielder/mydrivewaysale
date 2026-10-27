#!/usr/bin/env python3
"""One-time generator: live values (_import/live_city_values.json) + verified spot checks
-> data/cities.json. After this, data/cities.json is the source of truth and is edited directly."""
# NOTE: predates field_status (2026-10-27). Do not re-run; see scripts/migrate-field-status.py.
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMP = os.path.join(ROOT, "_import")
cities = json.load(open(os.path.join(IMP, "supportedCities.json")))
live = {r["slug"]: r for r in json.load(open(os.path.join(IMP, "live_city_values.json")))}
db = {(d["city_name"].lower(), d["state_code"].lower()): d for d in json.load(open(os.path.join(ROOT, "location_rules_database.json")))}
ver = json.load(open(os.path.join(IMP, "verified-2026-10-27.json")))
SALE_TERM_BY_SLUG = {"garage": "Garage Sale", "yard": "Yard Sale", "tag": "Tag Sale", "rummage": "Rummage Sale"}

rows = []
for c in cities:
    L = live[c["slug"]]; d = db[(c["city"], c["state"])]
    cross = (L["cross_posting_raw"] or "").rstrip('"]').strip()
    slug_term = SALE_TERM_BY_SLUG[re.search(r"-(garage|yard|tag|rummage)-sale-guide$", c["slug"]).group(1)]
    notes = []
    if L["permit_link_raw"]:
        notes.append(f"Live site permit link is broken: {L['permit_link_raw']}")
    if slug_term != d["sale_dialect"]:
        notes.append(f"URL slug says '{slug_term}' but live data says '{d['sale_dialect']}'.")
    row = {
        "slug": c["slug"],
        "city": d["city_name"],
        "state": d["state_code"],
        "sale_term": d["sale_dialect"],
        "permit_required": {"Yes": True, "No": False}.get(L["permit_required"]),
        "fee": L["fee"],
        "sales_per_year": None,
        "max_days": None,
        "hours": None,
        "sign_rules": L["sign_rules"],
        "how_to_apply": None,
        "official_source_url": None,
        "last_checked": None,
        "confidence": "unverified",
        "verified_fields": [],
        "best_season": L["best_season"],
        "cross_posting": [x.strip() for x in cross.split(",") if x.strip()],
        "notes": " ".join(notes) or None,
    }
    if c["slug"] in ver:
        v = ver[c["slug"]]
        live_vals = f"Before verification the live site said: permit {L['permit_required']}, fee {L['fee']}, signs '{L['sign_rules']}'."
        for k in ("permit_required", "fee", "sales_per_year", "max_days", "hours", "sign_rules", "how_to_apply", "official_source_url", "verified_fields"):
            row[k] = v[k]
        row["notes"] = " ".join(x for x in (v["notes"], live_vals, row["notes"]) if x)
        row["confidence"] = "verified"
        row["last_checked"] = "2026-10-27"
    rows.append(row)
json.dump(rows, open(os.path.join(ROOT, "data", "cities.json"), "w"), indent=2, ensure_ascii=False)
print("wrote", len(rows), "rows;", sum(r["confidence"] == "verified" for r in rows), "verified")
