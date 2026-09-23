#!/usr/bin/env python3
"""
Build public/data/ICARUG/icarug_data.json from the canonical icarug parquet
— the same rows BigQuery serves.

The input is CUET marks (the three subjects ICAR counts, out of 750):
ICAR's ranks are stream-wise and not comparable, marks are. One row per
(university, course, category): the lowest marks allotted over home states
and all five rounds, with the round it came from. University names are the
Colleges tab's own, so rows link to their cards.
"""
import json
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
PARQUET = REPO.parent / "external_data_sources/icarug/clean/icarug_fact_cutoffs.parquet"
OUT = REPO / "public/data/ICARUG/icarug_data.json"

df = pd.read_parquet(PARQUET)
df = df.sort_values(["marks_start", "round_order"], ascending=[True, False])
low = df.groupby(["university", "course", "course_raw", "category"]).head(1)

rows = [{
    "Institute": r.university,
    "State": r.university_state,
    "Academic Program Name": r.course,
    "Course Raw": r.course_raw,
    "Category": r.category,
    "Round": r.round,
    "Cutoff Marks": round(float(r.marks_start), 2),
    "Year": str(r.year),
} for r in low.sort_values(["university", "course", "category"]).itertuples()]

OUT.write_text(json.dumps(rows, indent=1))
from collections import Counter
print(f"icarug_data.json: {len(rows)} rows, {len({x['Institute'] for x in rows})} universities")
print("Category:", dict(Counter(x["Category"] for x in rows)))
