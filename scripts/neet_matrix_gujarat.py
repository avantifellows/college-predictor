#!/usr/bin/env python3
"""
Gujarat state min-marks matrix. Same L1->L5 machinery as AIQ/MH/TG/KA.

Decisions (docs/NEET_2026_MATRIX_DECISIONS.md, "STATE SLICE — GUJARAT"):
- SOURCE = OURS (`gujarat_2025_cutoffs`, R3, State Quota). Investigated the earlier "problematic"
  worry: it was MY error (I mistook their GJ seat-COUNT file for closing ranks, and their merit
  list is too sparse at the top to contradict us). Our data IS clean AIR-native: B.J. Medical OPEN
  = AIR 4,016 (looser than the AIQ 889 per web -> correct, state quota is gentler). rank_space=NEET AIR.
- GOVT FILTER = name-based, matching THEIR `mgmt` classification (Govt + Govt-Society GMERS +
  Municipal = 21 true-govt colleges; excludes 'Private (govt-quota)' like Parul/Zydus/GCS and the
  trust-run Narendra Modi Medical College). GMERS ARE government (state-society, subsidized) -> IN.
- CATEGORIES: GJ scheme = OPEN, EW(=EWS), SE(=SEBC, Gujarat's OBC), SC, ST. Gen<-OPEN, Gen-EWS<-EW,
  OBC<-SE (SE IS Gujarat's OBC, a single bucket -- per Surya, use it directly; NOT deferred like MH's
  extra SEBC). SC<-SC, ST<-ST. PwD = qualifying.
- FLOOR = median of loosest-5 true-govt colleges (unified rule). SEAT_GROWTH=1.008.
"""
import csv, json, re, statistics
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"

STATE = "Gujarat"
SOURCE = "gujarat_2025_cutoffs"
SEAT_GROWTH = 1.008
LAST_N = 5
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
# matrix row -> GJ category code. SE = Gujarat's OBC (SEBC), used directly.
CODE_FOR = {"Gen": "OPEN", "Gen-EWS": "EW", "OBC": "SE", "SC": "SC", "ST": "ST"}
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

# ---- govt filter (name-based, matches their mgmt=Govt/Govt-Society set). Program-aware:
#      MBBS govt = GMC/GMERS/ESIC/Municipal/etc; BDS govt = "Government Dental College". ----
def is_govt_gj(inst, prog):
    il = inst.lower()
    if "narendra modi" in il: return False   # trust-run (their mgmt != Govt)
    if prog == "BDS":
        return "government dental" in il
    return any(x in il for x in [
        "government medical", "gmers", "b. j medical", "b.j medical", "esic",
        "pandit deendayal", "m.p.shah", "shah government",
        "municipal institute", "nhl municipal", "municipal medical"])

# ---- floor: loosest-per-college -> median of loosest-5 ----
def floor_of(per_college):
    deep = sorted(per_college.values(), reverse=True)[:LAST_N]
    return int(statistics.median(deep)) if deep else 0

def build_floors(prog):
    d = json.load(open(REPO/"public/data/NEETUG/NEETUG.json"))
    col = defaultdict(lambda: defaultdict(int))       # code -> {college: loosest AIR}
    for r in d:
        if r["Source"] != SOURCE or r["Academic Program Name"] != prog: continue
        if r["Seat Type"] != "State Quota" or not is_govt_gj(r["Institute"], prog): continue
        cr = int(r["Closing Rank"]); c = r["Category"]
        if cr > col[c][r["Institute"]]: col[c][r["Institute"]] = cr
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

# diagnostic: which govt colleges set each MBBS floor
print("\ngovt colleges used (MBBS OPEN loosest-5):")
d = json.load(open(REPO/"public/data/NEETUG/NEETUG.json"))
per = defaultdict(int)
for r in d:
    if r["Source"]==SOURCE and r["Academic Program Name"]=="MBBS" and r["Seat Type"]=="State Quota" and is_govt_gj(r["Institute"], "MBBS") and r["Category"]=="OPEN":
        per[r["Institute"]] = max(per[r["Institute"]], int(r["Closing Rank"]))
for i, a in sorted(per.items(), key=lambda x:-x[1])[:5]:
    print(f"  {a:>7}  {i[:44]}")

outp = OUT / "gujarat_matrix_final.csv"
with open(outp, "w", newline="") as fh:
    cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nGJ: ours(AIR-native R3) + name govt-filter(incl GMERS) | OBC<-SE | median-of-5 | wrote {outp}")
