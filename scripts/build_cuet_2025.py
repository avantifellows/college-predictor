#!/usr/bin/env python3
"""
Build public/data/CUET/cuet_data.json from the DU and BHU cutoff facts
(external_data_sources/ducuet and bhuug) — the same rows BigQuery serves.

DU and BHU don't admit on one CUET total. Each course adds up its own set of
papers (DU B.Sc. Physics: Physics + Chemistry + Maths; BHU B.A.: English or
Hindi + GAT), so the student's score is different for every course. Each row
carries the id of its course's rule; the API adds up the student's paper scores per rule and
compares that with the cutoff.

Rules: external_data_sources/cuet (cuet_dim_merit_rules, cuet_dim_program_rules),
written to public/data/CUET/cuet_rules.json for utils/cuetRules.js.

One row per (college, course, category[, BHU seat type]): the lowest score
allotted over the published rounds (DU 1-3, BHU Round 1 and Spot Round 2).
Courses that also hold a practical or performance test (DU/BHU fine arts,
performing arts) are left out: CUET alone can't place a student there.
"""
import json
from collections import Counter
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
EXT = REPO.parent / "external_data_sources"
DU = EXT / "ducuet/clean/ducuet_fact_cutoffs.parquet"
BHU = EXT / "bhuug/clean/bhuug_fact_cutoffs.parquet"
OUT = REPO / "public/data/CUET/cuet_data.json"

# each course's rule and the rules themselves come from the cuet source
# (external_data_sources/cuet: read from the DU / BHU bulletins), the same
# tables BigQuery serves
RULES = EXT / "cuet/clean/cuet_dim_merit_rules.parquet"
PROGRAM_RULES = EXT / "cuet/clean/cuet_dim_program_rules.parquet"
RULES_OUT = REPO / "public/data/CUET/cuet_rules.json"

rule_of = {(r.university, r.program): r.rule_id
           for r in pd.read_parquet(PROGRAM_RULES).itertuples()}


def du_rule(p):
    return rule_of.get(("DU", p))


def bhu_rule(p):
    return rule_of.get(("BHU", p))


# Women's colleges: shown to girls only
BHU_WOMEN = ("Mahila Maha Vidyalaya", "Arya Mahila", "Vasanta College for Women",
             "Vasant Kanya")

du = pd.read_parquet(DU)
bhu = pd.read_parquet(BHU)

rows, missing = [], set()
for r in du.itertuples():
    rule = du_rule(r.program_name)
    if not rule:
        missing.add(("DU", r.program_name))
        continue
    rows.append({
        "University": "Delhi University",
        "Institute": r.college_name,
        "Academic Program Name": r.program_name,
        "Category": r.category,
        "Seat": "Regular",
        "Women Only": r.college_name.endswith("(W)"),
        "Round": "Round " + r.rounds_published.replace(",", ", "),
        "Cutoff Score": round(float(r.min_allocation_score), 2),
        "Rule": rule,
        "Year": "2025",
    })

bhu = bhu[bhu.category != "WARD"]  # wards of BHU employees
bhu = bhu[~bhu.program.str.contains("Fine Arts|Performing Arts")]
bhu = bhu.sort_values(["min_score", "round_order"], ascending=[True, False])
low = bhu.groupby(["program", "college", "fee_type", "category"]).head(1)
for r in low.itertuples():
    rule = bhu_rule(r.program)
    if not rule:
        missing.add(("BHU", r.program))
        continue
    rows.append({
        "University": "BHU",
        "Institute": r.college,
        "Academic Program Name": r.program,
        "Category": "PwBD" if r.category == "PWD" else r.category,
        "Seat": {"regular": "Regular", "paid": "Paid seat",
                 "special": "Special fee seat"}[r.fee_type],
        "Women Only": r.unit.startswith(BHU_WOMEN),
        "Round": r.round,
        "Cutoff Score": round(float(r.min_score), 2),
        "Rule": rule,
        "Year": "2025",
    })

if missing:
    raise SystemExit(f"no rule for {len(missing)} courses:\n" +
                     "\n".join(f"  {u}: {p}" for u, p in sorted(missing)))

rules = pd.read_parquet(RULES)
RULES_OUT.parent.mkdir(parents=True, exist_ok=True)
RULES_OUT.write_text(json.dumps({
    r.rule_id: {"combos": json.loads(r.combinations_json),
                "max": int(r.max_score), "papers": r.papers,
                "prorated": bool(r.prorated),
                "needsLanguage": bool(r.needs_language)}
    for r in rules.itertuples()}, indent=1))

# each row says what its cutoff is out of (career pages print "902 / 1000")
max_of = dict(zip(rules.rule_id, rules.max_score))
for x in rows:
    x["Out Of"] = int(max_of[x["Rule"]])

rows.sort(key=lambda x: (x["University"], x["Institute"],
                         x["Academic Program Name"], x["Category"]))
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(rows, indent=1))
print(f"cuet_data.json: {len(rows)} rows")
print("University:", dict(Counter(x["University"] for x in rows)))
print("Category:", dict(Counter(x["Category"] for x in rows)))
print("Rule:", dict(Counter(x["Rule"] for x in rows)))
