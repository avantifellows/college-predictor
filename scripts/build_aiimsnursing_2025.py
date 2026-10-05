#!/usr/bin/env python3
"""
Build public/data/AIIMSNURSING/aiimsnursing_data.json from the canonical
aiimsnursing parquet — the same rows BigQuery serves.

One row per (institute, seat category): the loosest closing over the two
2025 rounds, with the round it came from. Ranks are AIIMS B.Sc. Nursing
entrance overall ranks. Institutes carry the Colleges tab's card name
("AIIMS BHATINDA" is the card "All India Institute of Medical Science,
Bathinda") so result rows link to their card.
"""
import json
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
PARQUET = REPO.parent / "external_data_sources/aiimsnursing/clean/aiimsnursing_fact_cutoffs.parquet"
OUT = REPO / "public/data/AIIMSNURSING/aiimsnursing_data.json"
COLLEGES = REPO / "public/data/colleges/colleges.json"

# AIIMS spelling -> the city as the card spells it
CITY = {"DELHI": "New Delhi", "BHATINDA": "Bathinda", "MANGLAGIRI": "Mangalagiri",
        "RAEBARELI": "Rae Bareli"}


def card_names():
    cards = [c for c in json.load(open(COLLEGES))
             if c["name"].lower().startswith("all india institute of medical")]
    out = {}
    for inst in pd.read_parquet(PARQUET).institute.unique():
        key = inst.removeprefix("AIIMS ")
        city = CITY.get(key, key.title()).lower()
        hits = [c["display_name"] for c in cards if city in c["name"].lower()]
        assert len(hits) == 1, (inst, hits)
        out[inst] = hits[0]
    return out


df = pd.read_parquet(PARQUET)
names = card_names()
df = df.sort_values(["closing_rank", "round"])
last = df.groupby(["institute", "seat_category"]).tail(1)
opening = df.groupby(["institute", "seat_category"]).opening_rank.min()

rows = [{
    "Institute": names[r.institute],
    "Academic Program Name": "B.Sc. (Hons.) Nursing",
    "Seat Category": r.seat_category,
    "Round": f"Round {r.round}",
    "Opening Rank": str(int(opening[(r.institute, r.seat_category)])),
    "Closing Rank": str(int(r.closing_rank)),
    "Year": str(r.year),
} for r in last.sort_values(["institute", "seat_category"]).itertuples()]

OUT.write_text(json.dumps(rows, indent=1))
from collections import Counter
print(f"aiimsnursing_data.json: {len(rows)} rows, {len(set(x['Institute'] for x in rows))} institutes")
print("Seat Category:", dict(Counter(x["Seat Category"] for x in rows)))
