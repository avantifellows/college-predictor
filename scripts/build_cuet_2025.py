#!/usr/bin/env python3
"""
Build public/data/CUET/cuet_data.json from the DU and BHU cutoff facts
(external_data_sources/ducuet and bhuug) — the same rows BigQuery serves.

DU and BHU don't admit on one CUET total. Each course adds up its own set of
papers (DU B.Sc. Physics: Physics + Chemistry + Maths; BHU B.A.: English or
Hindi + GAT), so the student's score is different for every course. Each row
carries the id of its course's rule (utils/cuetRules.js holds the rules, from
the 2025 bulletins); the API adds up the student's paper scores per rule and
compares that with the cutoff.

One row per (college, course, category[, BHU seat type]): the lowest score
allotted over the published rounds (DU 1-3, BHU Round 1 and Spot Round 2).
Courses that also hold a practical or performance test (DU/BHU fine arts,
performing arts) are left out: CUET alone can't place a student there.
"""
import json
import re
from collections import Counter
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
EXT = REPO.parent / "external_data_sources"
DU = EXT / "ducuet/clean/ducuet_fact_cutoffs.parquet"
BHU = EXT / "bhuug/clean/bhuug_fact_cutoffs.parquet"
OUT = REPO / "public/data/CUET/cuet_data.json"

# DU course -> rule id (utils/cuetRules.js). First match wins.
DU_RULES = [
    (r"^B\.?A\.? ?Program", "DU_BA_PROG"),
    (r"^B\.A\. \(Vocational Studies\)", "DU_BA_PROG"),
    (r"^B\.Voc\.? Software", "DU_VOC_SOFTWARE"),
    (r"^B\.Voc", "DU_BA_PROG"),
    (r"^Five Year Integrated Program in Journalism", "DU_JOURNALISM_5YR"),
    (r"Hindi Patrakarita", "DU_HINDI_PATRAKARITA"),
    (r"^B\.A\. \(Hons\.\) Journalism", "DU_JOURNALISM"),
    (r"Multi ?Media and Mass Communication", "DU_MULTIMEDIA"),
    (r"^B\.A\. \(Hons\.\) Business Economics", "DU_L_MATH_GAT"),
    (r"^B\.A\. \(Hons\.\) Economics", "DU_ECONOMICS"),
    (r"^B\.A\. \(Hons\.\) English", "DU_LANG_ENGLISH"),
    (r"^B\.A\. \(Hons\.\) Hindi", "DU_LANG_HINDI"),
    (r"^B\.A\. \(Hons\.\) Urdu", "DU_LANG_URDU"),
    (r"^B\.A\. \(Hons\.\) Bengali", "DU_LANG_BENGALI"),
    (r"^B\.A\. \(Hons\.\) Punjabi", "DU_LANG_PUNJABI"),
    (r"^B\.A\. \(Hons\.\) Sanskrit", "DU_LANG_SANSKRIT"),
    (r"^B\.A\. \(Hons\.\)", "DU_L3"),  # psychology, history, French, ...
    (r"^Bachelor of Elementary Education", "DU_L3"),
    (r"^Bachelor of Management Studies", "DU_L_MATH_GAT"),
    (r"^Bachelor of Business Administration", "DU_L_MATH_GAT"),
    (r"^B\.Tech\. Information Technology", "DU_L_MATH_GAT"),
    (r"^B\.Com \(Hons\.\)", "DU_BCOM_HONS"),
    (r"^B\.Com$", "DU_BCOM"),
    (r"Bio-?Chemistry", "DU_BIOCHEM"),
    (r"Electronics|Instrumentation|Physical Science with Computer",
     "DU_PM_C_OR_CS"),
    (r"Environmental Science|Food Technology", "DU_PC_B_OR_M"),
    (r"Geology", "DU_GEOLOGY"),
    (r"Home Science", "DU_HOME_SCIENCE"),
    (r"Computer Science|Mathematic|Statistics", "DU_L_MATH_2"),
    (r"Anthropology|Biological|Biomedical|Botany|Microbiology|Zoology|"
     r"Life Science", "DU_PCB"),
    (r"Chemistry|Physics|Polymer|Applied Physical Science", "DU_PCM"),
]

# BHU programme -> rule id. Programme names are the fact's cleaned `program`.
BHU_BIO = r"Botany|Zoology|Home Science"
BHU_MATH = r"Mathematics|Statistics|Computer Science|Physics"


def bhu_rule(p):
    if p.startswith("Shastri"):
        return "BHU_SHASTRI"
    if p.startswith("Bachelor of Arts and Bachelor of Legislative Law"):
        return "BHU_L_GAT"
    if p.startswith("Bachelor of Arts"):
        return "BHU_L_GAT"
    if p.startswith("Bachelor of Commerce"):
        return "BHU_BCOM"
    if "Agriculture" in p or "Food Processing" in p:
        return "BHU_AGRI"
    if "Medical Lab Technology" in p:
        return "BHU_L_BIO"
    if p.startswith("Bachelor of Vocation"):
        return "BHU_L_GAT"
    if p.startswith("Bachelor of Technology"):
        return "BHU_PCM"
    if "Radiotherapy" in p:
        return "BHU_PCM_OR_PCB"
    if "Radiology" in p:
        return "BHU_PCB"
    if p.startswith("Bachelor of Science"):
        subj = p.split(" in ", 1)[1]
        bio, math = re.search(BHU_BIO, subj), re.search(BHU_MATH, subj)
        if bio:
            return "BHU_PCB"
        if math:
            return "BHU_PCM"
        return "BHU_PCM_OR_PCB"  # Geography with Earth Science: either group
    return None


def du_rule(p):
    for pattern, rule in DU_RULES:
        if re.search(pattern, p):
            return rule
    return None


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

rows.sort(key=lambda x: (x["University"], x["Institute"],
                         x["Academic Program Name"], x["Category"]))
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(rows, indent=1))
print(f"cuet_data.json: {len(rows)} rows")
print("University:", dict(Counter(x["University"] for x in rows)))
print("Category:", dict(Counter(x["Category"] for x in rows)))
print("Rule:", dict(Counter(x["Rule"] for x in rows)))
