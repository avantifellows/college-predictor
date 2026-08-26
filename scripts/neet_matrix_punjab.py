#!/usr/bin/env python3
"""
Punjab state min-marks matrix. Same L1->L5 machinery.

Decisions (docs/NEET_2026_MATRIX_DECISIONS.md, "STATE SLICE — PUNJAB"):
- SOURCE = OURS (`punjab_2025_cutoffs`, Round 2). AIR-native (rank_space=NEET AIR). Reconciled vs
  theirs on the GOVT MEDICAL colleges: GMC Patiala ours 15,289 vs theirs 17,605 (~1.15x = our R2
  vs their round); GMC Amritsar 27,393 vs 37,245. Consistent (ours slightly tighter = R2). [The
  scary "6.5x" gap I first saw was MY substring bug AGAIN — matched Govt DENTAL Patiala (100,547)
  to our medical Open. 3rd time making this exact mistake; must match program+exact name.]
- GOVT FILTER = name-based true-govt (matches their state_govt set): "Government Medical/Dental
  College" + "Ambedkar State Institute" + "ESIC Medical" + "Guru Gobind Singh Medical" (Faridkot).
  Our "Govt. Quota" SEAT TYPE is contaminated (private colleges Gian Sagar/PIMS/Adesh/DMC/RIMT have
  govt-quota SEATS but aren't govt colleges) -> exclude them.
- CATEGORIES: Open->Gen, EWS->Gen-EWS, "Backward Classes"->OBC, "Scheduled Caste"->SC. Punjab has
  NO ST govt seats (negligible ST population) -> ST row = qualifying (honest gap, confirmed both
  pipelines: their vert set = {Open,SC,EWS,BC}, no ST). Horizontal pools (Sports/Border/Backward
  Area/Defence/Riots/Terrorist) excluded. PwD=qualifying.
- CAVEAT: only ~5 true govt MBBS colleges in Punjab -> median-of-5 uses ~all of them (less robust
  than big states, but it's the whole population, so it's the true floor not a sample).
- FLOOR = median of loosest-5 govt colleges. SEAT_GROWTH=1.008.
"""
import csv, json, re, statistics
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"

STATE = "Punjab"
SOURCE = "punjab_2025_cutoffs"
SEAT_GROWTH = 1.008
LAST_N = 5
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
# matrix row -> Punjab category string. ST intentionally None (no govt ST seats).
CODE_FOR = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "Backward Classes", "SC": "Scheduled Caste", "ST": None}
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

# ---- true-govt filter (program-agnostic; name-based) ----
def is_govt_pb(inst):
    il = inst.lower()
    return ("government medical" in il or "government dental" in il or "ambedkar state institute" in il
            or "esic medical" in il or "guru gobind singh medical" in il)

# ---- floor: loosest-per-college -> median of loosest-5 ----
def floor_of(per_college):
    deep = sorted(per_college.values(), reverse=True)[:LAST_N]
    return int(statistics.median(deep)) if deep else 0

def build_floors(prog):
    d = json.load(open(REPO/"public/data/NEETUG/NEETUG.json"))
    col = defaultdict(lambda: defaultdict(int))
    for r in d:
        if r["Source"] != SOURCE or r["Academic Program Name"] != prog: continue
        if not is_govt_pb(r["Institute"]): continue
        if r["Seat Type"] not in ("Govt. Quota", "Open Quota"): continue   # exclude NRI/Mgmt/Minority
        c = r["Category"]
        if cr_ok(c):
            cr = int(r["Closing Rank"])
            if cr > col[c][r["Institute"]]: col[c][r["Institute"]] = cr
    return {c: floor_of(v) for c, v in col.items()}

def cr_ok(c):   # only the 4 base verticals we map; skip horizontal/special pools
    return c in ("Open", "EWS", "Backward Classes", "Scheduled Caste")

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

# diagnostic: govt colleges & their Open floors
print("\ngovt MBBS Open per college:")
d = json.load(open(REPO/"public/data/NEETUG/NEETUG.json"))
per = defaultdict(int)
for r in d:
    if r["Source"]==SOURCE and r["Academic Program Name"]=="MBBS" and is_govt_pb(r["Institute"]) and r["Category"]=="Open" and r["Seat Type"] in ("Govt. Quota","Open Quota"):
        per[r["Institute"]] = max(per[r["Institute"]], int(r["Closing Rank"]))
for i, a in sorted(per.items(), key=lambda x:-x[1]):
    print(f"  {a:>7}  {i[:44]}")

outp = OUT / "punjab_matrix_final.csv"
with open(outp, "w", newline="") as fh:
    cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nPB: ours(AIR,R2) + true-govt name filter | Open/EWS/BC/SC; no ST govt seats | median-of-5 | wrote {outp}")
