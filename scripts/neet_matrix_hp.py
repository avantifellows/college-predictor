#!/usr/bin/env python3
"""
Himachal Pradesh state min-marks matrix. Same L1->L5 machinery.

Decisions (docs/NEET_2026_MATRIX_DECISIONS.md, "STATE SLICE — HIMACHAL PRADESH"):
- SOURCE = THEIRS (`HP_closing_ranks_state_govt_2025.csv`). Our `himachal_2025_r3_cutoffs` is TOO
  THIN (34 rows; parsed ONLY the General category for MBBS — OBC/SC/ST/EWS all absent). Theirs has
  6 govt colleges × full category set. VERIFIED they agree: their General MBBS closings == ours to
  the DIGIT (32531/38539/49648/61611/72199/82997). AIR-native (`closing_neet_air`). Same "theirs
  wins" situation as Karnataka.
- GOVT FILTER: their file is govt-only (6 MBBS colleges: IGMC Shimla, Tanda, Nerchowk, Hamirpur,
  Nahan, Chamba; 1 BDS: HP Govt Dental Shimla).
- CATEGORIES: General->Gen, OBC->OBC, SC->SC, ST->ST. NO EWS in HP state counselling (absent from
  both pipelines' MBBS) -> Gen-EWS = qualifying (honest gap). Special pools (Backward Area / Tibetan
  Refugees / Defence / Single Girl / J&K) excluded. PwD = qualifying.
- CAVEAT: only 6 govt MBBS colleges (median-of-5 ~= all); 1 govt BDS college (BDS floor = that single
  college's closing per category — not a distribution). Small-state, low-robustness but complete.
- FLOOR = median of loosest-5 govt colleges. SEAT_GROWTH=1.008. R3 (final).
"""
import csv, json, statistics
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"
THEIR = REPO / "amogh-csv/medical-state-counselling/extracted_data/HP_closing_ranks_state_govt_2025.csv"

STATE = "Himachal Pradesh"
SEAT_GROWTH = 1.008
LAST_N = 5
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
# matrix row -> their cat_base. EWS None (not in HP counselling).
CODE_FOR = {"Gen": "General", "Gen-EWS": None, "OBC": "OBC", "SC": "SC", "ST": "ST"}
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

def build_floors(prog):
    col = defaultdict(lambda: defaultdict(int))
    for r in csv.DictReader(open(THEIR)):
        if r["program"] != prog: continue
        c = r["cat_base"]
        if c not in ("General", "OBC", "SC", "ST"): continue   # base only; skip special pools & blank
        air = int(float(r["closing_neet_air"]))
        if air > col[c][r["college"]]: col[c][r["college"]] = air
    return {c: floor_of(v) for c, v in col.items()}

mbbs = build_floors("MBBS")
bds = build_floors("BDS")

def cellvals(floors, label, pwd, q):
    code = CODE_FOR.get(label)
    air25 = 0 if (pwd or not code) else floors.get(code, 0)
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

print(f"\nMBBS govt colleges: {len(set().union(*[set(defaultdict(int)) for _ in [0]]) if False else set())}", end="")
# college counts
cnt = defaultdict(set)
for r in csv.DictReader(open(THEIR)):
    if r["cat_base"] in ("General","OBC","SC","ST"): cnt[r["program"]].add(r["college"])
print(f"\n#govt colleges: MBBS={len(cnt['MBBS'])}, BDS={len(cnt['BDS'])} (small state)")

outp = OUT / "hp_matrix_final.csv"
with open(outp, "w", newline="") as fh:
    cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nHP: THEIRS (ours too thin) AIR-native | General/OBC/SC/ST, no EWS | median-of-5 (only 6 colleges) | wrote {outp}")
