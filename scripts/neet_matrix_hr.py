#!/usr/bin/env python3
"""
Haryana state min-marks matrix. Same L1->L5 machinery.

Decisions (docs/NEET_2026_MATRIX_DECISIONS.md, "STATE SLICE — HARYANA"):
- SOURCE = **OUR OWN parser** `scripts/parse_haryana_2025.py` on the official DMER Haryana document
  (`amogh-csv/haryana-neet-ug-2025-round1-allotment.pdf`, 234pp, "Provisional Merit List cum
  Allotment ... Round I (Session 2025-26)", 14.08.2025). Haryana was previously THIRDPARTY-only in
  the Dropbox pipeline; the official portal `uhsrugcounselling.com` is in Maintenance Mode (503), so
  the PDF came via an aggregator mirror (same route Dropbox used for RJ-2024) — the document itself
  is the genuine official one.
- **MARKS-NATIVE + AIR:** the source carries BOTH `NEETScore` and `NEETAllIndiaRank`, so closings are
  taken in MARKS directly (no conversion). It also let us independently validate our score_rank
  model: mean error **+0.86 marks (sd 2.39)** across AIR 6.7k-1.1M — see decisions doc.
- **`Remark` filter is critical:** only 2,213 of 7,595 rows are actual allotments ("Allotted"); the
  rest are applicants with no seat (blank '-' category/course/institute). Ignoring `Remark` would
  corrupt every closing.
- **GOVT = 7 colleges** (PGIMS Rohtak, Kalpana Chawla GMC Karnal, BPS GMC Women Khanpur Kalan, SHKM
  GMC Nalhar, Atal Bihari Vajpayee GMC Chhainsa, ESIC NIT Faridabad, + PGIDS Rohtak for dental).
- **CATEGORIES (Haryana):** OPEN_CAT->Gen, EWS->Gen-EWS, **OBC = MEDIAN{BCA, BCB}** (Haryana's two
  backward blocks), **SC = MEDIAN{SC, SC_DEPRIVED}** (Deprived-SC sub-quota). **NO ST** in Haryana
  state quota (negligible ST population — same structural gap as Punjab) -> ST row = qualifying.
  EXCLUDED: MGT / MINORITY / NRI (not state-quota merit seats) and horizontal PWBD / ESM_FF.
- **⚠ ROUND CAVEAT: Round I only** -> floor runs STRICT (as with AIQ-R1, PB-R2, MP-R1, RJ-R1).
- FLOOR = median of loosest-5 govt colleges (MARKS space: loosest = LOWEST marks).
"""
import csv, json, statistics
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"
CLOSING = Path(__file__).resolve().parent / "haryana_2025_out" / "hr_closing_2025.csv"

STATE = "Haryana"
LAST_N = 5
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
# matrix base -> Haryana vertical(s). ST intentionally absent (no ST quota in HR state counselling).
SUBGROUPS = {"Gen": ["OPEN_CAT"], "Gen-EWS": ["EWS"], "OBC": ["BCA", "BCB"],
             "SC": ["SC", "SC_DEPRIVED"], "ST": []}
ROWS = [("Gen", False), ("Gen-EWS", False), ("OBC", False), ("SC", False), ("ST", False),
        ("PwD-Gen", True), ("PwD-EWS", True), ("PwD-OBC", True), ("PwD-SC", True), ("PwD-ST", True)]

shift = json.load(open(OUT / "shift_2026.json")); k, Mref = shift["k"], shift["Mref"]
def difficulty_shift(m): return k * max(0.0, Mref - m)

ROWS_IN = [r for r in csv.DictReader(open(CLOSING))
           if r["is_govt"] == "True" and r["horizontal"] == ""]

def vert_floor(prog, vert):
    """median-of-loosest-5 colleges (lowest closing MARKS) for one Haryana vertical."""
    per = {}
    for r in ROWS_IN:
        if r["program"] != prog or r["vertical"] != vert: continue
        mk = int(r["closing_marks"])
        if r["college"] not in per or mk < per[r["college"]]: per[r["college"]] = mk
    low = sorted(per.values())[:LAST_N]
    return round(statistics.median(low)) if low else None

def collapse(prog, groups):
    vals = [v for v in (vert_floor(prog, g) for g in groups) if v]
    return round(statistics.median(vals)) if vals else None

def cellvals(prog, label, pwd, q):
    if pwd: return dict(m25=q, m26=q)
    m25 = collapse(prog, SUBGROUPS.get(label, []))
    if not m25: return dict(m25=q, m26=q)
    return dict(m25=max(m25, q), m26=max(round(m25 + difficulty_shift(m25)), q))

rows_out = []
H = (f"{STATE} | {'category':9} {'B2b':>4} | {'MBBS25 marks':>12} {'MBBS26 marks':>12} | {'BDS25 marks':>12} {'BDS26 marks':>12}")
print(H); print("-"*len(H))
for label, pwd in ROWS:
    q = QUAL_2026[QCAT[label]]
    mb = cellvals("MBBS", label, pwd, q); bd = cellvals("BDS", label, pwd, q)
    rows_out.append({"state": STATE, "category": label, "B2b_qualifying_marks_2026": q,
        "B1a_MBBS_marks_2025": mb["m25"], "B1a_MBBS_AIR_2025": "",
        "B1a_MBBS_marks_2026est": mb["m26"], "B1a_MBBS_AIR_2026est": "",
        "B1b_BDS_marks_2025": bd["m25"], "B1b_BDS_AIR_2025": "",
        "B1b_BDS_marks_2026est": bd["m26"], "B1b_BDS_AIR_2026est": ""})
    print(f"{STATE[:3]} | {label:9} {q:>4} | {mb['m25']:>12} {mb['m26']:>12} | {bd['m25']:>12} {bd['m26']:>12}")

print("\nMBBS vertical floors (marks):", {v: vert_floor("MBBS", v) for v in
      ["OPEN_CAT", "EWS", "BCA", "BCB", "SC", "SC_DEPRIVED"]})
print("OBC = median(BCA,BCB); SC = median(SC,SC_DEPRIVED); NO ST quota in Haryana -> qualifying.")
print("NOTE: Round I only -> runs STRICT vs final-round states.")

outp = OUT / "hr_matrix_final.csv"
with open(outp, "w", newline="") as fh:
    cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nHR: OUR parser on official DMER PDF | MARKS-native | Remark=Allotted only | wrote {outp}")
