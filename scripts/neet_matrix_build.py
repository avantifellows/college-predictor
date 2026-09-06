#!/usr/bin/env python3
"""
NEET AIQ min-marks matrix — full build L1->L5 (point estimates, govt-only, national quota).
See docs/NEET_2026_MATRIX_DECISIONS.md.

L1/base : 2025 govt-college AIQ closing AIR per (program, category), NATIONAL quota pool only
          ({All India, Open Seat Quota}) from the reconciled govt data. Floor = max (loosest
          govt college) — robust because national-quota filter removes AMU/Delhi/ESIC-quota spikes.
L3      : floor AIR -> 2025 marks via our 32k-point score_rank model (inverted).
L4/L5   : 2026 estimate =
          rank_2026 = floor_AIR_2025 * SEAT_GROWTH (govt MBBS intake +5.3% -> ranks ~5.3% looser)
          marks_2026 = marks_2025_curve(rank_2026) + DIFFICULTY_SHIFT(marks)     [shift measured from 185 JNV]
          B2b qualifying = published NTA 2026 floor (real).
Point estimates (no bands) so students can be bucketed. Every factor logged in the decisions doc.
"""
import csv, json, re
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"; OUT.mkdir(exist_ok=True)

NATIONAL = {"All India", "Open Seat Quota"}
CATS = ["Open", "OBC", "EWS", "SC", "ST"]
SEAT_GROWTH = 1.053          # govt MBBS intake 60485->63683 (their seat matrix)
# 2026 qualifying floors (NTA), base + PwD rows. PwD-Gen/EWS 45th pctile=194; PwD-OBC/SC 40th=177; PwD-ST=178.
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
# Rows to emit (label -> base category for closing lookup, is_pwd flag)
ROWS = [("Gen", "Open", False), ("Gen-EWS", "EWS", False), ("OBC", "OBC", False),
        ("SC", "SC", False), ("ST", "ST", False),
        ("PwD-Gen", "Open", True), ("PwD-EWS", "EWS", True), ("PwD-OBC", "OBC", True),
        ("PwD-SC", "SC", True), ("PwD-ST", "ST", True)]
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}

# ---- 2025 score<->AIR backbone (our model) ----
model = json.load(open(REPO / "public/data/NEETUG/score_rank_model.json"))
def polyval(c, x):
    v = 0.0
    for a in c: v = v * x + a
    return v
def air2025(score):
    s = max(model["min_trusted_score"], min(score, model["max_trusted_score"]))
    return 10 ** polyval(model["coeffs"], s)
def marks2025_at_air(air):
    lo, hi = model["min_trusted_score"], model["max_trusted_score"]
    if air <= air2025(hi): return hi          # tighter than trusted top -> cap
    for _ in range(60):
        mid = (lo + hi) / 2
        if air2025(mid) > air: lo = mid
        else: hi = mid
    return (lo + hi) / 2

# ---- measured 2025->2026 difficulty shift: Delta(marks2025) = k*max(0, Mref-marks2025) ----
shift = json.load(open(OUT / "shift_2026.json"))
k, Mref = shift["k"], shift["Mref"]
def difficulty_shift(m2025):
    return k * max(0.0, Mref - m2025)

# ---- L1 base: national-quota govt floors, keyed on (prog, cat, is_pwd) ----
their = list(csv.DictReader(open(REPO / "amogh-csv/medical-national-ranks/extracted_data/govt_medical_closing_ranks_r1_2025.csv")))
def is_pwd_row(r): return r["is_pwd"].lower() in ("true", "1", "yes")
floor = {}   # (prog, cat, pwd) -> (airfloor, institute)
for prog in ("MBBS", "BDS"):
    for c in CATS:
        for pwd in (False, True):
            cand = [(int(float(r["closing_rank"])), r["institute"]) for r in their
                    if prog in r["course"].upper() and r["quota"] in NATIONAL and r["category"] == c
                    and is_pwd_row(r) == pwd]
            if cand:
                floor[(prog, c, pwd)] = max(cand)

def marks_for_closing(air25):
    """2025 closing marks and 2026 estimate for a given 2025 closing AIR."""
    m25 = marks2025_at_air(air25)
    air26 = air25 * SEAT_GROWTH
    m26 = marks2025_at_air(air26) + difficulty_shift(marks2025_at_air(air26))
    return round(m25), round(air26), round(m26)

def air_for_marks_2026(marks):
    """Inverse: the 2026 AIR at a given 2026 marks (for qualifying-gated PwD rows,
    to report a plausible rank next to the qualifying marks). Uses 2025 curve on
    the equivalent 2025 marks (marks - difficulty_shift), i.e. Amogh-consistent."""
    # solve difficulty: 2026 marks m corresponds to 2025 marks m' with m = m' + shift(m')
    lo, hi = 100.0, marks
    for _ in range(60):
        m2025 = (lo + hi) / 2
        if m2025 + difficulty_shift(m2025) < marks: lo = m2025
        else: hi = m2025
    return round(air2025((lo + hi) / 2) / SEAT_GROWTH)  # 2026 rank ~ 2025-rank-at-equiv / growth… (approx)

# ---- build matrix: all 10 rows (base + PwD) x {MBBS=B1a, BDS=B1b} + B2b qualifying ----
# min-marks = max(qualifying floor, closing-implied marks). For PwD the sparse deep pool closes
# BELOW the qualifying gate, so PwD min-marks correctly = the qualifying floor.
def cell(prog, base, pwd, q):
    """Return dict of 2025 & 2026 marks+AIR for one (program, category) cell."""
    key = (prog, base, pwd)
    if pwd:
        # PwD sub-pool closes below the qualifying gate -> binding MARKS min = qualifying.
        # Report the real deep pool closing AIR (2025 & 2026-est) as the descriptive rank.
        if key in floor:
            air25, _ = floor[key]
            return dict(m25=q, air25=air25, m26=q, air26=round(air25 * SEAT_GROWTH), basis="PwD=qual")
        return dict(m25=q, air25="", m26=q, air26="", basis="PwD=qual;no-seats")
    if key not in floor:
        return dict(m25=q, air25="", m26=q, air26="", basis="no-natl-seats->qual")
    air25, _ = floor[key]
    m25, air26, m26 = marks_for_closing(air25)
    return dict(m25=max(round(m25), q), air25=air25, m26=max(m26, q), air26=air26, basis="closing")

rows_out = []
H = (f"{'category':9} {'B2b':>4} | "
     f"{'MBBS25 mk/rank':>16} {'MBBS26 mk/rank':>16} | "
     f"{'BDS25 mk/rank':>16} {'BDS26 mk/rank':>16}")
print(H); print("-" * len(H))
for label, base, pwd in ROWS:
    q = QUAL_2026[QCAT[label]]
    mb = cell("MBBS", base, pwd, q)
    bd = cell("BDS", base, pwd, q)
    rows_out.append({
        "category": label, "B2b_qualifying_marks_2026": q,
        "B1a_MBBS_marks_2025": mb["m25"], "B1a_MBBS_AIR_2025": mb["air25"],
        "B1a_MBBS_marks_2026est": mb["m26"], "B1a_MBBS_AIR_2026est": mb["air26"],
        "B1b_BDS_marks_2025": bd["m25"], "B1b_BDS_AIR_2025": bd["air25"],
        "B1b_BDS_marks_2026est": bd["m26"], "B1b_BDS_AIR_2026est": bd["air26"],
        "basis": mb["basis"],
    })
    def fmt(c): return f"{c['m25']}/{c['air25']}", f"{c['m26']}/{c['air26']}"
    a, b = fmt(mb); c1, d1 = fmt(bd)
    print(f"{label:9} {q:>4} | {a:>16} {b:>16} | {c1:>16} {d1:>16}")

with open(OUT / "aiq_matrix_final.csv", "w", newline="") as f:
    cols = ["category", "B2b_qualifying_marks_2026",
            "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est",
            "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est", "basis"]
    w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
    w.writeheader()
    for rec in rows_out:
        w.writerow(rec)
print(f"\nseat growth {SEAT_GROWTH} | difficulty Delta={k:.3f}*max(0,{Mref:.0f}-m) | 2025 shown alongside 2026 | wrote {OUT/'aiq_matrix_final.csv'}")
