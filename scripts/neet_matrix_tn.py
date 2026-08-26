#!/usr/bin/env python3
"""
Tamil Nadu state min-marks matrix. Same L1->L5 machinery — BUT TN is a special (easy) case:
TN publishes CLOSING MARKS (`closing_tmark`) directly, so NO rank->AIR->marks conversion is needed.
We use tmark as the 2025 marks and apply ONLY the difficulty shift for 2026.

Decisions (docs/NEET_2026_MATRIX_DECISIONS.md, "STATE SLICE — TAMIL NADU"):
- SOURCE = THEIRS (`TN_closing_ranks_state_govt_2025.csv`). Dropbox-only. PARSER AUDITED
  (state_TN.py): clean — parses TN GQ round PDFs; provides BOTH `closing_grank` (TN state merit rank)
  and **`closing_tmark` (NEET MARKS)** per (college, community). Verified tmark = NEET marks (range
  237-597; Chengalpattu OC 547 > BC 534 > SC 477 > ST 448 — textbook). govt filter keeps "Govt.
  Colleges" (36 MBBS + 3 BDS), drops govt-quota-in-private. Round = through R3 (last_round_with_max).
- **NO CONVERSION NEEDED** — use `closing_tmark` as 2025 closing marks directly. 2026 = 2025_marks +
  difficulty_shift(2025_marks). (Skips rank-space entirely — cleanest state so far. Avoids the
  state-rank->AIR error source that TN's `closing_grank` would otherwise require.)
- CATEGORIES (TN community scheme): OC->Gen. OBC = MEDIAN of {BC, BCM, MBC&DNC}. SC = MEDIAN of
  {SC, SCA}. ST->ST. NO EWS in TN state allotment (TN 69% reservation, EWS absent from data) ->
  Gen-EWS = qualifying. PwD row = qualifying.
- FLOOR = median of the loosest-5 colleges' closing MARKS (min marks = loosest = LOWEST marks).
  NOTE marks-space: "loosest" = lowest closing_tmark. SEAT_GROWTH n/a (marks direct; no rank drift).
"""
import csv, json, statistics
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"
THEIR = REPO / "amogh-csv/medical-state-counselling/extracted_data/TN_closing_ranks_state_govt_2025.csv"

STATE = "Tamil Nadu"
LAST_N = 5
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
# matrix base -> TN community code(s) to median-collapse
SUBGROUPS = {"Gen": ["OC"], "Gen-EWS": [], "OBC": ["BC", "BCM", "MBC&DNC"], "SC": ["SC", "SCA"], "ST": ["ST"]}
ROWS = [("Gen", False), ("Gen-EWS", False), ("OBC", False), ("SC", False), ("ST", False),
        ("PwD-Gen", True), ("PwD-EWS", True), ("PwD-OBC", True), ("PwD-SC", True), ("PwD-ST", True)]

# difficulty shift (marks-space, same params as everywhere)
shift = json.load(open(OUT / "shift_2026.json")); k, Mref = shift["k"], shift["Mref"]
def difficulty_shift(m): return k * max(0.0, Mref - m)

def floor_marks(per_college):
    """min-marks floor = median of the loosest-5 colleges. In MARKS space, loosest = LOWEST marks."""
    lowest = sorted(per_college.values())[:LAST_N]     # lowest closing marks = most accessible
    return round(statistics.median(lowest)) if lowest else None

def build_floors(prog):
    col = defaultdict(lambda: defaultdict(lambda: 10**9))   # community -> {college: LOWEST closing marks}
    for r in csv.DictReader(open(THEIR)):
        if r["program"] != prog: continue
        if not str(r["closing_tmark"]).strip().lstrip("-").isdigit(): continue
        c = r["community"]; tm = int(r["closing_tmark"])
        if tm < col[c][r["college"]]: col[c][r["college"]] = tm
    return {c: floor_marks(v) for c, v in col.items()}

mbbs = build_floors("MBBS")
bds = build_floors("BDS")

def collapse(floors, groups):
    vals = [floors[g] for g in groups if floors.get(g)]
    return round(statistics.median(vals)) if vals else None

def cellvals(floors, groups, pwd, q):
    if pwd or not groups:
        return dict(m25=q, m26=q)
    m25 = collapse(floors, groups)
    if not m25:
        return dict(m25=q, m26=q)
    m26 = round(m25 + difficulty_shift(m25))
    return dict(m25=max(m25, q), m26=max(m26, q))

rows_out = []
H = (f"{STATE} | {'category':9} {'B2b':>4} | {'MBBS25 marks':>12} {'MBBS26 marks':>12} | {'BDS25 marks':>12} {'BDS26 marks':>12}")
print(H); print("-"*len(H))
for label, pwd in ROWS:
    q = QUAL_2026[QCAT[label]]
    groups = SUBGROUPS.get(label, [])
    mb = cellvals(mbbs, groups, pwd, q); bd = cellvals(bds, groups, pwd, q)
    rows_out.append({"state": STATE, "category": label, "B2b_qualifying_marks_2026": q,
        "B1a_MBBS_marks_2025": mb["m25"], "B1a_MBBS_AIR_2025": "",
        "B1a_MBBS_marks_2026est": mb["m26"], "B1a_MBBS_AIR_2026est": "",
        "B1b_BDS_marks_2025": bd["m25"], "B1b_BDS_AIR_2025": "",
        "B1b_BDS_marks_2026est": bd["m26"], "B1b_BDS_AIR_2026est": ""})
    print(f"{STATE[:3]} | {label:9} {q:>4} | {mb['m25']:>12} {mb['m26']:>12} | {bd['m25']:>12} {bd['m26']:>12}")

print("\nTN community floors (MARKS): OBC=med(BC,BCM,MBC):", {g: mbbs.get(g) for g in ['BC','BCM','MBC&DNC']},
      " SC=med(SC,SCA):", {g: mbbs.get(g) for g in ['SC','SCA']})
print("NOTE: MARKS-native (closing_tmark) — no rank/AIR conversion. AIR columns left blank for TN.")

outp = OUT / "tn_matrix_final.csv"
with open(outp, "w", newline="") as fh:
    cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nTN: MARKS-native (closing_tmark, no conversion!) | OBC=med(BC/BCM/MBC), SC=med(SC/SCA), no EWS | median-of-5 | wrote {outp}")
