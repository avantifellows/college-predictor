#!/usr/bin/env python3
"""
Refresh public/data/TNEA/tnea_data.json from the canonical 2025 pipeline.

SOURCE — the clean parquet built by external_data_sources/tnea/ (single source of
truth: college_type from official DOTE codes, district at 100%, categories as TN
publishes them). Local default below; canonical copy at
gs://avantifellows-external-data/tnea/clean/tnea_fact_cutoffs.parquet.

WHAT CHANGES vs the old file (4,952 rows, unknown vintage):
  - 2025 final-round data, all 105 branches (old kept only 11 course groups).
    Course = the dropdown's group where one matches, else the branch name
    title-cased — those rows are reachable via courseType "Any".
  - Categories are exactly TN's 7. The old file's "OBC" (658 rows) and "PwD"
    (4 rows) are not TNEA columns and are gone — dead dropdown options that
    returned wrong or no data (the JAC lesson: every option must be reachable
    and mean what it says).
  - College Type from official DOTE codes, never names. Kept to the app's
    existing 3 labels; the old "University" option had zero rows and goes.
  - NEW columns: Branch (verbatim), State Rank (merit rank of last admit),
    Self Supporting ("Yes" for (SS) sections — costlier streams inside
    govt/aided colleges).

The app compares parseFloat(item["Cutoff Marks"]) <= student's mark and
filters by exact match on Category / Course / District / College Type, so
every value written here must equal a dropdown option verbatim.
"""
import json
import re
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
PARQUET = Path("/Users/surya/jan2023/external_data_sources/tnea/clean/tnea_fact_cutoffs.parquet")
OUT = REPO / "public/data/TNEA/tnea_data.json"

CATEGORY = {"OC": "General/OC", "BC": "BC", "BCM": "BCM", "MBC": "MBC",
            "SC": "SC", "SCA": "SCA", "ST": "ST"}
COLLEGE_TYPE = {"Govt": "State Government",
                "Govt-Aided": "Private Aided (Government Aided)",
                "Private/SF": "Private Un-Aided"}
# branch keyword -> the courseType dropdown's group. First match wins; order matters
# (Biomedical before Electronics, EEE before plain Electrical).
COURSE_GROUPS = [
    (r"BIO ?MEDICAL", "Biomedical"),
    (r"COMPUTER SCIENCE", "Computer Science"),
    (r"INFORMATION TECHNOLOGY", "Information Technology"),
    (r"ELECTRONICS AND COMMUNICATION", "Electronics and Communications (ECE)"),
    (r"ELECTRICAL AND ELECTRONICS", "Electrical and Electronics (EEE)"),
    (r"ELECTRICAL", "Electrical Engineering"),
    (r"MECHANICAL", "Mechanical"),
    (r"\bCIVIL\b", "Civil"),
    (r"AERO ?SPACE|AERONAUTICAL", "Aerospace"),
    (r"AUTOMOBILE", "Automobile"),
    (r"ROBOTICS", "Robotics"),
]

def course_of(branch: str) -> str:
    up = branch.upper()
    for pat, group in COURSE_GROUPS:
        if re.search(pat, up):
            return group
    return re.sub(r"\s+", " ", branch).strip().title()

df = pd.read_parquet(PARQUET)
rows = []
for r in df.itertuples():
    rows.append({
        "Institute ID": str(r.code),
        "Institute": r.college,
        "Course": course_of(r.branch),
        "Branch": r.branch,
        "District": r.district,
        "College Type": COLLEGE_TYPE[r.college_type],
        "Category": CATEGORY[r.category_raw],
        "Cutoff Marks": f"{r.cutoff_mark:g}",
        "State Rank": str(int(r.closing_rank)) if pd.notna(r.closing_rank) else "",
        "Self Supporting": "Yes" if r.self_supporting else "No",
    })
OUT.write_text(json.dumps(rows, indent=1))

from collections import Counter
print(f"tnea_data.json: {len(rows)} rows (was 4,952)")
print("Course groups:", dict(Counter(x['Course'] for x in rows).most_common(12)))
print("Categories   :", dict(Counter(x['Category'] for x in rows)))
print("College Type :", dict(Counter(x['College Type'] for x in rows)))
print("Districts    :", len({x['District'] for x in rows}))
