#!/usr/bin/env python3
"""
Build public/data/JACCHD/jacchd_data.json from the canonical jacchd parquet
- the same rows BigQuery serves, so app and warehouse cannot drift.

The input is a JEE Main (Paper 1) rank, so only rank_basis = 'JEE Main
Paper 1' rows are kept: CCA's B.Arch (Paper 2) and the Defence / Sports
merit-list positions sit on other scales. The SPOT round is left out too:
it fills leftover seats at ranks several times deeper than Round 3, so it
would promise seats that are rarely there.

One row per (institute, programme, quota, category): the loosest closing
over Rounds 1-3 and Special, with the round it came from.
"""
import json
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
PARQUET = REPO.parent / "external_data_sources/jacchd/clean/jacchd_fact_cutoffs.parquet"
OUT = REPO / "public/data/JACCHD/jacchd_data.json"

# canonical code -> the label students pick (examConfig options match these)
CATEGORY_LABEL = {
    "GEN": "General",
    "EWS": "EWS",
    "EWS-TFW": "EWS, tuition fee waiver seats",
    "OBC": "OBC / BC",
    "SC": "SC",
    "ST": "ST",
    "PWD": "PwD",
    "OBC-PWD": "OBC PwD",
    "RURAL": "Rural area",
    "BORDER": "Border area",
    "GIRL-CHILD": "One of only two girl children",
    "KM": "Kashmiri migrant",
    "PU-WARD": "Ward of a Panjab University employee",
    "ORPHAN": "Orphan",
    "FREEDOM-FIGHTER": "Child or grandchild of a freedom fighter",
    "THALASSEMIA": "Thalassemia patient",
    "CANCER": "Cancer patient",
}

df = pd.read_parquet(PARQUET)
df = df[(df.rank_basis == "JEE Main Paper 1") & (df["round"] != "SPOT Round")]
missing = set(df.category) - set(CATEGORY_LABEL)
assert not missing, f"no label for categories: {missing}"

df = df.sort_values(["closing_rank", "round_order"])
last = df.groupby(["institute", "programme_raw", "quota", "category"]).tail(1)

rows = [{
    "Institute": r.institute,
    "State": r.state,
    "Academic Program Name": r.programme_raw,
    "Quota": r.quota,
    "Category": CATEGORY_LABEL[r.category],
    "Round": r.round,
    "Opening Rank": str(int(r.opening_rank)),
    "Closing Rank": str(int(r.closing_rank)),
    "Year": str(r.year),
} for r in last.sort_values(["institute", "programme_raw", "quota", "category"]).itertuples()]

OUT.write_text(json.dumps(rows, indent=1))

from collections import Counter
print(f"jacchd_data.json: {len(rows)} rows")
print("Category:", dict(Counter(x["Category"] for x in rows)))
print("Quota:", dict(Counter(x["Quota"] for x in rows)))
print("Round:", dict(Counter(x["Round"] for x in rows)))
