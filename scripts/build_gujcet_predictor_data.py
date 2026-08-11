"""
Refresh public/data/GUJCET/GUJCET.json from the ACPC closure data.

Source: the per-stream CSVs produced by state_GJ.py in the futures-v2 repo —
the same files that feed external_data_sources/gujcet/ and BigQuery. One source
of truth, two consumers.

    python3 scripts/build_gujcet_predictor_data.py \
        --src /path/to/futures-v2/state_cet/scrape/extracted_data

WHAT THIS FIXES. The shipping GUJCET.json has only TWO categories — `general`
and `st`. An SC, OBC/SEBC or EWS student currently gets NO Gujarat data at all.
The ACPC closure PDFs carry all seven (OP, SEBC, SC, ST, EWS, TFWS, ESM), so
this replaces the Engineering and Pharmacy rows with the full set.

WHAT THIS DELIBERATELY KEEPS. The existing file also holds 753 Medical rows,
which the ACPC engineering/pharmacy closure PDFs do not cover at all. Those are
carried through untouched — a wholesale overwrite would silently delete Gujarat
medical cutoffs. Medical keeps its two categories until a medical source lands.

THE METRIC. The predictor asks for a percentage score and sorts on
`closing_marks`, so the ACPC `closing_percentile` (its 0-100 composite merit
score, the same quantity) maps onto `closing_marks`. The merit RANK is carried
alongside as `closing_rank` for display — it is the number ACPC actually
publishes first, and a student who knows their rank can use it directly.

YEARS DIFFER BY PROGRAM, on purpose:
    Engineering  2025 (2025-26 ACPC closure)
    Pharmacy     2024 (2024-25 — the latest ACPC published in this format)
    Medical      unlabelled legacy rows (kept as-is; no year in the old file)
`Year` is written per row so the UI can say which cycle a number came from
instead of implying they are all current.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
OUT_PATH = REPO / "public" / "data" / "GUJCET" / "GUJCET.json"

# (source CSV, Program value the predictor already uses, admission year)
STREAMS = [
    ("GJ_engg_all_cutoffs_2025.csv", "Engineering", 2025),
    ("GJ_pharm_all_cutoffs_2024.csv", "Pharmacy", 2024),
]

# ACPC code -> the predictor's dropdown value. Kept lowercase because
# gujcetConfig's filter does `item.category === query.category.toLowerCase()`.
CATEGORY_MAP = {
    "OP": "general",
    "OPEN": "general",
    "SEBC": "sebc",      # Gujarat's OBC label — a real category, not a synonym
    "SC": "sc",
    "ST": "st",
    "EWS": "ews",
    "TFWS": "tfws",      # tuition-fee waiver (horizontal, economic)
    "ESM": "esm",        # ex-servicemen (horizontal)
}

# ACPC INST_TYPE -> the predictor's existing "Type of College" vocabulary
# (Govt / Govt Aided / Pvt), so the column keeps working for Medical rows too.
COLLEGE_TYPE_MAP = {
    "GOV": "Govt",
    "GOVT": "Govt",
    "GIA": "Govt Aided",
    "Auto": "Govt",       # IITRAM — state-funded autonomous institute
    "SFI": "Pvt",
    "UNI-SFI": "Pvt",
    "COE": "Pvt",
    "PPP": "Pvt",         # GIDC Navsari — GIDC land, privately run, private cutoffs
}


def build_new_rows(src: Path) -> list[dict]:
    rows: list[dict] = []
    for csv_name, program, year in STREAMS:
        path = src / csv_name
        if not path.exists():
            raise SystemExit(f"Missing source CSV: {path}")
        df = pd.read_csv(path)
        kept = 0
        for r in df.itertuples(index=False):
            cat = CATEGORY_MAP.get(str(r.category_raw).strip().upper())
            if cat is None:
                continue
            pct = r.closing_percentile
            rows.append({
                "AISHE Code": None,          # ACPC PDFs carry no AISHE code
                "College Name": str(r.college_name).strip(),
                "District": None,            # not in the closure PDFs
                "Course": str(r.branch_name).strip(),
                "Program": program,
                "Exam": "GujCET" if program == "Engineering" else "ACPC",
                "Median Salary": None,
                "Avg Placement": None,
                "NIRF Ranking": None,
                "Type of College": COLLEGE_TYPE_MAP.get(
                    str(r.institute_type_raw).strip(), "Pvt"),
                "category": cat,
                # The predictor's primary input is a percentage score and it
                # sorts on closing_marks, so ACPC's 0-100 composite goes here.
                "closing_marks": None if pd.isna(pct) else round(float(pct), 2),
                # ACPC's headline number, kept for display.
                "closing_rank": None if pd.isna(r.closing_rank) else float(r.closing_rank),
                "Course Fees (per year)": None,
                "Total Seats": None,
                "Medical Stipend": None,
                "Year": year,
            })
            kept += 1
        print(f"  {program:12s} {kept:>5,} rows from {csv_name} (year {year})")
    return rows


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--src", required=True, type=Path,
                    help="futures-v2 state_cet/scrape/extracted_data directory")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    existing = json.loads(OUT_PATH.read_text())
    # Medical has no ACPC engineering/pharmacy equivalent — carry it through
    # rather than dropping Gujarat medical cutoffs on the floor.
    medical = [x for x in existing if x.get("Program") == "Medical"]
    replaced = len(existing) - len(medical)
    print("Refreshing GUJCET predictor data from ACPC closure PDFs")
    print(f"  replacing {replaced:,} Engineering+Pharmacy rows")
    print(f"  preserving {len(medical):,} Medical rows (no ACPC medical source)")
    print()

    new_rows = build_new_rows(args.src)
    for m in medical:
        m.setdefault("closing_rank", None)
        m.setdefault("Year", None)   # legacy rows: cycle genuinely unknown
    records = new_rows + medical

    print(f"\nTOTAL {len(records):,} rows (was {len(existing):,})")
    df = pd.DataFrame(records)
    for key in ("Program", "category", "Type of College", "Year"):
        print(f"\n  {key}:")
        print("    " + df[key].astype(str).value_counts().to_string().replace("\n", "\n    "))

    if args.dry_run:
        print("\n[dry-run] nothing written")
        return

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8") as fh:
        json.dump(records, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"\nWritten: {OUT_PATH}  "
          f"({OUT_PATH.stat().st_size / 1024 / 1024:.1f} MB)")


if __name__ == "__main__":
    main()
