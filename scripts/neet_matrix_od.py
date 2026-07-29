#!/usr/bin/env python3
"""
Odisha state min-marks matrix. Same L1->L5 machinery.

Decisions (docs/NEET_2026_MATRIX_DECISIONS.md, "STATE SLICE — ODISHA"):
- **CLOSES THE ODISHA GAP.** Previously unbuildable: the only data was
  `OD_closing_ranks_state_govt_2025_THIRDPARTY.csv` (33 rows, `NOT_OFFICIAL=True`, mixed years +
  mixed rank types), and — unlike AS/GJ/JH/JK/KL/RJ/TN/UK — **no Odisha state-rank->AIR curve
  existed**. Surya supplied the two official OJEE documents that fix both problems.
- SOURCE = **OUR parser** `scripts/parse_odisha_2025.py` over:
  1. `191568Odisha R3 MBBS Cutoff 2025.pdf` — OJEE-2025 "Provisional Allotment (Common State Rank
     wise) MBBS/BDS, **3rd Round**", No. OJEE/0635 dated 28-10-2025 -> 1,940 allotments, 15 govt
     colleges. R3 = deep/final-ish round (better than the R1-only states).
  2. `2025072943.pdf` — OJEE-2025 "Provisional State Merit List for MBBS/BDS 2025-26" -> **5,817
     exact (State_AIR -> NEET_AIR) pairs**, the missing bridge (state rank 1..5,817; AIR 180..1.32M).
- METHOD: closing STATE rank (doc 1) --bridge (doc 2)--> closing NEET AIR --our model--> marks.
  Bridge verified smooth/monotonic: state 1->AIR 180, 118->4,523, 1000->28,844, 5817->1,255,108.
- BASE SEATS ONLY: `QUOTA` must be regular (not SGS/NRI) and no horizontal GC/PC/EX flag
  (Green Card / Physically Challenged / Ex-serviceman close much deeper). 1,407 of 1,940 rows.
- **CATEGORIES: Odisha's state-quota scheme has only GN / EW / SC / ST — there is NO OBC bucket**
  (Odisha's SEBC does not appear in this counselling). GN->Gen, EW->Gen-EWS, SC->SC, ST->ST;
  **OBC row = qualifying (documented structural gap, not a parse miss)**. PwD row = qualifying.
- FLOOR = median of loosest-5 govt colleges (14 govt MBBS -> robust). SEAT_GROWTH=1.008.
"""
import csv, json, statistics
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"
CLOSING = Path(__file__).resolve().parent / "odisha_2025_out" / "od_closing_2025.csv"

STATE = "Odisha"
SEAT_GROWTH = 1.008
LAST_N = 5
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
# matrix row -> Odisha category code. OBC intentionally None (no OBC in OD state quota).
CODE_FOR = {"Gen": "GN", "Gen-EWS": "EW", "OBC": None, "SC": "SC", "ST": "ST"}
ROWS = [("Gen", False), ("Gen-EWS", False), ("OBC", False), ("SC", False), ("ST", False),
        ("PwD-Gen", True), ("PwD-EWS", True), ("PwD-OBC", True), ("PwD-SC", True), ("PwD-ST", True)]

model = json.load(open(REPO / "public/data/NEETUG/score_rank_model.json"))
def polyval(c, x):
    v = 0.0
    for a in c: v = v*x + a
    return v
def air2025(s):
    s = max(model["min_trusted_score"], min(s, model["max_trusted_score"])); return 10**polyval(model["coeffs"], s)
def marks2025_at_air(air):
    lo, hi = model["min_trusted_score"], model["max_trusted_score"]
    if air <= air2025(hi): return hi
    if air >= air2025(lo): return lo
    for _ in range(60):
        mid = (lo+hi)/2
        if air2025(mid) > air: lo = mid
        else: hi = mid
    return (lo+hi)/2
shift = json.load(open(OUT / "shift_2026.json")); k, Mref = shift["k"], shift["Mref"]
def difficulty_shift(m): return k * max(0.0, Mref - m)
def project(air25):
    air26 = air25 * SEAT_GROWTH
    return round(marks2025_at_air(air25)), round(air26), round(marks2025_at_air(air26) + difficulty_shift(marks2025_at_air(air26)))

ROWS_IN = [r for r in csv.DictReader(open(CLOSING)) if r["is_govt"] == "True"]

def floor_air(prog, cat):
    per = {}
    for r in ROWS_IN:
        if r["program"] != prog or r["category"] != cat: continue
        a = int(r["closing_air"])
        if r["college"] not in per or a > per[r["college"]]: per[r["college"]] = a
    deep = sorted(per.values(), reverse=True)[:LAST_N]
    return int(statistics.median(deep)) if deep else 0

def cellvals(prog, label, pwd, q):
    code = CODE_FOR.get(label)
    air25 = 0 if (pwd or not code) else floor_air(prog, code)
    if not air25:
        return dict(m25=q, air25="", m26=q, air26="")
    m25, air26, m26 = project(air25)
    return dict(m25=max(m25, q), air25=air25, m26=max(m26, q), air26=air26)

rows_out = []
H = (f"{STATE} | {'category':9} {'B2b':>4} | {'MBBS25 mk/rank':>16} {'MBBS26 mk/rank':>16} | {'BDS25 mk/rank':>16} {'BDS26 mk/rank':>16}")
print(H); print("-"*len(H))
for label, pwd in ROWS:
    q = QUAL_2026[QCAT[label]]
    mb = cellvals("MBBS", label, pwd, q); bd = cellvals("BDS", label, pwd, q)
    rows_out.append({"state": STATE, "category": label, "B2b_qualifying_marks_2026": q,
        "B1a_MBBS_marks_2025": mb["m25"], "B1a_MBBS_AIR_2025": mb["air25"],
        "B1a_MBBS_marks_2026est": mb["m26"], "B1a_MBBS_AIR_2026est": mb["air26"],
        "B1b_BDS_marks_2025": bd["m25"], "B1b_BDS_AIR_2025": bd["air25"],
        "B1b_BDS_marks_2026est": bd["m26"], "B1b_BDS_AIR_2026est": bd["air26"]})
    def f(c): return f"{c['m25']}/{c['air25']}", f"{c['m26']}/{c['air26']}"
    a, b = f(mb); c1, d1 = f(bd)
    print(f"{STATE[:3]} | {label:9} {q:>4} | {a:>16} {b:>16} | {c1:>16} {d1:>16}")

print("\nMBBS govt floors (AIR):", {c: floor_air("MBBS", c) for c in ["GN", "EW", "SC", "ST"]})
print("NOTE: Odisha state quota has NO OBC bucket (only GN/EW/SC/ST) -> OBC row = qualifying.")
print("Round 3 (deep/final-ish). Bridge: 5,817 official state-rank<->AIR pairs.")

outp = OUT / "od_matrix_final.csv"
with open(outp, "w", newline="") as fh:
    cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nOD: OUR parser on 2 official OJEE PDFs (R3 allotment + merit-list bridge) | wrote {outp}")
