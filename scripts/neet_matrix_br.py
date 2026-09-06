#!/usr/bin/env python3
"""
Bihar state min-marks matrix. Same L1->L5 machinery.

Decisions (docs/NEET_2026_MATRIX_DECISIONS.md, "STATE SLICE — BIHAR"):
- SOURCE = THEIRS (`BR_closing_ranks_state_govt_2025.csv`). Dropbox-only. PARSER AUDITED
  (state_BR.py): clean & well-built — parses BCECEB R3-revised PDF, uses `neet_air` explicitly
  (AIR-native, verified: PMC Patna UR closes AIR 8,261 / IGIMS 9,583 = plausible top-Bihar NEET AIR),
  HARD-CODED 15-college govt list (safer than keyword — no PPP-style contamination; verified all 15
  genuinely govt incl. remote KMC Katihar 135k / NMC Sasaram 309k). Round = R3-revised (final main;
  stray excluded).
- CATEGORIES: Bihar verticals = UR / BC / EBC / EWS / SC / ST. UR->Gen, EWS->Gen-EWS, SC->SC, ST->ST.
  OBC = MEDIAN of {BC, EBC} (Bihar splits OBC into Backward Class + Extremely Backward Class; collapse
  by median, consistent with WB OBC-A/B and TG BC sub-groups). PwD row = qualifying.
- FLOOR = median of loosest-5 govt colleges. SEAT_GROWTH=1.008.
"""
import csv, json, statistics
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"
THEIR = REPO / "amogh-csv/medical-state-counselling/extracted_data/BR_closing_ranks_state_govt_2025.csv"

STATE = "Bihar"
SEAT_GROWTH = 1.008
LAST_N = 5
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
# matrix base -> Bihar vertical code(s); OBC = median of BC + EBC
SUBGROUPS = {"Gen": ["UR"], "Gen-EWS": ["EWS"], "OBC": ["BC", "EBC"], "SC": ["SC"], "ST": ["ST"]}
ROWS = [("Gen", False), ("Gen-EWS", False), ("OBC", False), ("SC", False), ("ST", False),
        ("PwD-Gen", True), ("PwD-EWS", True), ("PwD-OBC", True), ("PwD-SC", True), ("PwD-ST", True)]

# ---- 2025 curve + shift ----
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

# ---- floor: loosest-per-college -> median of loosest-5 ----
def floor_of(per_college):
    deep = sorted(per_college.values(), reverse=True)[:LAST_N]
    return int(statistics.median(deep)) if deep else 0

# Their parser's hard-coded govt list WRONGLY includes 2 PRIVATE colleges (verified vs
# neetugguidance Bihar govt vs private tables): KMC Katihar (Muslim-minority private) and
# Narayan MC Sasaram (private). Exclude them. (Back-prop bug in state_BR.py GOVT_BR_PATTERNS.)
PRIVATE_MISLABELED = ["KATIHAR", "SASARAM"]
def is_private_mislabel(name):
    return any(p in name.upper() for p in PRIVATE_MISLABELED)

def build_floors(prog):
    col = defaultdict(lambda: defaultdict(int))   # vert -> {college: closing AIR}
    for r in csv.DictReader(open(THEIR)):
        if r["program"] != prog: continue
        if is_private_mislabel(r["institute"]): continue   # KMC Katihar / NMC Sasaram = private
        v = r["allotted_cat"]; air = int(float(r["closing_AIR"]))
        if air > col[v][r["institute"]]: col[v][r["institute"]] = air
    return {v: floor_of(c) for v, c in col.items()}

mbbs = build_floors("MBBS")
bds = build_floors("BDS")

def collapse(floors, groups):
    vals = [floors[g] for g in groups if floors.get(g, 0) > 0]
    return int(statistics.median(vals)) if vals else None

def cellvals(floors, groups, pwd, q):
    air25 = None if pwd else collapse(floors, groups)
    if not air25:
        return dict(m25=q, air25="", m26=q, air26="")
    m25, air26, m26 = project(air25)
    return dict(m25=max(m25, q), air25=air25, m26=max(m26, q), air26=air26)

rows_out = []
H = (f"{STATE} | {'category':9} {'B2b':>4} | {'MBBS25 mk/rank':>16} {'MBBS26 mk/rank':>16} | {'BDS25 mk/rank':>16} {'BDS26 mk/rank':>16}")
print(H); print("-"*len(H))
for label, pwd in ROWS:
    q = QUAL_2026[QCAT[label]]
    groups = SUBGROUPS.get(label, [])
    mb = cellvals(mbbs, groups, pwd, q); bd = cellvals(bds, groups, pwd, q)
    rows_out.append({"state": STATE, "category": label, "B2b_qualifying_marks_2026": q,
        "B1a_MBBS_marks_2025": mb["m25"], "B1a_MBBS_AIR_2025": mb["air25"],
        "B1a_MBBS_marks_2026est": mb["m26"], "B1a_MBBS_AIR_2026est": mb["air26"],
        "B1b_BDS_marks_2025": bd["m25"], "B1b_BDS_AIR_2025": bd["air25"],
        "B1b_BDS_marks_2026est": bd["m26"], "B1b_BDS_AIR_2026est": bd["air26"]})
    def f(c): return f"{c['m25']}/{c['air25']}", f"{c['m26']}/{c['air26']}"
    a, b = f(mb); c1, d1 = f(bd)
    print(f"{STATE[:3]} | {label:9} {q:>4} | {a:>16} {b:>16} | {c1:>16} {d1:>16}")

print("\nOBC = median(BC, EBC):", {g: mbbs.get(g, 0) for g in ["BC", "EBC"]}, "->", collapse(mbbs, ["BC", "EBC"]))
print(f"#govt MBBS colleges: {len(set(r['institute'] for r in csv.DictReader(open(THEIR)) if r['program']=='MBBS'))}")

outp = OUT / "br_matrix_final.csv"
with open(outp, "w", newline="") as fh:
    cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nBR: THEIRS (parser audited=clean, hard-coded govt list) AIR-native | OBC=median(BC,EBC) | median-of-5 | wrote {outp}")
