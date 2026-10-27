#!/usr/bin/env python3
"""Apply a verification batch file to data/cities.json and append a change log.
Usage: apply-verification.py <batch.json> <log.md> <YYYY-MM-DD>"""
import json, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
batch_path, log_path, date = sys.argv[1], sys.argv[2], sys.argv[3]
batch = json.load(open(batch_path))
path = os.path.join(ROOT, "data", "cities.json")
rows = json.load(open(path)); by = {r["slug"]: r for r in rows}
fmt = lambda v: "null" if v is None else (("Yes" if v else "No") if isinstance(v, bool) else str(v)).replace("|", "/")
lines = []
LEGAL = ["permit_required", "fee", "sales_per_year", "max_days", "hours", "sign_rules", "how_to_apply"]
for slug, b in batch.items():
    if slug.startswith("_"): continue
    r = by[slug]
    for field, new in b["set"].items():
        old = r[field]
        flag = "same" if old == new else "CHANGED"
        lines.append(f"| {r['city']}, {r['state']} | {field} | {fmt(old)} | {fmt(new)} | {flag} | {b.get('field_sources', {}).get(field) or b.get('official_source_url') or r['official_source_url']} |")
        r[field] = new
        r["field_status"][field] = {"verified": True, "checked": date, "origin": "official_source",
                                    "source": b.get("field_sources", {}).get(field) or b.get("official_source_url") or r["official_source_url"]}
    merge = b.get("merge", False)
    for field in ("confidence", "official_source_url", "last_checked"):
        if field == "confidence" and "confidence" not in b: continue
        new = {"confidence": b.get("confidence"), "official_source_url": b.get("official_source_url") or r["official_source_url"], "last_checked": date}[field]
        if r[field] == new: continue
        lines.append(f"| {r['city']}, {r['state']} | {field} | {fmt(r[field])} | {fmt(new)} | meta | {new if field == 'official_source_url' else ''} |")
        r[field] = new
    if merge:
        r["notes"] = (r["notes"] + " " if r["notes"] else "") + f"[{date} update] " + b["notes"]
    else:
        # full re-check: legal fields not confirmed this time lose their verified flag (value kept, see original)
        for f in LEGAL:
            if f not in b["set"] and r["field_status"][f]["verified"]:
                r["field_status"][f] = {"verified": False, "source": None, "checked": None,
                                        "origin": "original_db" if r[f] is not None else "none"}
        live_note = r["notes"]
        r["notes"] = b["notes"] + (" " + live_note if live_note else "")
    if not b["set"]:
        lines.append(f"| {r['city']}, {r['state']} | (no field change) | | | note only | {b.get('official_source_url') or r['official_source_url']} |")
json.dump(rows, open(path, "w"), indent=2, ensure_ascii=False)
new_file = not os.path.exists(log_path)
with open(log_path, "a") as f:
    if new_file:
        f.write("# MyDrivewaySale verification log\n\nEvery data change to data/cities.json, with the official source. 'same' = the live site already had this value; 'CHANGED' = the live site differs. Fields not listed stay unverified and render as 'Unknown, check with your city'.\n")
    f.write(f"\n## Batch: {os.path.basename(batch_path)} (checked {date})\n\n| City | Field | Old (live site) | New | Status | Source |\n|---|---|---|---|---|---|\n")
    f.write("\n".join(lines) + "\n")
print("applied", sum(not k.startswith("_") for k in batch), "cities")
