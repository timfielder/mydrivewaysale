#!/usr/bin/env python3
"""Parse saved live city pages (_import/city_pages) into _import/live_city_values.json
and compare them with the repo's location_rules_database.json. Read only; no network."""
import json, re, html, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMP = os.path.join(ROOT, "_import")
cities = json.load(open(os.path.join(IMP, "supportedCities.json")))
db = json.load(open(os.path.join(ROOT, "location_rules_database.json")))

def label_value(s, label):
    m = re.search(re.escape(label) + r'</span>\s*<div[^>]*>(.*?)</div>', s, re.S)
    return html.unescape(re.sub(r'<[^>]+>', '', m.group(1))).strip() if m else None

def block_after(s, marker):
    i = s.find(marker)
    if i < 0: return None
    m = re.search(r'border-left: 3px solid #E0B42D[^>]*>(.*?)</div>', s[i:], re.S)
    return html.unescape(re.sub(r'<[^>]+>', '', m.group(1))).strip() if m else None

out, diffs = [], []
for c, d in zip(cities, db):
    s = open(os.path.join(IMP, "city_pages", c["slug"] + ".html"), encoding="utf-8").read()
    title = re.search(r'<title>(.*?)</title>', s, re.S).group(1)
    canon = re.search(r'<link rel="canonical" href="([^"]+)"', s)
    link = re.search(r'id="official-permit-btn" href="([^"]*)"', s)
    term = re.search(r'garage sale|yard sale|tag sale|rummage sale', c["slug"].replace("-", " "))
    row = {
        "slug": c["slug"],
        "title": html.unescape(title),
        "canonical": canon.group(1) if canon else None,
        "permit_required": label_value(s, "Permit Required?"),
        "fee": label_value(s, "Estimated Fee"),
        "permit_link_raw": html.unescape(link.group(1)) if link else None,
        "sign_rules": label_value(s, "Local Signage Rules"),
        "best_season": block_after(s, "Timeline Target"),
        "cross_posting_raw": block_after(s, "Cross-Posting Sites"),
        "donation": label_value(s, "Local Donation Routing"),
    }
    out.append(row)
    # compare with repo database file
    cmp = {
        "permit_required": ("Yes" if d["permit_required"] else "No"),
        "fee": d["permit_cost"], "sign_rules": d["signage_rules"],
        "best_season": d["best_weekends"],
        "cross_posting_raw": ", ".join(d["local_crosspost_sites"]) + '"]',
    }
    for k, v in cmp.items():
        if row[k] != v: diffs.append((c["slug"], k, row[k], v))
json.dump(out, open(os.path.join(IMP, "live_city_values.json"), "w"), indent=1, ensure_ascii=False)
print("parsed", len(out), "pages; differences vs location_rules_database.json:", len(diffs))
for x in diffs[:40]: print(x)
