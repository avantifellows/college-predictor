#!/usr/bin/env python3
"""
Build public/data/APEAPCET/apeapcet_data.json from the canonical apeapcet
parquet - the same rows BigQuery serves, so app and warehouse cannot drift.

2025 (the newest cycle APSCHE has published in full). Every category x
gender cell becomes a row; the dropdowns offer decoded "CODE - description"
labels and the filter compares the code (the KEAM pattern).

College types collapse for display: the SF and SS sub-pools are both
"University (Self-finance)" to the student - same campus, higher fees.
branch_code stays verbatim: the source ships no legend and a wrong
expansion is worse than a code students already know from web options.
"""
import json
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
PARQUET = REPO.parent / Path("external_data_sources/apeapcet/clean/apeapcet_fact_cutoffs.parquet")
OUT = REPO / "public/data/APEAPCET/apeapcet_data.json"

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
    "Academic Program Name": r.branch_code,
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
