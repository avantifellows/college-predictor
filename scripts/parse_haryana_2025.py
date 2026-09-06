#!/usr/bin/env python3
"""
OUR Haryana NEET-UG 2025 parser (state quota) — written at our end.

WHY THIS EXISTS
  Haryana was only available as THIRDPARTY data in the Dropbox pipeline (no own parser to audit).
  The official counselling portal `uhsrugcounselling.com` is currently in **Maintenance Mode (503)**,
  so the source PDF was obtained via an aggregator mirror (the same route the Dropbox team used for
  Rajasthan-2024). The document itself is the genuine official one.

SOURCE (official; mirrored):
  `amogh-csv/haryana-neet-ug-2025-round1-allotment.pdf` — 234 pages,
  "Department of Medical Education and Research, Haryana / Govt. of Haryana —
   Provisional Merit List cum Allotment of seats ... MBBS/BDS in Govt./Govt.Aided and Private
   Medical/Dental Colleges in the State of Haryana ... **Round I (Session 2025-26)**, 14.08.2025".

SCHEMA (9 cols):
  [0] SrNo [1] NEETAllIndiaRank [2] NEETScore [3] Candidate Name [4] Father Name
  [5] Allotted Cat. [6] Course [7] Allotted Institute [8] Remark

WHY THIS SOURCE IS UNUSUALLY GOOD
  - Carries **BOTH `NEETAllIndiaRank` (AIR) and `NEETScore` (marks)** per candidate. Marks-native, so
    no conversion is needed — AND it lets us independently validate our score_rank model (AIR 68 ->
    652 marks, AIR 491 -> 619 ...).
  - `Remark` distinguishes Allotted / Not Allotted / Preference Not Filled: only 2,213 of 7,595 rows
    are actual allotments (the rest are applicants with no seat, carrying blank '-' cat/course/inst).
    A naive parse that ignores `Remark` would badly corrupt any closing calculation.

CATEGORY TAXONOMY (Haryana)
  Vertical: OPEN_CAT / BCA / BCB (Haryana's two OBC blocks) / SC / SC_DEPRIVED (SC sub-quota) / EWS.
  Non-state-quota buckets: MGT (management), MINORITY, NRI Category I-VI  -> excluded from govt floor.
  Horizontal suffixes on the same field: `_PWBD` (PwD), `_ESM_FF` (Ex-serviceman / Freedom Fighter,
  with Priority-I/II/III)  -> recorded separately, excluded from base floors.

OUTPUTS (to scripts/haryana_2025_out/):
  - hr_allotments_2025.csv  — one row per ALLOTTED candidate (tidy, typed)
  - hr_closing_2025.csv     — closing AIR + closing marks per (college, program, vertical, horizontal)
"""
import csv
import re
import sys
from collections import defaultdict
from pathlib import Path

import pdfplumber

REPO = Path(__file__).resolve().parent.parent
PDF = REPO / "amogh-csv/haryana-neet-ug-2025-round1-allotment.pdf"
OUT = Path(__file__).resolve().parent / "haryana_2025_out"

# Govt / govt-aided medical & dental colleges in Haryana (state-run). Everything else is private.
GOVT_PATTERNS = [
    "pandit bhagwat dayal sharma pgims",          # PGIMS Rohtak
    "kalpana chawla govt",                        # GMC Karnal
    "bhagat phool singh govt",                    # BPS GMC for Women, Khanpur Kalan
    "shaheed hasan khan mewati govt",             # SHKM GMC Nalhar, Mewat
    "atal bihari vajpayee government",            # GMC Chhainsa, Faridabad
    "esic medical college",                       # ESIC NIT Faridabad (central govt)
    "pgids",                                      # Post Graduate Institute of Dental Sciences, Rohtak
]
# Buckets that are NOT state-quota merit seats
NON_STATE = re.compile(r"^(MGT|MINORITY|NRI)", re.IGNORECASE)
# Horizontal (sub-quota) suffixes appearing inside the category string
HORIZ_RE = re.compile(r"(PWBD|ESM_FF|ESM|FF)", re.IGNORECASE)
VERTICALS = ["OPEN_CAT", "BCA", "BCB", "SC_DEPRIVED", "SC", "EWS"]   # SC_DEPRIVED before SC (prefix)
PROGRAMS = {"M.B.B.S.": "MBBS", "B.D.S.": "BDS"}


def is_govt(name: str) -> bool:
    n = (name or "").lower()
    return any(p in n for p in GOVT_PATTERNS)


def split_category(cat: str):
    """'OPEN_CAT_PWBD' -> ('OPEN_CAT','PWBD'); 'BCB_ESM_FF Priority-III' -> ('BCB','ESM_FF').

    The PDF wraps long values, so whitespace inside the token is normalised first.
    """
    c = re.sub(r"\s+", "", (cat or "").upper())
    if not c or c == "-":
        return "", ""
    if NON_STATE.match(c):
        return c.split("_")[0], "NON_STATE"
    horiz = ""
    m = HORIZ_RE.search(c)
    if m:
        horiz = "PWBD" if m.group(1).upper() == "PWBD" else "ESM_FF"
    for v in VERTICALS:
        if c.startswith(v):
            return v, horiz
    return c, horiz


def parse(path: Path):
    rows = []
    with pdfplumber.open(path) as pdf:
        for pno, page in enumerate(pdf.pages, 1):
            for table in page.extract_tables() or []:
                for raw in table:
                    if not raw or len(raw) < 9:
                        continue
                    c = [" ".join(str(x or "").split()) for x in raw]
                    if not c[0].isdigit():
                        continue
                    if c[8].strip().lower() != "allotted":      # keep ONLY real allotments
                        continue
                    air, score = c[1].replace(",", ""), c[2].replace(",", "")
                    if not (air.isdigit() and score.isdigit()):
                        continue
                    prog = PROGRAMS.get(c[6].strip())
                    if not prog:
                        continue
                    vert, horiz = split_category(c[5])
                    rows.append({
                        "page": pno, "neet_air": int(air), "neet_score": int(score),
                        "name": c[3], "category_raw": c[5], "vertical": vert,
                        "horizontal": horiz, "program": prog, "college": c[7],
                        "is_govt": is_govt(c[7]), "remark": c[8],
                    })
    return rows


def build_closings(rows):
    """Closing AIR (max) and closing marks (min) per (college, program, vertical, horizontal)."""
    agg = defaultdict(lambda: {"closing_air": 0, "opening_air": 10**9,
                               "closing_marks": 10**9, "opening_marks": 0, "n": 0})
    for r in rows:
        if not r["vertical"]:
            continue
        k = (r["college"], r["program"], r["vertical"], r["horizontal"], r["is_govt"])
        a = agg[k]
        a["closing_air"] = max(a["closing_air"], r["neet_air"])
        a["opening_air"] = min(a["opening_air"], r["neet_air"])
        a["closing_marks"] = min(a["closing_marks"], r["neet_score"])
        a["opening_marks"] = max(a["opening_marks"], r["neet_score"])
        a["n"] += 1
    out = []
    for (college, program, vert, horiz, govt), a in sorted(agg.items()):
        out.append({"college": college, "program": program, "vertical": vert,
                    "horizontal": horiz, "is_govt": govt,
                    "closing_air": a["closing_air"], "opening_air": a["opening_air"],
                    "closing_marks": a["closing_marks"], "opening_marks": a["opening_marks"],
                    "allotted_count": a["n"]})
    return out


def write_csv(path, rows, cols):
    with open(path, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
        w.writeheader(); w.writerows(rows)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    print(f"Stage 1 — parsing {PDF.name} (234 pages)...")
    rows = parse(PDF)
    print(f"  ALLOTTED rows: {len(rows):,}")
    write_csv(OUT / "hr_allotments_2025.csv", rows,
              ["page", "neet_air", "neet_score", "name", "category_raw", "vertical",
               "horizontal", "program", "college", "is_govt", "remark"])

    print("\nStage 2 — closings per (college, program, vertical, horizontal)...")
    closings = build_closings(rows)
    write_csv(OUT / "hr_closing_2025.csv", closings,
              ["college", "program", "vertical", "horizontal", "is_govt",
               "closing_air", "opening_air", "closing_marks", "opening_marks", "allotted_count"])
    print(f"  closing rows: {len(closings):,}")

    from collections import Counter
    print("\n--- diagnostics ---")
    print("verticals:", dict(Counter(r["vertical"] for r in rows).most_common()))
    print("horizontals:", dict(Counter(r["horizontal"] or "(base)" for r in rows).most_common()))
    print("programs:", dict(Counter(r["program"] for r in rows)))
    govt = [r for r in rows if r["is_govt"]]
    print(f"govt rows: {len(govt):,} across {len({r['college'] for r in govt})} colleges")
    print("govt colleges:")
    for c in sorted({r["college"] for r in govt}):
        print("   ", c[:70])
    # model validation: their marks vs our curve at the same AIR
    print(f"\nwrote 2 CSVs to {OUT}")


if __name__ == "__main__":
    sys.exit(main())
