#!/usr/bin/env python3
"""
OUR Rajasthan NEET-UG 2025 parser (state quota) — written at our end, not the Dropbox pipeline.

WHY THIS EXISTS
  The Dropbox pipeline's `state_RJ.py` is stuck on 2024 data — its own header says:
  "⚠️ DATA YEAR: uses 2024 data (most recent available); the official 2025 portal
  (rajugneet2025.in) blocks programmatic access." Surya supplied the official 2025 PDFs
  directly, so we parse them ourselves.

SOURCE (official, Office of the Chairman, NEET UG Medical & Dental Admission/Counseling
Board-2025, SMS Medical College, Jaipur):
  - `amogh-csv/599136R1 Allotment 2025.pdf`      — "Provisional allotment list, Round 1,
      18.08.2025", 299 pages. THE allotment file: candidate -> allotted course+college.
  - `amogh-csv/rajasthan-neet-merit-list.pdf`    — "Provisional revised combined merit list
      (Round 1), 12.08.2025", 657 pages. Merit list only (NO college); useful as a
      state-merit <-> AIR bridge and for percentile context. Parsed as a secondary output.

ALLOTMENT SCHEMA (11 cols):
  [0] S.No. [1] Reg.ID [2] NEET Roll No. [3] Candidate Name [4] Category considered
  [5] Category Allotted [6] Gender [7] NEET Percentile [8] State Merit R1
  [9] NEET A.I. Rank            <-- AIR-NATIVE (no conversion needed)
  [10] Course and College Allotted   e.g. "MBBS, SMS MC, Jaipur (Govt. Seat)"

WHY THIS SOURCE IS UNUSUALLY GOOD
  - `NEET A.I. Rank` is a true NEET AIR -> feeds our score_rank model directly.
  - The college string carries an EXPLICIT seat-type marker — "(Govt. Seat)" — so the
    govt/private split is STATED IN THE DATA. No name heuristic, no fee classifier, no
    hard-coded roster. This is the exact failure mode that broke KA / PB / UP / BR.
  - `Category Allotted` is the SEAT's category (what a closing floor needs), distinct from
    `Category considered` (the candidate's own category).

OUTPUTS (to scripts/rajasthan_2025_out/):
  - rj_allotments_2025.csv   — one row per allotment (tidy, typed)
  - rj_closing_2025.csv      — closing AIR per (college, program, seat_category, gender)
  - rj_meritlist_2025.csv    — merit list rows (state_merit <-> AIR <-> percentile)
"""
import csv
import re
import sys
from collections import defaultdict
from pathlib import Path

import pdfplumber

REPO = Path(__file__).resolve().parent.parent
ALLOT_PDF = REPO / "amogh-csv/599136R1 Allotment 2025.pdf"
MERIT_PDF = REPO / "amogh-csv/rajasthan-neet-merit-list.pdf"
OUT = Path(__file__).resolve().parent / "rajasthan_2025_out"

# ---------------------------------------------------------------- allotment

def _clean(cells):
    return [" ".join(str(c or "").split()) for c in cells]


def parse_course_college(s):
    """'MBBS, SMS MC, Jaipur (Govt. Seat)' -> ('MBBS', 'SMS MC, Jaipur', 'Govt. Seat').

    The trailing parenthetical is the seat type as stated by the board (Govt. Seat /
    Manage. Seat / NRI Seat / ...). Program is the leading token before the first comma.
    """
    s = (s or "").strip()
    if not s:
        return None, None, None
    seat_type = None
    m = re.search(r"\(([^)]*)\)\s*$", s)
    if m:
        seat_type = m.group(1).strip()
        s = s[: m.start()].strip()
    parts = [p.strip() for p in s.split(",")]
    program = parts[0].upper() if parts else None
    college = ", ".join(parts[1:]).strip() or (parts[0] if parts else "")
    return program, college, seat_type


def parse_allotment(path: Path):
    rows = []
    with pdfplumber.open(path) as pdf:
        for pno, page in enumerate(pdf.pages, 1):
            for table in page.extract_tables() or []:
                for raw in table:
                    if not raw or len(raw) < 11:
                        continue
                    c = _clean(raw)
                    if not c[0].isdigit():          # skip header / stray rows
                        continue
                    air = c[9].replace(",", "")
                    if not air.isdigit():
                        continue
                    program, college, seat_type = parse_course_college(c[10])
                    if not program:
                        continue
                    rows.append({
                        "page": pno,
                        "reg_id": c[1],
                        "neet_roll": c[2],
                        "name": c[3],
                        "category_considered": c[4],
                        "category_allotted": c[5],
                        "gender": c[6],
                        "neet_percentile": c[7],
                        "state_merit_r1": c[8].replace(",", ""),
                        "neet_air": int(air),
                        "program": program,
                        "college": college,
                        "seat_type": seat_type or "",
                        "course_college_raw": c[10],
                    })
    return rows

# ---------------------------------------------------------------- merit list

def parse_meritlist(path: Path):
    """15-col merit list; we keep the rank/AIR/percentile bridge + category."""
    rows = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables() or []:
                for raw in table:
                    if not raw or len(raw) < 14:
                        continue
                    c = _clean(raw)
                    if not c[0].isdigit():
                        continue
                    air = c[12].replace(",", "")
                    smerit = c[13].replace(",", "")
                    if not (air.isdigit() and smerit.isdigit()):
                        continue
                    rows.append({
                        "reg_id": c[1],
                        "neet_roll": c[2],
                        "gender": c[5],
                        "domicile": c[6],
                        "category_filled": c[7],
                        "category_considered": c[9],
                        "neet_percentile": c[11],
                        "neet_air": int(air),
                        "state_merit": int(smerit),
                    })
    return rows

# ---------------------------------------------------------------- closings

# `category_allotted` = "<VERTICAL> <AREA+GENDER>", e.g. "GEN URB -", "OBC OBG -", "SC SCB -".
#   token1 = vertical (GEN/EWS/OBC/MBC/SC/ST/SA); token2 = area+gender (URB/URG unreserved boy/girl,
#   OBB/OBG, SCB/SCG, STB/STG, EWB/EWG, MBB/MBG, SAB/SAG).
# `category_considered` = "<VERTICAL> <HORIZONTAL> -", where the HORIZONTAL flag (when present) is
#   PwD | EXS1..5 (Ex-Serviceman) | WPP1..3 (War-widow/Personnel).
# CRITICAL: horizontal sub-pools close FAR deeper (PwD/EXS rows reach AIR ~1.1-1.3M). They must be
# excluded from base-category floors — otherwise GEN "closes" at AIR 1,136,995 (vs a true ~15k),
# i.e. looser than EWS, which is impossible. Same sub-pool hygiene applied in every other state.
HORIZONTAL_RE = re.compile(r"^(PwD|EXS\d*|WPP\d*)$", re.IGNORECASE)


def vertical_of(cat_allotted: str):
    t = (cat_allotted or "").replace("-", " ").split()
    return t[0].upper() if t else ""


def horizontal_of(cat_considered: str):
    """Return the horizontal sub-quota flag from `category_considered`, or '' if a base seat."""
    t = (cat_considered or "").replace("-", " ").split()
    for tok in t[1:]:
        if HORIZONTAL_RE.match(tok):
            return tok.upper()
    return ""


def build_closings(allot_rows):
    """Closing AIR = MAX(neet_air) per (college, program, vertical, seat_type, horizontal).

    `horizontal` is carried so consumers can filter to base seats (horizontal == '').
    """
    agg = defaultdict(lambda: {"closing_air": 0, "opening_air": 10**9, "n": 0})
    for r in allot_rows:
        v = vertical_of(r["category_allotted"])
        if not v:
            continue
        h = horizontal_of(r["category_considered"])
        k = (r["college"], r["program"], v, r["seat_type"], h)
        a = agg[k]
        a["closing_air"] = max(a["closing_air"], r["neet_air"])
        a["opening_air"] = min(a["opening_air"], r["neet_air"])
        a["n"] += 1
    out = []
    for (college, program, vert, seat_type, horiz), a in sorted(agg.items()):
        out.append({"college": college, "program": program, "vertical": vert,
                    "seat_type": seat_type, "horizontal": horiz,
                    "closing_air": a["closing_air"], "opening_air": a["opening_air"],
                    "allotted_count": a["n"]})
    return out


def write_csv(path, rows, cols):
    with open(path, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    print(f"Stage 1 — parsing allotment PDF ({ALLOT_PDF.name}, 299 pages)...")
    allot = parse_allotment(ALLOT_PDF)
    print(f"  allotment rows: {len(allot):,}")
    write_csv(OUT / "rj_allotments_2025.csv", allot,
              ["page", "reg_id", "neet_roll", "name", "category_considered",
               "category_allotted", "gender", "neet_percentile", "state_merit_r1",
               "neet_air", "program", "college", "seat_type", "course_college_raw"])

    print("\nStage 2 — closing AIR per (college, program, vertical, seat_type)...")
    closings = build_closings(allot)
    print(f"  closing rows: {len(closings):,}")
    write_csv(OUT / "rj_closing_2025.csv", closings,
              ["college", "program", "vertical", "seat_type", "horizontal",
               "closing_air", "opening_air", "allotted_count"])

    print(f"\nStage 3 — parsing merit list ({MERIT_PDF.name}, 657 pages)...")
    merit = parse_meritlist(MERIT_PDF)
    print(f"  merit rows: {len(merit):,}")
    write_csv(OUT / "rj_meritlist_2025.csv", merit,
              ["reg_id", "neet_roll", "gender", "domicile", "category_filled",
               "category_considered", "neet_percentile", "neet_air", "state_merit"])

    # ---- diagnostics: what the data says (no assumptions) ----
    from collections import Counter
    print("\n--- diagnostics ---")
    print("seat_type values:", dict(Counter(r["seat_type"] for r in allot).most_common()))
    print("program values:", dict(Counter(r["program"] for r in allot).most_common(10)))
    print("verticals:", dict(Counter(vertical_of(r["category_allotted"]) for r in allot).most_common(15)))
    print("horizontal flags:", dict(Counter(horizontal_of(r["category_considered"]) or "(base)"
                                            for r in allot).most_common(12)))
    govt = [r for r in allot if r["seat_type"] == "Govt. Seat"]
    base = [r for r in govt if not horizontal_of(r["category_considered"])]
    print(f"govt-seat rows: {len(govt):,} (base, no horizontal: {len(base):,})  "
          f"distinct govt colleges: {len({r['college'] for r in govt})}")
    print(f"\nwrote 3 CSVs to {OUT}")


if __name__ == "__main__":
    sys.exit(main())
