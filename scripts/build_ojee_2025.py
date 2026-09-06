#!/usr/bin/env python3
"""
Build public/data/OJEE/ojee_data.json from the canonical ojee parquet - the
same rows BigQuery serves, so app and warehouse cannot drift.

B.Tech family ONLY (rank_family = 'btech-jeemain'): the app's input is a
JEE Main rank, and the document's B.Arch/B.Plan and film-institute rows sit
on entirely different rank scales - showing them against a JEE Main rank
would mislead. The one bucket the source prints twice (BPUT integrated CSE)
collapses to its deepest closing, WBJEE-rounds style.

TFW is offered as its own category option (the WBJEE pattern): a separate
seat pool with its own curve.
"""
import json
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
PARQUET = REPO.parent / Path("external_data_sources/ojee/clean/ojee_fact_cutoffs.parquet")
OUT = REPO / "public/data/OJEE/ojee_data.json"

df = pd.read_parquet(PARQUET)
df = df[df.rank_family == "btech-jeemain"]

df = df.sort_values("closing_rank")
last = df.groupby(["institute", "programme", "category_raw", "seat_type", "quota", "tfw"],
                  dropna=False).tail(1)

rows = [{
    "Institute": r.institute,
    "State": "Odisha",
    "Academic Program Name": r.programme,
    "Category": "TFW" if r.tfw else r.category_raw,
    "Seat Type": r.seat_type,
    "Quota": r.quota,
    "Opening Rank": str(int(r.opening_rank)),
    "Closing Rank": str(int(r.closing_rank)),
    "Year": "2025",
} for r in last.itertuples()]

OUT.write_text(json.dumps(rows, indent=1))

from collections import Counter
print(f"ojee_data.json: {len(rows)} rows")
print("Category:", dict(Counter(x["Category"] for x in rows)))
print("Seat Type:", dict(Counter(x["Seat Type"] for x in rows)))
print("Quota:", dict(Counter(x["Quota"] for x in rows)))
