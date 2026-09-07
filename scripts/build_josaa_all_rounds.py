"""Build public/data/JEE/josaa_2025_all_rounds.json — every JoSAA round.

WHY THIS EXISTS. The predictor itself shows one round and has no round selector;
that stays exactly as it is. This file is for the counselling *simulator*: a
student picks colleges, presses start, and the tool plays the rounds out — you
hold a seat, cutoffs loosen, you may upgrade. That needs all six rounds of the
same seat, which a single-round snapshot cannot give.

WHY IT IS NORMALISED, NOT ONE OBJECT PER ROW. The obvious shape — one JSON object
per (seat, round) with full strings — is 19.6 MB, because a 66-character institute
name and a 66-character program name get written out 72,183 times between them.
The numbers are a rounding error next to the strings. Writing each distinct string
once and referencing it by index gives 2.0 MB (0.57 MB gzipped) for the same data.
For context the existing public/data/JEE/OPEN.json is 1.28 MB for 11,965 rows, so
this is 6x the rows in ~1.5x one existing file.

Consumers dereference the lookups, which is about five lines:

    const d = await (await fetch('/data/JEE/josaa_2025_all_rounds.json')).json();
    const rows = d.rows.map((r) => ({
      institute: d.institutes[r[0]], program: d.programs[r[1]],
      quota: d.quotas[r[2]], seat_type: d.seat_types[r[3]],
      gender: d.genders[r[4]], round: r[5],
      opening_rank: r[6], closing_rank: r[7],
    }));

SOURCE. external_data_sources/josaa/raw/2025_R{1..6}.csv, scraped from JoSAA's own
archive (openingclosingrankarchieve.aspx) and the same data that feeds
josaa_fact_cutoffs in BigQuery. Set JOSAA_RAW_DIR to point elsewhere.

PREPARATORY RANKS. 123 rows carry a 'P' suffix — a separate rank space for
preparatory-course candidates, not comparable with main-list ranks. The digits are
kept and the row is flagged, so a consumer can exclude them; they must not be
mixed into a rank comparison.
"""
from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data" / "JEE" / "josaa_2025_all_rounds.json"
DEFAULT_RAW = Path.home() / "jan2023" / "external_data_sources" / "josaa" / "raw"
YEAR = 2025
ROUNDS = [1, 2, 3, 4, 5, 6]

COLUMNS = ["institute", "program", "quota", "seat_type", "gender",
           "round", "opening_rank", "closing_rank"]


def parse_rank(value) -> tuple[int | None, bool]:
    """JoSAA ranks arrive as strings; a 'P' suffix marks a preparatory rank.

    Returns (integer_rank, is_preparatory). Sorting the raw string would put
    '33833' before '4162', so this must run before any ordering.
    """
    s = str(value).strip()
    if not s or s.lower() in ("nan", "none"):
        return None, False
    digits = re.sub(r"[^0-9]", "", s)
    return (int(digits) if digits else None), s.upper().endswith("P")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--raw-dir", default=os.environ.get("JOSAA_RAW_DIR", str(DEFAULT_RAW)))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    raw = Path(args.raw_dir)

    frames = []
    for rnd in ROUNDS:
        f = raw / f"{YEAR}_R{rnd}.csv"
        if not f.exists():
            raise SystemExit(
                f"Missing {f}.\nRe-scrape with "
                "external_data_sources/josaa/scrape/scripts/01_scrape_archive.py, "
                "or pass --raw-dir."
            )
        frames.append(pd.read_csv(f))
        print(f"  R{rnd}: {len(frames[-1]):,} rows")

    df = pd.concat(frames, ignore_index=True)
    print(f"\n  total {len(df):,} rows across {len(ROUNDS)} rounds")

    def vocab(col: str) -> list[str]:
        return sorted(df[col].astype(str).unique())

    institutes = vocab("Institute")
    programs = vocab("Academic Program Name")
    quotas = vocab("Quota")
    seat_types = vocab("Seat Type")
    genders = vocab("Gender")
    idx = (
        {v: i for i, v in enumerate(institutes)},
        {v: i for i, v in enumerate(programs)},
        {v: i for i, v in enumerate(quotas)},
        {v: i for i, v in enumerate(seat_types)},
        {v: i for i, v in enumerate(genders)},
    )

    rows, prep_rows = [], []
    for r in df.itertuples(index=False):
        o, o_prep = parse_rank(r[5])
        c, c_prep = parse_rank(r[6])
        row = [idx[0][str(r[0])], idx[1][str(r[1])], idx[2][str(r[2])],
               idx[3][str(r[3])], idx[4][str(r[4])], int(r[8]), o, c]
        if o_prep or c_prep:
            prep_rows.append(len(rows))
        rows.append(row)

    doc = {
        "year": YEAR,
        "rounds": ROUNDS,
        "source": "JoSAA archive (openingclosingrankarchieve.aspx)",
        "note": ("Integer-coded rows. Dereference each row against the lookup "
                 "arrays below; see `columns` for the field order. "
                 "preparatory_row_indexes lists rows whose rank is a "
                 "preparatory-course rank — a different rank space, do not mix "
                 "them into a main-list comparison."),
        "columns": COLUMNS,
        "institutes": institutes,
        "programs": programs,
        "quotas": quotas,
        "seat_types": seat_types,
        "genders": genders,
        "preparatory_row_indexes": prep_rows,
        "rows": rows,
    }

    # ── invariants ───────────────────────────────────────────────────────────
    assert len(rows) == len(df), "row count drifted"
    assert {r[5] for r in rows} == set(ROUNDS), "missing a round"
    for r in rows:
        assert 0 <= r[0] < len(institutes) and 0 <= r[1] < len(programs)
    # cutoffs must loosen across rounds: JoSAA fills seats progressively, so a
    # LATER round should never be harder. Checked on seats present in all six.
    df2 = df.copy()
    df2["cr"] = [parse_rank(v)[0] for v in df2["Closing Rank"]]
    key = ["Institute", "Academic Program Name", "Quota", "Seat Type", "Gender"]
    piv = df2.pivot_table(index=key, columns="Round", values="cr", aggfunc="max").dropna()
    looser = (piv[max(ROUNDS)] >= piv[min(ROUNDS)]).mean()
    assert looser > 0.95, f"only {looser:.0%} of seats are looser by the last round"

    payload = json.dumps(doc, separators=(",", ":"))
    print(f"\n  institutes {len(institutes)} | programs {len(programs)} | "
          f"preparatory rows {len(prep_rows)}")
    print(f"  seats in all {len(ROUNDS)} rounds: {len(piv):,}  "
          f"({looser:.0%} looser by R{max(ROUNDS)})")
    print(f"  size: {len(payload) / 1e6:.2f} MB")

    if args.dry_run:
        print("\n[dry-run] not written")
        return
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(payload)
    print(f"\nWrote {OUT}")


if __name__ == "__main__":
    main()
