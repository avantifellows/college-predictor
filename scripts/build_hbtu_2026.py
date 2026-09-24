#!/usr/bin/env python3
"""
Build public/data/HBTU/hbtu_data.json from the canonical nicorcr parquet
(board = HBTU, latest year) — the same rows BigQuery serves.

HBTU admits on the JEE Main CRL rank through its own counselling. One row
per (programme, fee-waiver pool, quota, category code): the loosest closing
over that year's rounds. Quota decides who can take the seat: 'Home State'
is U.P. students only, 'All India' is everyone.
"""
import json
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
PARQUET = REPO.parent / "external_data_sources/nicorcr/clean/nicorcr_fact_cutoffs.parquet"
OUT = REPO / "public/data/HBTU/hbtu_data.json"

df = pd.read_parquet(PARQUET)
df = df[df.board == "HBTU"]
year = df.year.max()
df = df[df.year == year]
key = ["programme", "tfw", "quota", "category_raw"]
df = df.assign(best_opening=df.groupby(key).opening_rank.transform("min")).sort_values("closing_rank")
last = df.groupby(key).tail(1)
rows = [{
    "Institute": r.institute,
    "State": "Uttar Pradesh",
    "Academic Program Name": r.programme + (" (fee waiver)" if r.tfw else ""),
    "Branch": r.programme,
    "Category": r.parent_category,
    "Sub Category": r.sub_category or "None",
    "Quota": r.quota,
    "Round": r.round,
    "Opening Rank": str(int(r.best_opening)),
    "Closing Rank": str(int(r.closing_rank)),
    "Year": str(r.year),
} for r in last.sort_values(["programme", "quota", "category_raw"]).itertuples()]
OUT.write_text(json.dumps(rows, indent=1))
from collections import Counter
print(f"hbtu_data.json: {len(rows)} rows ({year})")
print("Quota:", dict(Counter(x["Quota"] for x in rows)), "| Category:", dict(Counter(x["Category"] for x in rows)))
