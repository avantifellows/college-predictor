#!/usr/bin/env python3
"""
Add the seven fact-table tracks to the predictor: Assam, Jammu & Kashmir,
Himachal Pradesh (proper), Manipur, Tripura, Mizoram, Chandigarh.

SOURCE — external_data_sources' clean parquet (the same rows BigQuery serves),
so the app and the warehouse cannot drift. This REVERSES the earlier deliberate
exclusion of these states ("per-student lists / one-college states"): the
extension work turned them into real closing-rank lists (Assam 16 colleges,
J&K ~10, HP 7), which is what a predictor row needs.

Rules:
  - Himachal REPLACES the old thin rows (source himachal_2025_r3_cutoffs, 34
    rows, General-only) — the same "SOURCE = THEIRS" call the matrix made.
  - Categories stay state-authentic (the standing labelled-state-codes choice):
    Assam keeps ST(P)/ST(H), J&K keeps OM. Category Label carries the expansion.
  - Restricted sub-pools (J&K RBA/ALC, Assam Ex-Serviceman/Sports, NRI) are NOT
    imported — the predictor's base lists show open-merit category seats.
  - track='All India' rows (the AIQ seats hosted at ZMCH/GMCH-32) are NOT
    imported — MCC's AIQ file already covers those colleges in the app.
"""
import json
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
PARQUET = Path("/Users/surya/jan2023/external_data_sources/neet/clean/neet_fact_cutoffs.parquet")
NEETUG = REPO / "public/data/NEETUG/NEETUG.json"
STATE_CATS = REPO / "public/data/NEETUG/neet_state_categories.json"

TRACKS = ["Assam", "Jammu & Kashmir", "Himachal Pradesh", "Manipur",
          "Tripura", "Mizoram", "Chandigarh"]

LABELS = {
    "UR": "Unreserved / General", "General": "General", "Gen": "General",
    "EWS": "EWS", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "Scheduled Caste",
    "ST": "Scheduled Tribe", "OM": "Open Merit (J&K General)",
    "OBC/MOBC(NCL)": "OBC / MOBC (Non-Creamy Layer)",
    "ST(P)": "Scheduled Tribe (Plains)", "ST(H)": "Scheduled Tribe (Hills)",
}

df = pd.read_parquet(PARQUET)
df = df[df.track.isin(TRACKS)]
df = df[df.sub_pool.isin(["", "plains", "hills"])]      # base pools only
df = df[df.category.notna()]                             # no residual quotas

rows = []
for r in df.itertuples():
    rows.append({
        "Institute": r.institute, "Address": "", "State": r.track,
        "Seat Type": "State Quota",
        "College Type": {"Govt": "Govt", "Govt-Aided": "Govt", "Private": "Private"}.get(r.college_type, r.college_type or ""),
        "Academic Program Name": r.program,
        "Category": r.category_raw,
        "Category Label": LABELS.get(r.category_raw, r.category_raw),
        "Gender": "Gender-Neutral",
        "Closing Rank": str(int(r.closing_rank)),
        "Round": r.round, "rank_space": "NEET AIR", "Source": r.source,
    })

D = json.load(open(NEETUG))
before = len(D)
new_sources = {r["Source"] for r in rows} | {"himachal_2025_r3_cutoffs"}
D = [r for r in D if r.get("Source") not in new_sources]      # idempotent + HP swap
D.extend(rows)
json.dump(D, open(NEETUG, "w"), indent=1)

# per-state category codes for the Edit-Filters dropdown
sc = json.load(open(STATE_CATS))
for t in TRACKS:
    codes = sorted({r["Category"] for r in rows if r["State"] == t})
    if codes:
        sc[t] = [{"value": c, "label": f"{c} — {LABELS.get(c, c)}" if LABELS.get(c, c) != c else c}
                 for c in codes]
json.dump(sc, open(STATE_CATS, "w"), indent=1)

from collections import Counter
print(f"NEETUG.json: {before} -> {len(D)} rows")
for t in TRACKS:
    n = sum(1 for r in rows if r["State"] == t)
    cats = sorted({r["Category"] for r in rows if r["State"] == t})
    print(f"  {t:18} +{n:3}  cats={','.join(cats)}")
