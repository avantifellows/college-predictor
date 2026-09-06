#!/usr/bin/env python3
"""
Assam state min-marks matrix. Same L1->L5 machinery.

Decisions (docs/NEET_2026_MATRIX_DECISIONS.md, "STATE SLICE — ASSAM"):
- SOURCE = THEIR RAW allotments (`AS_all_allotments_2025.csv`), which has clean per-candidate
  `neet_air` + `neet_score` + `state_rank` + `quota_seat` + `final_pool`. AIR-native (neet_air col).
- **⚠ PARSER BUG (found on audit) — `final_pool`/`quota_seat` mis-assignment.** Some very-low-score
  candidates (score ~150-210, category OBC/SC) are dumped into UR/other seats at deep AIR (e.g. Dhubri
  UR had two OBC score-154 rows at AIR ~1.03M; Jorhat UR a score-205 row at AIR 779k). Taking raw
  max(neet_air) per pool → absurd closings (Assam Medical UR 614k, OBC 1.06M; UR looser than SC!).
  FIX: score-sanity guard — within each (college, pool) drop holders with neet_score < 350 (real
  closing clusters sit >=~490 marks; the mis-pool tail is always <210). Logged back-prop.
- GOVT: their inst codes 101-113 (13 MBBS) + 201-203 (3 BDS). CATEGORIES (Assam pools):
  UR->Gen, EWS->Gen-EWS, OBC/MOBC(NCL)->OBC, SC->SC, ST = median of ST(P) Plains + ST(H) Hills.
  UR floor uses category==General only (cleanest). PwD row = qualifying.
- FLOOR = median of loosest-5 govt colleges. SEAT_GROWTH=1.008. AIR-native -> rank->marks via model.
- CAVEAT: small NE state; messy source (parser mis-pool). Cross-check vs our AIQ-in-Assam if available.
"""
import csv, json, statistics
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"
RAW = REPO / "amogh-csv/medical-state-counselling/extracted_data/AS_all_allotments_2025.csv"

STATE = "Assam"
SEAT_GROWTH = 1.008
LAST_N = 5
SCORE_MIN = 350   # sanity guard: drop mis-pooled low-score contaminants (real clusters >=~490)
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
GOVT_MBBS = set(str(c) for c in range(101, 114))
GOVT_BDS = set(str(c) for c in range(201, 204))
# matrix base -> (quota_seat pool(s), category-restrict). ST = median of ST(P)+ST(H).
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

def floor_of(per_college):
    deep = sorted(per_college.values(), reverse=True)[:LAST_N]
    return int(statistics.median(deep)) if deep else 0

RAWROWS = list(csv.DictReader(open(RAW)))
def pool_floor(prog, pools, cat_restrict=None):
    """Closing AIR per college for the given quota_seat pool(s), with score-sanity guard.
    cat_restrict: if set, only count candidates whose `category` is in this set (used for UR=General)."""
    govt = GOVT_MBBS if prog == "MBBS" else GOVT_BDS
    per = defaultdict(int)
    for r in RAWROWS:
        if str(r["inst_code"]) not in govt or r["program"] != prog: continue
        if r["quota_seat"] not in pools: continue
        if cat_restrict and r["category"] not in cat_restrict: continue
        if not (str(r["neet_air"]).strip().isdigit() and str(r["neet_score"]).strip().isdigit()): continue
        if int(r["neet_score"]) < SCORE_MIN: continue     # drop mis-pooled contaminants
        air = int(r["neet_air"])
        if air > per[r["college_canon"]]: per[r["college_canon"]] = air
    return floor_of(per)

def st_floor(prog):
    """ST = median of ST(P) and ST(H) floors."""
    p, h = pool_floor(prog, {"ST(P)"}), pool_floor(prog, {"ST(H)"})
    vals = [x for x in (p, h) if x]
    return int(statistics.median(vals)) if vals else 0

def floor_for(prog, label):
    if label == "Gen":     return pool_floor(prog, {"UR"}, cat_restrict={"General"})
    if label == "Gen-EWS": return pool_floor(prog, {"EWS"})
    if label == "OBC":     return pool_floor(prog, {"OBC/MOBC(NCL)"})
    if label == "SC":      return pool_floor(prog, {"SC"})
    if label == "ST":      return st_floor(prog)
    return 0

def cellvals(prog, label, pwd, q):
    air25 = 0 if pwd else floor_for(prog, label)
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

outp = OUT / "as_matrix_final.csv"
with open(outp, "w", newline="") as fh:
    cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nAS: RAW + score>={SCORE_MIN} sanity guard (fixes final_pool mis-assignment) | ST=med(ST(P),ST(H)) | median-of-5 | wrote {outp}")
