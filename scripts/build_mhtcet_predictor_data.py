"""
Build public/data/MHTCET/mhtcet_data.json for the college predictor.

Source: the per-stream closing-rank CSVs produced by state_MH.py /
state_MH_arch.py in the futures-v2 repo — the same files that feed
external_data_sources/mhtcet/ and BigQuery. One source of truth, two consumers.

    python3 scripts/build_mhtcet_predictor_data.py \
        --src /path/to/futures-v2/state_cet/scrape/extracted_data

What this replaces: the previous mhtcet_data.json was the 2024 cycle,
engineering-only, with no year column. This build is 2025-26 and adds the
pharmacy / architecture / B.Design streams.

Schema is deliberately kept close to what the predictor already reads, so
examConfig.js keeps working:

    Institute, Academic Program Name, Category, Gender, Defense, PWD,
    State, Category_Key, Closing Rank

with three additions:

    Stream        so the UI can scope to one CAP (rank spaces differ!)
    Quota         the domicile pool, previously collapsed into State
    Year          the old file had no year at all

RANK SPACES ARE NOT COMPARABLE ACROSS STREAMS. Engineering and pharmacy are
MHT-CET state merit ranks. Architecture is a B.Arch CAP merit number
(NATA/2 + Class XII %, max 200). B.Design is a MAH-B.Design CET rank. The
Stream column exists so the UI can filter to exactly one of them.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parent.parent
OUT_PATH = REPO / "public" / "data" / "MHTCET" / "mhtcet_data.json"

# Stream -> (source CSV prefix, label shown in the UI)
STREAMS = {
    "engineering": ("MH_engg", "Engineering"),
    "pharmacy": ("MH_pharm", "Pharmacy"),
    "architecture": ("MH_arch", "Architecture"),
    "bdesign": ("MH_bdesign", "B.Design"),
}

# Canonical category -> the predictor's existing dropdown value. The predictor
# groups Maharashtra's VJ / NT1-3 / SEBC into coarser buckets than our
# canonical 5-cat rollup does, so derive from category_raw instead and keep the
# dropdown vocabulary the UI already ships.
def predictor_category(category_raw: str, sub_pool: str) -> str | None:
    c = str(category_raw).upper()
    if c == "TFWS":
        return "TFWS"
    if c == "ORPHAN":
        return "Orphan"
    if c in ("MI", "MINO", "MIH", "MIO", "MIS"):
        return "Religious Minority"
    if c == "EWS":
        return "EWS"
    # All India seats are a quota, not a social category — every candidate
    # competes for them regardless of category, so map to Open.
    if c in ("AI", "AIS", "AIH", "AIO"):
        return "Open"

    # Strip the horizontal prefix (DEF/DEFR/PWD/PWDR) — it is surfaced through
    # the separate Defense / PWD flags, exactly as the old file did.
    body = c
    for pref in ("DEFR", "PWDR", "DEF", "PWD"):
        if body.startswith(pref):
            body = body[len(pref):]
            break
    else:
        # Not a flagged seat: drop the G/L gender prefix instead.
        if body[:1] in ("G", "L"):
            body = body[1:]

    # Drop the trailing H/O/S domicile marker.
    if body[-1:] in ("H", "O", "S"):
        body = body[:-1]

    return {
        "OPEN": "Open",
        "OBC": "OBC",
        "SC": "SC",
        "ST": "ST",
        "VJ": "VJ",
        # Engineering/pharmacy write Nomadic Tribe as NT1/NT2/NT3; the
        # architecture CAP writes the same three groups as NT-A/NT-B/NT-C
        # (confirmed in the source PDF: the candidate's Category column reads
        # "NT-C" against SeatType GNTCH). Both fold into the predictor's
        # single NT bucket.
        "NT1": "NT", "NT2": "NT", "NT3": "NT", "NTD": "NT",
        "NTA": "NT", "NTB": "NT", "NTC": "NT",
        # SEBC (Socially & Educationally Backward Class) is a SEPARATE
        # reservation from OBC under Maharashtra law, not a synonym. Folding it
        # into OBC made the same college+program appear up to 4x all labelled
        # "OBC", and SEBC closes ~1,000 ranks looser (median across 528 shared
        # college x program cells, looser in ~64%) — so a student was shown a
        # seat they may not be eligible for under a label saying they are.
        "SEBC": "SEBC",
        "SBC": "SBC",
        "EWS": "EWS",
        "MI": "Religious Minority", "MIN": "Religious Minority",
    }.get(body)


def candidate_region(quota: str) -> str:
    """Which candidate this seat is open to, from the CANDIDATE half of the label.

    "Any"                        State Level — any Maharashtra candidate
    "Home University"            only candidates OF THE COLLEGE'S OWN university
    "Other than Home University" only candidates from a DIFFERENT university

    Note the first two are not answerable by a yes/no question: whether a
    "Home University" seat is yours depends on which university the college
    belongs to, which varies row by row. The UI therefore asks the student to
    pick their own university and compares it against each row's
    Home University.
    """
    q = str(quota).strip()
    if q.startswith("State Level"):
        return "Any"
    if q.endswith("Home") and "Other" not in q.split("→")[-1]:
        return "Home University"
    if q.endswith("Other"):
        return "Other than Home University"
    return "Any"


def build(src: Path) -> list[dict]:
    records: list[dict] = []
    for stream, (prefix, label) in STREAMS.items():
        path = src / f"{prefix}_state_quota_closing_ranks_2025.csv"
        if not path.exists():
            print(f"  ! missing, skipping: {path.name}")
            continue
        df = pd.read_csv(path, dtype={"college_code": "string"})

        # The architecture parser names its raw reservation column seat_type.
        if "category_raw" not in df.columns and "seat_type" in df.columns:
            df = df.rename(columns={"seat_type": "category_raw"})

        df["sub_pool"] = df["sub_pool"].fillna("").astype(str)
        n_before = len(df)

        for r in df.itertuples(index=False):
            cat = predictor_category(r.category_raw, r.sub_pool)
            if cat is None:
                continue
            flag = str(r.sub_pool)
            records.append({
                "Institute": str(r.college_name).strip(),
                "Academic Program Name": str(r.branch_name).strip(),
                "Category": cat,
                # G = General is gender-NEUTRAL (open to all, women included);
                # L = Ladies is female-reserved. Maharashtra's 30% female quota
                # is horizontal, so a female candidate is eligible for both.
                "Gender": "Female-Only" if r.gender == "Girls" else "Gender-Neutral",
                "Defense": "Yes" if flag.startswith("DEF") else "No",
                "PWD": "Yes" if flag.startswith("PWD") else "No",
                # Which candidate can take this seat. The CET Cell's section
                # headings read SEAT-type -> CANDIDATE-type:
                #
                #   "Home University Seats Allotted to Home University Candidates"
                #   "Home University Seats Allotted to Other Than Home University Candidates"
                #   "Other Than Home University Seats Allotted to Home University Candidates"
                #   "Other Than Home University Seats Allotted to Other Than Home ... Candidates"
                #
                # so eligibility is decided by the SECOND half of the label, not
                # the first. "Home -> Other" is a home-university SEAT given to
                # an out-of-region candidate. Keying off the first half (as this
                # did) showed Maharashtra students 2,173 rows they cannot take,
                # hid 2,568 they can, and dropped all 18,081 State Level rows
                # from out-of-region students -- 11,145 seats shown instead of
                # 28,831. State Level is open to everyone.
                "State": candidate_region(r.quota),
                "Quota": str(r.quota),
                # Which university the "Home"/"Other" in Quota is keyed to.
                # Empty where the CET Cell doesn't publish it (all of B.Design,
                # ~49% of pharmacy print a bare "Status: Un-Aided").
                "Home University": (
                    "" if pd.isna(getattr(r, "home_university", None))
                    else str(r.home_university).strip()
                ),
                "Category_Key": str(r.category_raw),
                "Closing Rank": str(int(r.closing_rank)),
                "Stream": label,
                "Year": 2025,
                # Which CAP round actually set this closing rank. The cutoff is
                # MAX(rank) across all rounds, so a cell last touched in R1
                # filled early and one touched in R4 stayed open to the end.
                # Amogh's feedback: nothing on screen said WHICH cycle or round
                # this was, and the previous file had no year column at all.
                "Round": str(getattr(r, "last_round_with_max", "") or ""),
            })
        kept = len([x for x in records if x["Stream"] == label])
        print(f"  {label:14s} {kept:>6,} rows  (from {n_before:,}; "
              f"{n_before - kept:,} dropped as unmapped category)")
    return records


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--src", required=True, type=Path,
                    help="futures-v2 state_cet/scrape/extracted_data directory")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    print("Building MHT-CET predictor data (2025-26)")
    records = build(args.src)

    print(f"\nTOTAL {len(records):,} rows")
    for key in ("Stream", "Category", "Gender", "State", "PWD", "Defense"):
        counts = pd.Series([r[key] for r in records]).value_counts()
        print(f"\n  {key}:")
        print("    " + counts.to_string().replace("\n", "\n    "))

    if args.dry_run:
        print("\n[dry-run] nothing written")
        return

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8") as fh:
        json.dump(records, fh, ensure_ascii=False, separators=(",", ":"))
    size_mb = OUT_PATH.stat().st_size / 1024 / 1024
    print(f"\nWritten: {OUT_PATH}  ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
