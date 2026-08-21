#!/usr/bin/env python3
"""
Build public/data/WBJEE/wbjee_data.json from the canonical wbjee parquet —
the same rows BigQuery serves, so app and warehouse cannot drift.

2026 only (the live cycle): for each (institute, program, seat_type, quota,
category) bucket, the deepest closing across Rounds 1-3, with the round that
set it. All college types shown, labelled — the student filters.

Category values are 2026's own vocabulary (post OBC-A/B merge), used verbatim
as the dropdown options so label==value exact-match filtering holds.
"""
import json
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
PARQUET = Path("/Users/surya/jan2023/external_data_sources/wbjee/clean/wbjee_fact_cutoffs.parquet")
OUT = REPO / "public/data/WBJEE/wbjee_data.json"

CT_LABEL = {"Govt": "Government", "Govt-Aided": "Government Aided",
            "State-Univ-Dept": "State University", "Private/SF": "Private",
            "Private/Deemed": "Private"}

df = pd.read_parquet(PARQUET)
df = df[(df.exam_year == 2026) & df.closing_rank.notna()]

# deepest closing per bucket across rounds, keeping the round that set it
df = df.sort_values("closing_rank")
last = df.groupby(
    ["institute", "program", "stream", "seat_type", "quota", "category_raw"],
    dropna=False).tail(1)

rows = []
for r in last.itertuples():
    rows.append({
        "Institute": r.institute,
        "State": "West Bengal",
        "Academic Program Name": r.program,
        "Stream": r.stream,
        "Seat Type": r.seat_type,
        "Quota": r.quota,
        "Category": r.category_raw,
        "College Type": CT_LABEL[r.college_type],
        "Opening Rank": str(int(r.opening_rank)) if pd.notna(r.opening_rank) else "",
        "Closing Rank": str(int(r.closing_rank)),
        "Round": r.round,
        "Year": "2026",
    })
OUT.write_text(json.dumps(rows, indent=1))

from collections import Counter
print(f"wbjee_data.json: {len(rows)} rows")
print("Category:", dict(Counter(x["Category"] for x in rows)))
print("Quota:", dict(Counter(x["Quota"] for x in rows)))
print("Seat Type:", dict(Counter(x["Seat Type"] for x in rows)))
print("College Type:", dict(Counter(x["College Type"] for x in rows)))
