#!/usr/bin/env python3
"""
Build public/data/UPTAC/uptac_data.json from the canonical uptac parquet —
the same rows BigQuery serves.

B.Tech on JEE Main ranks only (rank_basis 'JEE Main rank'): the input is a
JEE Main rank, and UPTAC's own round merit lists (Class 12 marks, CUET…)
are another scale. Two row sets, because domicile decides the rounds:
  Domicile = "UP"   loosest closing over every round (R1-R4, special)
  Domicile = "Any"  special round only — the only seats open to students
                    from outside U.P. (open category / TFW there)
One row per (institute, branch, seat pool, category code, seat gender).
"""
import json
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
PARQUET = REPO.parent / "external_data_sources/uptac/clean/uptac_fact_cutoffs.parquet"
OUT = REPO / "public/data/UPTAC/uptac_data.json"

df = pd.read_parquet(PARQUET)
df = df[(df.rank_basis == "JEE Main rank") & df.allotted & df.programme.str.startswith("B.Tech (All")]
key = ["institute", "branch", "tfw", "seat_pool", "category_raw", "seat_gender"]


def loosest(d, domicile):
    d = d.assign(best_opening=d.groupby(key, dropna=False).opening_rank.transform("min"))
    d = d.sort_values(["closing_rank", "round_no"])
    last = d.groupby(key, dropna=False).tail(1)
    return [{
        "Institute": r.institute,
        "State": "Uttar Pradesh",
        "Academic Program Name": r.branch + (" (fee waiver)" if r.tfw else "")
                                 + (f" ({r.seat_pool.lower()})" if isinstance(r.seat_pool, str) else ""),
        "Branch": r.branch,
        "Category": r.parent_category,
        "Sub Category": r.sub_category or "None",
        "Seat Gender": r.seat_gender,
        "Domicile": domicile,
        "Round": r.round_label.split(": ", 1)[-1],
        "Opening Rank": str(int(r.best_opening)),
        "Closing Rank": str(int(r.closing_rank)),
        "Year": str(r.year),
    } for r in last.itertuples()]


rows = loosest(df, "UP") + loosest(df[df.round_no == 6], "Any")
rows.sort(key=lambda x: (x["Domicile"], x["Institute"], x["Academic Program Name"], x["Category"], x["Sub Category"]))
OUT.write_text(json.dumps(rows, indent=1))
from collections import Counter
print(f"uptac_data.json: {len(rows)} rows, {len({x['Institute'] for x in rows})} institutes")
print("Domicile:", dict(Counter(x["Domicile"] for x in rows)))
print("Category:", dict(Counter(x["Category"] for x in rows)))
print("Sub Category:", dict(Counter(x["Sub Category"] for x in rows)))
print("Seat Gender:", dict(Counter(x["Seat Gender"] for x in rows)))
