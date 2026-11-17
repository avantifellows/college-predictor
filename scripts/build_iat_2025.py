#!/usr/bin/env python3
"""
Build public/data/IAT/iat_data.json from BigQuery
external_data_sources.iiser_fact_cutoffs (IISER round-wise closing ranks,
2025; external_data_sources/iiser/).

One row per (programme, category): the loosest closing over the nine rounds
(the rank a student needed to get the seat at all), with the round it came
from. Ranks are IAT OVERALL ranks for every category, as IISER publishes them.
The institute carries the Colleges tab's card name ("IISER Pune" is the card
"Indian Institute of Science Education and Research Pune") so result rows link
to their card, and the check below fails if a campus has no card.

    GOOGLE_APPLICATION_CREDENTIALS=<bigquery key> python3 scripts/build_iat_2025.py
"""
import json
from collections import Counter
from pathlib import Path

from google.cloud import bigquery

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "public/data/IAT/iat_data.json"
COLLEGES = REPO / "public/data/colleges/colleges.json"

client = bigquery.Client(project="avantifellows", location="asia-south1")
df = client.query("""
    SELECT year, round, program_name, institute, category, closing_rank
    FROM `avantifellows.external_data_sources.iiser_fact_cutoffs`
""").to_dataframe()

cards = {c["display_name"] for c in json.load(open(COLLEGES))}


def card_name(inst):
    name = "Indian Institute of Science Education and Research " + inst.removeprefix("IISER ").strip()
    assert name in cards, (inst, name)
    return name


def programme(p, inst):
    """'BS-MS IISER Pune' -> 'BS-MS'; 'B.Tech. Chemical Engineering IISER Bhopal' -> 'B.Tech. Chemical Engineering'"""
    return p.replace(inst, "").strip(" ,-") or p


df = df.sort_values(["closing_rank", "round"])
last = df.groupby(["program_name", "category"]).tail(1)

rows = [{
    "Institute": card_name(r.institute),
    "Academic Program Name": programme(r.program_name, r.institute),
    "Category": r.category,
    "Round": f"Round {r.round}",
    "Closing Rank": str(int(r.closing_rank)),
    "Year": str(r.year),
} for r in last.sort_values(["institute", "program_name", "category"]).itertuples()]

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(rows, indent=1))
print(f"iat_data.json: {len(rows)} rows, {len({x['Institute'] for x in rows})} institutes, "
      f"{len({(x['Institute'], x['Academic Program Name']) for x in rows})} programmes")
print("Category:", dict(Counter(x["Category"] for x in rows)))
print("Programmes:", sorted({x["Academic Program Name"] for x in rows}))
