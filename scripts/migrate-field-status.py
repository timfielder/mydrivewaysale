#!/usr/bin/env python3
"""One-time migration (2026-10-27): restore every field from Tim's location_rules_database.json,
keep each original row verbatim under `original`, and replace `verified_fields` with a per-field
`field_status` map that covers every data field, legal or not."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMP = os.path.join(ROOT, "_import")
rows = json.load(open(os.path.join(ROOT, "data", "cities.json")))
orig = {(d["city_name"].lower(), d["state_code"].lower()): d for d in json.load(open(os.path.join(ROOT, "location_rules_database.json")))}
sc = {c["slug"]: c for c in json.load(open(os.path.join(IMP, "supportedCities.json")))}

DATA_FIELDS = ["city", "state", "county", "region", "sale_term", "permit_required", "fee", "sales_per_year",
               "max_days", "hours", "sign_rules", "how_to_apply", "permit_link", "best_season", "cross_posting"]
# our field <- Tim's field (None = new field with no original)
MAP = {"city": "city_name", "state": "state_code", "county": "county", "region": "region", "sale_term": "sale_dialect",
       "permit_required": "permit_required", "fee": "permit_cost", "permit_link": "permit_link", "sign_rules": "signage_rules",
       "best_season": "best_weekends", "cross_posting": "local_crosspost_sites",
       "sales_per_year": None, "max_days": None, "hours": None, "how_to_apply": None}

# per-field sources from every verification batch, applied in order
sources = {}
for fname in ["verified-2026-10-27.json", "verified-batch2-2026-10-27.json", "verified-batch3-2026-10-27.json"]:
    b = json.load(open(os.path.join(IMP, fname)))
    for slug, v in b.items():
        if slug.startswith("_"): continue
        fields = v.get("verified_fields") or list(v.get("set", {}).keys())
        for f in fields:
            src = v.get("field_sources", {}).get(f) or v.get("official_source_url")
            sources.setdefault(slug, {})[f] = src

audit = []
out = []
for r in rows:
    c = sc[r["slug"]]
    o = orig[(c["city"], c["state"])]
    r["original"] = o  # verbatim
    r.setdefault("county", o["county"])
    r.setdefault("region", o["region"])
    r.setdefault("permit_link", None if o["permit_link"] == "N/A" else o["permit_link"])
    ver = set(r.pop("verified_fields", []))
    fs = {}
    for f in DATA_FIELDS:
        if f in ver:
            src = sources.get(r["slug"], {}).get(f) or r["official_source_url"]
            fs[f] = {"verified": True, "source": src, "checked": r["last_checked"], "origin": "official_source"}
        else:
            ofield = MAP[f]
            ov = o.get(ofield) if ofield else None
            if ofield == "permit_link" and ov == "N/A": ov = None
            if ofield == "permit_required": pass
            # audit: unverified field whose value no longer matches Tim's original
            cur = r.get(f)
            expected = ov
            if ofield == "state_code": expected = ov
            if ofield in ("city_name",): expected = ov
            if ofield and cur != expected:
                if cur is None and expected is not None:
                    audit.append((r["slug"], f, "blanked", expected))
                    r[f] = expected
                else:
                    audit.append((r["slug"], f, "differs", cur, expected))
            fs[f] = {"verified": False, "source": None, "checked": None,
                     "origin": "original_db" if (ofield and r.get(f) is not None) else "none"}
    r["field_status"] = fs
    order = ["slug"] + DATA_FIELDS + ["official_source_url", "last_checked", "confidence", "field_status", "notes", "original"]
    out.append({k: r[k] for k in order})
json.dump(out, open(os.path.join(ROOT, "data", "cities.json"), "w"), indent=2, ensure_ascii=False)
print("rows", len(out))
for a in audit: print("AUDIT", a)
