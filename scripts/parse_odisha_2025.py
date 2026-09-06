#!/usr/bin/env python3
"""
OUR Odisha NEET-UG 2025 parser (state quota) — written at our end.

WHY THIS EXISTS
  Odisha had NO usable data before: the Dropbox set only carried
  `OD_closing_ranks_state_govt_2025_THIRDPARTY.csv` — 33 rows, explicitly `NOT_OFFICIAL=True`,
  mixed years (2024+2025) and mixed rank types (state rank + AIR). And unlike AS/GJ/JH/JK/KL/RJ/TN/UK,
  **no `_state_rank_to_air_OD_curve.csv` existed**, so Odisha's state ranks couldn't be converted.
  Surya supplied the two official OJEE documents that close both gaps.

SOURCES (official, Odisha Joint Entrance Examination — OJEE-2025):
  1. `amogh-csv/191568Odisha R3 MBBS Cutoff 2025.pdf` (34pp)
     "PROVISIONAL ALLOTMENT OF CANDIDATES (COMMON STATE RANK WISE) ... MBBS/BDS (3rd Round)",
     No. OJEE/0635 dated 28-10-2025. Columns:
       Sl.No | APPL NO | STATE RANK | CATEGORY | SUB CATEGORY (GC|PC|EX) | INSTITUTE | COURSE
       | QUOTA | ALLOTTED CATEGORY
     -> gives the CLOSING STATE RANK per (college, course, category). Round 3 = deep/final-ish.
  2. `amogh-csv/2025072943.pdf` (150pp)
     "PROVISIONAL STATE MERIT LIST FOR MBBS/BDS ADMISSION 2025-26 (AFTER 1ST PHASE REGISTRATION)".
     Columns: NEET APPLICATION No. | Domicile | Category | GC | PC | EX | NRI | SG
              | **NEET_AIR** | **State_AIR** | EW_R | SC_R | ST_R | GC_R | PC_R | EX_R | SGS_R | NRI_R
     -> gives **5,817 exact (State_AIR -> NEET_AIR) pairs** (state rank 1..5,817; AIR 180..1,316,600).
        THIS is the missing state-rank->AIR bridge for Odisha.

METHOD
  closing STATE rank (doc 1)  --bridge (doc 2)-->  closing NEET AIR  --our score_rank model--> marks

TAXONOMY (Odisha)
  Vertical CATEGORY: GN (General) / SC / ST / EW (EWS).
  Horizontal SUB CATEGORY columns: GC (Green Card), PC (Physically Challenged), EX (Ex-serviceman)
    -> excluded from base floors (they close much deeper).
  QUOTA: '' (regular state quota) / SGS (Sports/Govt-School?) / NRI  -> base floor uses '' only.
  ALLOTTED CATEGORY is a compound code (OPNO/STNO/SCNO/OPGC/OPEX/EWNO/OPPH...) = vertical+subpool;
    we rely on CATEGORY + the GC/PC/EX flags + QUOTA instead, which are unambiguous.

OUTPUTS (to scripts/odisha_2025_out/):
  - od_rank_air_bridge_2025.csv — state_air, neet_air, category  (5,817 rows)
  - od_allotments_2025.csv      — one row per R3 allotment (tidy)
  - od_closing_2025.csv         — closing state rank + closing AIR per (college, program, category)
"""
import csv
import sys
from collections import defaultdict
from pathlib import Path

import pdfplumber

REPO = Path(__file__).resolve().parent.parent
ALLOT_PDF = REPO / "amogh-csv/191568Odisha R3 MBBS Cutoff 2025.pdf"
MERIT_PDF = REPO / "amogh-csv/2025072943.pdf"
OUT = Path(__file__).resolve().parent / "odisha_2025_out"

# Govt medical/dental colleges in Odisha (the rest in the allotment file are private).
GOVT_PATTERNS = [
    "scb mch", "scb dental", "mkcg mch", "vimsar", "prm mch", "sln mch", "fm mch",
    "bb mch", "gmch", "government medical college", "sjmch", "jkmch",
    "pabitra mohan pradhan medical college",
]


def _c(row):
    return [" ".join(str(x or "").split()) for x in row]


def is_govt(name: str) -> bool:
    n = (name or "").lower()
    return any(p in n for p in GOVT_PATTERNS)


# ------------------------------------------------------------------ bridge
def parse_bridge(path: Path):
    """(State_AIR -> NEET_AIR) pairs from the state merit list."""
    out = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables() or []:
                if not table or len(table[0]) < 18:
                    continue
                for raw in table:
                    c = _c(raw)
                    if len(c) < 10 or not c[0].isdigit():
                        continue
                    if c[8].isdigit() and c[9].isdigit():
                        out.append({"state_air": int(c[9]), "neet_air": int(c[8]),
                                    "category": c[2], "domicile": c[1]})
    return out


# ------------------------------------------------------------------ allotment
def parse_allotment(path: Path):
    out = []
    with pdfplumber.open(path) as pdf:
        for pno, page in enumerate(pdf.pages, 1):
            for table in page.extract_tables() or []:
                for raw in table:
                    if not raw or len(raw) < 11:
                        continue
                    c = _c(raw)
                    if not c[0].isdigit() or not c[2].isdigit():
                        continue
                    out.append({
                        "page": pno, "appl_no": c[1], "state_rank": int(c[2]),
                        "category": c[3], "gc": c[4], "pc": c[5], "ex": c[6],
                        "college": c[7], "program": c[8], "quota": c[9],
                        "allotted_category": c[10],
                        "is_govt": is_govt(c[7]),
                        # base seat = regular quota AND no horizontal sub-category flag
                        "is_base": (c[9] == "" and not (c[4] or c[5] or c[6])),
                    })
    return out


def build_closings(allot, bridge):
    """Closing state rank (max) per (college, program, category) for BASE seats, + AIR via bridge."""
    pairs = sorted((b["state_air"], b["neet_air"]) for b in bridge)
    keys = [p[0] for p in pairs]

    def to_air(sr):
        """Nearest state rank at or below sr (the bridge is dense: ranks 1..5817)."""
        lo, hi = 0, len(keys) - 1
        if sr <= keys[0]:
            return pairs[0][1]
        best = pairs[0][1]
        while lo <= hi:
            mid = (lo + hi) // 2
            if keys[mid] <= sr:
                best = pairs[mid][1]; lo = mid + 1
            else:
                hi = mid - 1
        return best

    agg = defaultdict(lambda: {"closing_state_rank": 0, "opening_state_rank": 10**9, "n": 0})
    for r in allot:
        if not r["is_base"]:
            continue
        k = (r["college"], r["program"], r["category"], r["is_govt"])
        a = agg[k]
        a["closing_state_rank"] = max(a["closing_state_rank"], r["state_rank"])
        a["opening_state_rank"] = min(a["opening_state_rank"], r["state_rank"])
        a["n"] += 1
    out = []
    for (college, program, cat, govt), a in sorted(agg.items()):
        out.append({"college": college, "program": program, "category": cat, "is_govt": govt,
                    "closing_state_rank": a["closing_state_rank"],
                    "opening_state_rank": a["opening_state_rank"],
                    "closing_air": to_air(a["closing_state_rank"]),
                    "opening_air": to_air(a["opening_state_rank"]),
                    "allotted_count": a["n"]})
    return out


def write_csv(path, rows, cols):
    with open(path, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
        w.writeheader(); w.writerows(rows)


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    print(f"Stage 1 — state-rank->AIR bridge from {MERIT_PDF.name} (150 pages)...")
    bridge = parse_bridge(MERIT_PDF)
    print(f"  pairs: {len(bridge):,}")
    write_csv(OUT / "od_rank_air_bridge_2025.csv", bridge,
              ["state_air", "neet_air", "category", "domicile"])

    print(f"\nStage 2 — R3 allotments from {ALLOT_PDF.name} (34 pages)...")
    allot = parse_allotment(ALLOT_PDF)
    print(f"  allotment rows: {len(allot):,}")
    write_csv(OUT / "od_allotments_2025.csv", allot,
              ["page", "appl_no", "state_rank", "category", "gc", "pc", "ex",
               "college", "program", "quota", "allotted_category", "is_govt", "is_base"])

    print("\nStage 3 — closings (base seats) + AIR via bridge...")
    closings = build_closings(allot, bridge)
    write_csv(OUT / "od_closing_2025.csv", closings,
              ["college", "program", "category", "is_govt", "closing_state_rank",
               "opening_state_rank", "closing_air", "opening_air", "allotted_count"])
    print(f"  closing rows: {len(closings):,}")

    from collections import Counter
    print("\n--- diagnostics ---")
    print("categories:", dict(Counter(r["category"] for r in allot).most_common()))
    print("quota:", dict(Counter(r["quota"] or "(regular)" for r in allot).most_common()))
    print("base seats:", sum(1 for r in allot if r["is_base"]), "/", len(allot))
    govt = [r for r in allot if r["is_govt"]]
    print(f"govt rows: {len(govt):,} across {len({r['college'] for r in govt})} colleges")
    print("govt colleges:")
    for c in sorted({r["college"] for r in govt}):
        print("   ", c[:60])
    print(f"\nwrote 3 CSVs to {OUT}")


if __name__ == "__main__":
    sys.exit(main())
