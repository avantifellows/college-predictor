#!/usr/bin/env python3
"""
Build the Gujarat ACPMEC predictor files from BigQuery
(external_data_sources acpmec/: acpmec_fact_last_ranks, 2025-26):

  public/data/ACPMEC/acpmec_nursing.json  B.Sc. Nursing and the allied degrees
      (physiotherapy, optometry, OT, P&O, audiology, naturopathy). Rank on
      the committee's merit list (Class 12 marks, no exam), final round (8):
      the loosest rank that got a seat at all.
  public/data/ACPMEC/acpmec_ayush.json    BAMS and BHMS, NEET score of the
      last student admitted (final list). MBBS and BDS are not here: the
      NEET predictor already holds Gujarat's state quota for them.

One row per institute x course x quota x category. Seats that stayed
vacant ("Vacant", 99999 in the lists) are kept: any eligible student could
have had one. The "-M" pool (labels like "HVNUR -M") is left out: the lists
do not say who it is for. GNM / ANM diplomas are left out: no college cards.
NRI-quota seats (BAMS/BHMS NQ) are left out: open only to NRI candidates.

Institute names are the Colleges tab's: each ACPMEC card lists the
committee keys it covers (committee_ids), so every row links to its card.
"""
import json
from collections import Counter
from pathlib import Path

import pandas as pd
from google.cloud import bigquery

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "public/data/ACPMEC"
COLLEGES = REPO / "public/data/colleges/colleges.json"
T = "avantifellows.external_data_sources.acpmec_fact_last_ranks"

COURSE = {
    "BSC_NURSING": "B.Sc. Nursing",
    "BPT": "Physiotherapy (BPT)",
    "BO": "Optometry (B.Optom)",
    "BOT": "Occupational Therapy (BOT)",
    "BOP": "Prosthetics & Orthotics (BPO)",
    "BASLP": "Audiology & Speech (BASLP)",
    "BNYS": "Naturopathy & Yoga (BNYS)",
    "BAMS": "Ayurveda (BAMS)",
    "BHMS": "Homoeopathy (BHMS)",
}
QUOTA = {"GQ": "Government", "MQ": "Management", "NQ": "NRI"}
# both committees' category codes -> one vocabulary for the form
CATEGORY = {"OP": "OPEN", "OPEN": "OPEN", "EW": "EWS", "SC": "SC", "ST": "ST", "SE": "SEBC"}


def cards_by_key():
    out = {}
    for c in json.load(open(COLLEGES)):
        for k in c.get("committee_ids") or []:
            out[k] = c
    return out


def main():
    client = bigquery.Client(project="avantifellows", location="asia-south1")
    df = client.query(f"""
      SELECT * FROM `{T}`
      WHERE seat_pool IS NULL
        AND ((committee = 'nursing_allied' AND round = 8
              AND course_code NOT IN ('GNM', 'ANM'))
          OR (course_code IN ('BAMS', 'BHMS') AND quota != 'NQ'))""").to_dataframe()
    cards = cards_by_key()
    year = "2025"
    nursing, ayush, unlinked = [], [], Counter()
    for r in df.itertuples():
        key = f"{r.course_code}:{r.inst_code if isinstance(r.inst_code, str) else r.inst_label}"
        card = cards.get(key)
        if card is None:
            # on 2025's list, not 2026's (closed or renamed): no card
            unlinked[r.course_code] += 1
            continue
        pwd = r.category.endswith("PH")
        row = {
            "Institute": card["display_name"],
            "District": card.get("district"),
            "Course": COURSE[r.course_code],
            "Quota": QUOTA[r.quota],
            "Category": CATEGORY[r.category.removesuffix("PH")],
            "PwD": pwd,
            "Type of College": "Govt" if card.get("ownership") in ("Public", "Government-aided") else "Private",
            "Vacant": bool(r.vacant),
            "Year": year,
        }
        if r.committee == "nursing_allied":
            if pd.isna(r.last_rank) and not r.vacant:  # filled, no rank printed
                continue
            row["Closing Rank"] = None if r.vacant else int(r.last_rank)
            nursing.append(row)
        else:
            if pd.isna(r.neet_score) and not r.vacant:
                continue  # MQ / NQ filled outside merit: no number
            row["Closing NEET Score"] = None if r.vacant else int(r.neet_score)
            row["Closing NEET Rank"] = None if r.vacant else int(r.neet_rank)
            ayush.append(row)

    OUT.mkdir(parents=True, exist_ok=True)
    for name, rows in [("acpmec_nursing.json", nursing), ("acpmec_ayush.json", ayush)]:
        rows.sort(key=lambda x: (x["Course"], x["Institute"], x["Quota"], x["Category"], x["PwD"]))
        (OUT / name).write_text(json.dumps(rows, indent=1, ensure_ascii=False))
        print(f"{name}: {len(rows)} rows, {len({x['Institute'] for x in rows})} institutes, "
              f"{sum(x['Vacant'] for x in rows)} vacant")
        print("  ", dict(Counter(x["Course"] for x in rows)))
    print("not on the 2026 lists (no card, left out):", dict(unlinked))


if __name__ == "__main__":
    main()
