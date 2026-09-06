#!/usr/bin/env python3
"""
Karnataka state min-marks matrix. Same L1->L5 machinery as AIQ/MH/TG.

Decisions (docs/NEET_2026_MATRIX_DECISIONS.md, "STATE SLICE — KARNATAKA"):
- SOURCE = THEIR pipeline (`KA_closing_ranks_state_govt_2025.csv`), NOT ours. Reason: our
  `karnataka_2025_r3_cutoffs` parse is thin (318 rows, only ~5/24 true-govt colleges matchable)
  AND its "Government" seat-type label is contaminated with private/minority colleges. Theirs has
  703 MBBS rows across all 24 true-govt colleges + a clean fee-based govt classifier. This is the
  first state where THEIRS is clearly better; we take it. (AIR-native confirmed: their tightest GM
  = Bangalore Medical College 3,478, matches ours to the digit.)
- GOVT FILTER = THEIR `KA_college_govt_classification.csv` `is_true_govt` (fee-based: genuine govt
  charge ~Rs 64,350; private/minority ~Rs 153k+). Fee test cleanly separates them.
- CATEGORIES (decode confirmed vs mbbscouncil.com official KA abbrev table + neetugguidance):
  KA codes = <vertical><suffix>, suffix G=general/plain, H=HK-region(371J), K=Kannada, R=Rural.
  Gen<-GM, SC<-SCG, ST<-STG (plain-G variant).
  * OBC = KA categories 1/2A/2B/3A/3B (all G variant). NOT deferred (Surya). Collapse = SEAT-WEIGHTED
    median (Amogh's method): seat %s from KA reservation policy — 2A=15% (dominant), 1=4%, 2B=4%,
    3A=4%, 3B=5%. Weighted median lands near 2A (the biggest, most-accessible OBC pool) = the honest
    "typical OBC door", avoids over-qualifying on a sparse tight sub-cat.
  * EWS = KA has NO separate EWS govt allotment code (confirmed: full official abbrev list has none;
    policy 10% EWS is carved FROM GM). So Gen-EWS <- GM floor (EWS tracks GM, "slightly below" per
    KEA + neetugguidance AIQ shows EWS ~4 marks under GM). Not a blank/qualifying fallback.
- FLOOR = median of loosest-5 true-govt colleges (unified rule, 2026-07-24). PwD = qualifying.
- SEAT_GROWTH = 1.008 (placeholder like MH/TG; no evidence of large KA govt expansion 2026).
"""
import csv, json, re, statistics
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"
SC_DIR = REPO / "amogh-csv/medical-state-counselling/extracted_data"
CLOSE = SC_DIR / "KA_closing_ranks_state_govt_2025.csv"
GOVTCLS = SC_DIR / "KA_college_govt_classification.csv"

STATE = "Karnataka"
SEAT_GROWTH = 1.008
LAST_N = 5
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
# matrix row -> KA plain-G code. Simple 1:1 rows:
CODE_FOR = {"Gen": "GM", "SC": "SCG", "ST": "STG"}
# OBC = seat-weighted median across KA's 5 OBC sub-cats (G variant). Weights = KA reservation %s
# (2A=15% dominant; others 4-5%). Confirmed vs neet2seat/mbbscouncil KA category docs. 2024 Muslim-
# quota redistribution leaves 2B/3A/3B slightly uncertain but all ~4-5%; 2A=15% is the robust anchor.
OBC_WEIGHTS = {"1G": 4, "2AG": 15, "2BG": 5, "3AG": 4, "3BG": 4}
# EWS = GM floor: KA has NO separate EWS govt allotment code (carved from GM); EWS tracks GM slightly
# below (KEA policy + neetugguidance AIQ shows EWS ~4 marks under GM). So Gen-EWS <- GM.
EWS_FROM = "GM"
ROWS = [("Gen", False), ("Gen-EWS", False), ("OBC", False), ("SC", False), ("ST", False),
        ("PwD-Gen", True), ("PwD-EWS", True), ("PwD-OBC", True), ("PwD-SC", True), ("PwD-ST", True)]

# ---- 2025 curve + difficulty shift (shared) ----
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

# ---- true-govt filter (fee-based, theirs) ----
def gv_set(prog):
    return set(r["college_clean"] for r in csv.DictReader(open(GOVTCLS))
               if r["program"] == prog and r["is_true_govt"] == "True")

# ---- floor: loosest-per-college -> median of loosest-5 ----
def floor_of(per_college):
    deep = sorted(per_college.values(), reverse=True)[:LAST_N]
    return int(statistics.median(deep)) if deep else 0

def build_floors(prog):
    gv = gv_set(prog)
    col = defaultdict(lambda: defaultdict(int))       # category code -> {college: loosest AIR}
    for r in csv.DictReader(open(CLOSE)):
        if r["program"] != prog or r["college_clean"] not in gv: continue
        cr = int(float(r["closing_rank"]))
        c = r["category"]
        if cr > col[c][r["college_clean"]]: col[c][r["college_clean"]] = cr
    return {c: floor_of(v) for c, v in col.items()}

mbbs = build_floors("MBBS")
bds = build_floors("BDS")

def resolve_air(floors, label):
    """Return the floor AIR for a matrix row from a per-code floor dict, applying KA-specific
    category logic (OBC seat-weighted median, EWS<-GM)."""
    if label in CODE_FOR:
        return floors.get(CODE_FOR[label], 0)
    if label == "OBC":
        # seat-weighted median: repeat each sub-cat AIR by its seat % then take median
        w = []
        for code, wt in OBC_WEIGHTS.items():
            a = floors.get(code, 0)
            if a: w += [a] * wt
        return int(statistics.median(w)) if w else 0
    if label == "Gen-EWS":
        return floors.get(EWS_FROM, 0)
    return 0

def cellvals(floors, label, pwd, q):
    air25 = 0 if pwd else resolve_air(floors, label)
    if not air25:
        return dict(m25=q, air25="", m26=q, air26="")
    m25, air26, m26 = project(air25)
    return dict(m25=max(m25, q), air25=air25, m26=max(m26, q), air26=air26)

rows_out = []
H = (f"{STATE} | {'category':9} {'B2b':>4} | {'MBBS25 mk/rank':>16} {'MBBS26 mk/rank':>16} | {'BDS25 mk/rank':>16} {'BDS26 mk/rank':>16}")
print(H); print("-"*len(H))
for label, pwd in ROWS:
    q = QUAL_2026[QCAT[label]]
    mb = cellvals(mbbs, label, pwd, q); bd = cellvals(bds, label, pwd, q)
    rows_out.append({"state": STATE, "category": label, "B2b_qualifying_marks_2026": q,
        "B1a_MBBS_marks_2025": mb["m25"], "B1a_MBBS_AIR_2025": mb["air25"],
        "B1a_MBBS_marks_2026est": mb["m26"], "B1a_MBBS_AIR_2026est": mb["air26"],
        "B1b_BDS_marks_2025": bd["m25"], "B1b_BDS_AIR_2025": bd["air25"],
        "B1b_BDS_marks_2026est": bd["m26"], "B1b_BDS_AIR_2026est": bd["air26"]})
    def f(c): return f"{c['m25']}/{c['air25']}", f"{c['m26']}/{c['air26']}"
    a, b = f(mb); c1, d1 = f(bd)
    print(f"{STATE[:3]} | {label:9} {q:>4} | {a:>16} {b:>16} | {c1:>16} {d1:>16}")

outp = OUT / "karnataka_matrix_final.csv"
with open(outp, "w", newline="") as fh:
    cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nKA: THEIR pipeline + fee-based true-govt | Gen=GM SC=SCG ST=STG | OBC=seat-weighted median(2A dom) | EWS=GM | median-of-5 | wrote {outp}")
