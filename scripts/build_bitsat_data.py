#!/usr/bin/env python3
"""
Build public/data/BITSAT/bitsat_data.json from the bitsat fact
(external_data_sources/bitsat: BITS's own cut-off page, 2017-18 to 2026-27).

One row per campus x programme for the latest admission year. BITS has no
category reservation, so the student's BITSAT score (of 390) is compared with
one cut-off. Earlier years on the same 390 scale (2022 on) ride along as
'Previous Years' for Show More; the 450-scale years (until 2021) are left out
of that line so no one compares across scales.
"""
import json
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
PARQUET = REPO.parent / "external_data_sources/bitsat/clean/bitsat_fact_cutoffs.parquet"
OUT = REPO / "public/data/BITSAT/bitsat_data.json"

INSTITUTE = {"Pilani": "BITS Pilani, Pilani Campus",
             "K K Birla Goa": "BITS Pilani, K K Birla Goa Campus",
             "Hyderabad": "BITS Pilani, Hyderabad Campus"}

df = pd.read_parquet(PARQUET)
latest = df.exam_year.max()
now = df[df.exam_year == latest]
rows = []
for r in now.sort_values(["campus", "cutoff_score"], ascending=[True, False]).itertuples():
    prev = df[(df.campus == r.campus) & (df.program == r.program) &
              (df.exam_year < latest) & (df.max_score == r.max_score)].sort_values("exam_year", ascending=False)
    rows.append({
        "Institute": INSTITUTE[r.campus],
        "Campus": r.campus,
        "Academic Program Name": r.program,
        "Cutoff Score": int(r.cutoff_score),
        "Out Of": int(r.max_score),
        "Previous Years": " · ".join(f"{p.exam_year}: {p.cutoff_score}" for p in prev.itertuples()) or None,
        "Year": str(latest),
    })
OUT.write_text(json.dumps(rows, indent=1))
print(f"bitsat_data.json: {len(rows)} rows (BITSAT {latest})")
