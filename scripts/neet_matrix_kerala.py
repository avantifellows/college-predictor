#!/usr/bin/env python3
"""
Kerala state min-marks matrix. Same L1->L5 machinery.

Decisions (docs/NEET_2026_MATRIX_DECISIONS.md, "STATE SLICE — KERALA"):
- SOURCE = OURS (`kerala_2025_cutoffs`, State Quota). AIR-native (rank_space=NEET AIR). VERIFIED
  rigorously: their pipeline keeps KERALA STATE RANK (TVM SM=370 per web), ours has AIR; converting
  THEIR state ranks -> AIR via their merit list reproduces OUR AIR EXACTLY for the govt colleges
  (Alappuzha 10045=10045, Ernakulam 10555, Kannur 10536, Kottayam 7207, Manjeri 9914 -- all exact).
  TVM SM AIR 4,840 also lines up with the AIQ AIR 4,913 (web). So ours is correctly AIR-native.
- GOVT FILTER = name-based: "Govt./Government Medical College" (MBBS) / "Govt./Government Dental
  College" (BDS). 17 govt medical + 6 govt dental; private (Amala/MES/SUT/Malabar/Pushpagiri...) out.
- CATEGORIES (Kerala communal scheme, decoded vs their pipeline columns):
  SM(State Merit)->Gen, EW->Gen-EWS, SC->SC, ST->ST.
  OBC = MEDIAN of Kerala's SEBC communities {EZ Ezhava, MU Muslim, BH, LA Latin-Catholic, DV Dheevara,
  VK Viswakarma, BX, KN, KU} (their pipeline's reserved-community columns). Excludes SM-*/FL-* combos
  and special pools (DA/PD/PI/SD/XS/NC/AC/PT etc) from the base floor. PwD=qualifying.
- FLOOR = median of loosest-5 govt colleges (unified rule). SEAT_GROWTH=1.008.
"""
import csv, json, re, statistics
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"

STATE = "Kerala"
SOURCE = "kerala_2025_cutoffs"
SEAT_GROWTH = 1.008
LAST_N = 5
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
ROWS = [("Gen", False), ("Gen-EWS", False), ("OBC", False), ("SC", False), ("ST", False),
        ("PwD-Gen", True), ("PwD-EWS", True), ("PwD-OBC", True), ("PwD-SC", True), ("PwD-ST", True)]
# matrix base -> Kerala category code(s) to median-collapse
SEBC = ["EZ", "MU", "BH", "LA", "DV", "VK", "BX", "KN", "KU"]   # Kerala's OBC communities
SUBGROUPS = {"Gen": ["SM"], "Gen-EWS": ["EW"], "OBC": SEBC, "SC": ["SC"], "ST": ["ST"]}
ALLOWED = set(["SM", "EW", "SC", "ST"] + SEBC)   # base codes we use; everything else (SM-*, FL-*, DA, PD…) ignored

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

# ---- govt filter (program-aware) ----
def is_govt_kl(inst, prog):
    il = inst.lower()
    if prog == "BDS":
        return "govt. dental" in il or "government dental" in il
    return "govt. medical" in il or "government medical" in il or "govt medical" in il

# ---- floor: loosest-per-college -> median of loosest-5 ----
def floor_of(per_college):
    deep = sorted(per_college.values(), reverse=True)[:LAST_N]
    return int(statistics.median(deep)) if deep else 0

def build_floors(prog):
    d = json.load(open(REPO/"public/data/NEETUG/NEETUG.json"))
    col = defaultdict(lambda: defaultdict(int))   # code -> {college: loosest AIR}
    for r in d:
        if r["Source"] != SOURCE or r["Academic Program Name"] != prog: continue
        if not is_govt_kl(r["Institute"], prog): continue
        c = r["Category"]
        if c not in ALLOWED: continue           # only base communal codes; skip SM-*/FL-*/special
        cr = int(r["Closing Rank"])
        if cr > col[c][r["Institute"]]: col[c][r["Institute"]] = cr
    return {c: floor_of(v) for c, v in col.items()}

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
    mb = cellvals(mbbs, groups, pwd, q)
    bd = cellvals(bds, groups, pwd, q)
    rows_out.append({"state": STATE, "category": label, "B2b_qualifying_marks_2026": q,
        "B1a_MBBS_marks_2025": mb["m25"], "B1a_MBBS_AIR_2025": mb["air25"],
        "B1a_MBBS_marks_2026est": mb["m26"], "B1a_MBBS_AIR_2026est": mb["air26"],
        "B1b_BDS_marks_2025": bd["m25"], "B1b_BDS_AIR_2025": bd["air25"],
        "B1b_BDS_marks_2026est": bd["m26"], "B1b_BDS_AIR_2026est": bd["air26"]})
    def f(c): return f"{c['m25']}/{c['air25']}", f"{c['m26']}/{c['air26']}"
    a, b = f(mb); c1, d1 = f(bd)
    print(f"{STATE[:3]} | {label:9} {q:>4} | {a:>16} {b:>16} | {c1:>16} {d1:>16}")

# OBC sub-group diagnostic
print("\nOBC (SEBC communities) MBBS sub-floors -> median:")
print("  " + ", ".join(f"{g}={mbbs.get(g,0)}" for g in SEBC) + f"  -> median {collapse(mbbs, SEBC)}")

outp = OUT / "kerala_matrix_final.csv"
with open(outp, "w", newline="") as fh:
    cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nKL: ours AIR-native (verified vs their state-rank->AIR) | SM=Gen, OBC=median(9 SEBC communities) | median-of-5 | wrote {outp}")
