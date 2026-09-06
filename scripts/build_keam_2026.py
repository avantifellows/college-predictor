#!/usr/bin/env python3
"""
Build public/data/KEAM/keam_data.json from the canonical keam parquet -
the same rows BigQuery serves, so app and warehouse cannot drift.

2026 only (the live cycle), REAL phases only: the 'Trial' allotment is
CEE's mock run and would mislead, so it is excluded. For each (college,
course, category) bucket, the deepest closing across P1/P2 with the phase
that set it.

Categories offered are the 13 published columns + FW (fee waiver), all
with 141+ rows. The long tail of college-specific special-seat codes
(MM, CC, Y-series...) stays in BigQuery and the open-data CSV but out of
the dropdown - each would return a near-empty, misleading result.
"""
import json
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
PARQUET = REPO.parent / Path("external_data_sources/keam/clean/keam_fact_cutoffs.parquet")
OUT = REPO / "public/data/KEAM/keam_data.json"

CATS = ["SM", "EZ", "MU", "LA", "DV", "VK", "BH", "BX", "KN", "KU",
        "SC", "ST", "EW", "FW"]

df = pd.read_parquet(PARQUET)
df = df[(df.exam_year == 2026) & df.phase.isin(["P1", "P2"])
        & df.category_raw.isin(CATS) & df.closing_rank.notna()]

df = df.sort_values("closing_rank")
last = df.groupby(["college_code", "course", "category_raw"], dropna=False).tail(1)

rows = [{
    "Institute": r.college_name,
    "College Code": r.college_code,
    "State": "Kerala",
    "Academic Program Name": r.course,
    "Category": r.category_raw,
    "College Type": "Government/Aided" if r.college_type == "Govt" else "Private (Self-financing)",
    "Closing Rank": str(int(r.closing_rank)),
    "Phase": r.phase,
    "Year": "2026",
} for r in last.itertuples()]

OUT.write_text(json.dumps(rows, indent=1))

from collections import Counter
print(f"keam_data.json: {len(rows)} rows")
print("Category:", dict(Counter(x["Category"] for x in rows)))
print("College Type:", dict(Counter(x["College Type"] for x in rows)))
print("Phase:", dict(Counter(x["Phase"] for x in rows)))
