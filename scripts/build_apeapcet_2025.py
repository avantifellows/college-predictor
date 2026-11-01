#!/usr/bin/env python3
"""
Build public/data/APEAPCET/apeapcet_data.json from the canonical apeapcet
parquet - the same rows BigQuery serves, so app and warehouse cannot drift.

2025 (the newest cycle APSCHE has published in full). Every category x
gender cell becomes a row; the dropdowns offer decoded "CODE - description"
labels and the filter compares the code (the KEAM pattern).

College types collapse for display: the SF and SS sub-pools are both
"University (Self-finance)" to the student - same campus, higher fees.
Branch names come from external_data_sources/apeapcet/branch_codes.csv (the
official EAPCET course list, as on the Colleges tab); the code is kept too.
B.Pharm and Pharm-D (PHM, PHD) are filled on the same engineering-stream
rank: "Stream" lets the form serve them under Pharmacy.
"""
import csv
import json
import re
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
PARQUET = REPO.parent / Path("external_data_sources/apeapcet/clean/apeapcet_fact_cutoffs.parquet")
OUT = REPO / "public/data/APEAPCET/apeapcet_data.json"
LEGEND = PARQUET.parent.parent / "branch_codes.csv"
PHARMACY = {"PHM", "PHD"}

# title case, then the acronyms it lowers back
ACRONYM = re.compile(r"\b(Cse|Iot|Vlsi)\b")


def display(name):
    t = name.replace(" (MPC STREAM)", "").title()
    return ACRONYM.sub(lambda m: {"Cse": "CSE", "Iot": "IoT", "Vlsi": "VLSI"}[m[1]], t)


with open(LEGEND) as fh:
    BRANCH = {r["branch_code"]: display(r["branch_name"]) for r in csv.DictReader(fh)}

CT_LABEL = {"Univ-Govt": "Government University",
            "Univ-SelfFin": "University (Self-finance)",
            "Univ-SelfSup": "University (Self-finance)",
            "Private": "Private",
            "Private-Univ": "Private University"}

df = pd.read_parquet(PARQUET)

rows = [{
    "Institute": r.college_name,
    "College Code": r.college_code,
    "State": "Andhra Pradesh",
    "Academic Program Name": BRANCH[r.branch_code],
    "Branch Code": r.branch_code,
    "Stream": "Pharmacy" if r.branch_code in PHARMACY else "Engineering",
    "District": r.district,
    "Region": r.local_area,
    "Category": r.category_code,
    "Gender": r.gender,
    "College Type": CT_LABEL[r.college_type],
    "Closing Rank": str(int(r.closing_rank)),
    "Year": "2025",
} for r in df.itertuples()]

OUT.write_text(json.dumps(rows, indent=1))

from collections import Counter
print(f"apeapcet_data.json: {len(rows)} rows")
print("Category:", dict(Counter(x["Category"] for x in rows)))
print("Region:", dict(Counter(x["Region"] for x in rows)))
print("College Type:", dict(Counter(x["College Type"] for x in rows)))
print("Stream:", dict(Counter(x["Stream"] for x in rows)))
