#!/usr/bin/env python3
"""
Andhra Pradesh state min-marks matrix. Same L1->L5 machinery; structurally identical to Telangana
(AP and TG shared the pre-2014 scheme: OC/EWS/SC1-3/ST/BCA-E + PH/CAP/NCC/SG/CON modifiers).

Decisions (docs/NEET_2026_MATRIX_DECISIONS.md, "STATE SLICE — ANDHRA PRADESH"):
- SOURCE = OURS (`andhra_2025_r3_cutoffs`, State Quota, MBBS). AIR-native (rank_space=NEET AIR;
  Andhra Medical College OC = AIR 15,377, matches THEIR closing_AIR 15,949 within ~3.6%). Ours is
  FINER than theirs (SC kept as SC1/SC2/SC3; theirs pre-collapses to a single SC) and has 909 rows
  vs their 121 -> use ours as primary, theirs as cross-check.
- GOVT FILTER = name-based (govt = "Government Medical College" + the classic named govt colleges:
  Andhra/Guntur/Kurnool/Rangaraya/Sri Venkateswara/Siddhartha/Sri Padmavathi/ACSR). 18 govt colleges.
  Matches their state_govt college set (their 17-row summary missed Rangaraya, which IS govt -> incl).
- CATEGORIES: OC->Gen, EWS->Gen-EWS, SC(SC1/2/3)->SC via MEDIAN of sub-groups, BC(BCA-E)->OBC via
  MEDIAN of sub-groups, ST->ST. (AP has NO BDS in our data; their file has 10 BDS rows -> pull if
  present, else qualifying.) PH/CAP/NCC/SG/BSG/CON/PMC = excluded sub-pools. PwD=qualifying.
- Ordering EWS slightly looser than OC, ST looser than SC -> matches neetugguidance AP-AIQ pattern
  (UR 528, OBC 528, EWS 525, SC 448, ST 433); NOT forced.
- FLOOR = median of loosest-5 govt colleges (unified rule). SEAT_GROWTH=1.008.
"""
import csv, json, re, statistics
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"
THEIR = REPO / "amogh-csv/medical-state-counselling/extracted_data/AP_closing_ranks_state_govt_2025.csv"

STATE = "Andhra Pradesh"
SOURCE = "andhra_2025_r3_cutoffs"
SEAT_GROWTH = 1.008
LAST_N = 5
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
ROWS = [("Gen", False), ("Gen-EWS", False), ("OBC", False), ("SC", False), ("ST", False),
        ("PwD-Gen", True), ("PwD-EWS", True), ("PwD-OBC", True), ("PwD-SC", True), ("PwD-ST", True)]
# matrix base -> AP sub-group codes to median-collapse
SUBGROUPS = {"Gen": ["OC"], "Gen-EWS": ["EWS"], "OBC": ["BCA", "BCB", "BCC", "BCD", "BCE"],
             "SC": ["SC1", "SC2", "SC3"], "ST": ["ST"]}

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

# ---- govt filter (name-based) ----
GOVT_NAMED = ["government medical", "andhra medical", "guntur medical", "kurnool medical",
              "rangaraya", "sri venkateswara medical", "siddhartha medical", "sri padmavathi", "acsr"]
def is_govt_ap(i):
    il = i.lower()
    return any(x in il for x in GOVT_NAMED)
SUBPOOL = re.compile(r"PH|CAP|NCC|SG|BSG|CON|PMC")
def base_cat(c): return re.sub(r"\s*\(.*\)\s*$", "", c).strip()

# ---- floor: loosest-per-college -> median of loosest-5 ----
def floor_of(per_college):
    deep = sorted(per_college.values(), reverse=True)[:LAST_N]
    return int(statistics.median(deep)) if deep else 0

# OUR MBBS floors per sub-group code
d = json.load(open(REPO/"public/data/NEETUG/NEETUG.json"))
_col = defaultdict(lambda: defaultdict(int))
for r in d:
    if r["Source"] != SOURCE or r["Academic Program Name"] != "MBBS": continue
    if not is_govt_ap(r["Institute"]) or SUBPOOL.search(r["Category"]): continue
    b = base_cat(r["Category"]); cr = int(r["Closing Rank"])
    if cr > _col[b][r["Institute"]]: _col[b][r["Institute"]] = cr
mbbs_sub = {b: floor_of(v) for b, v in _col.items()}

# THEIR BDS floors (our AP is MBBS-only). vert = category, single SC (no split).
_bcol = defaultdict(lambda: defaultdict(int))
for r in csv.DictReader(open(THEIR)):
    if r["course"] != "BDS": continue
    _bcol[r["vert"]][r["college"]] = max(_bcol[r["vert"]][r["college"]], int(float(r["closing_AIR"])))
bds_sub = {b: floor_of(v) for b, v in _bcol.items()}
# their BDS has single 'SC' (not SC1/2/3) and 'OC' etc; remap SUBGROUPS for BDS
BDS_SUB = {"Gen": ["OC"], "Gen-EWS": ["EWS"], "OBC": ["BCA", "BCB", "BCC", "BCD", "BCE"],
           "SC": ["SC"], "ST": ["ST"]}

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
    mb = cellvals(mbbs_sub, SUBGROUPS[label], pwd, q) if label in SUBGROUPS else dict(m25=q, air25="", m26=q, air26="")
    bd = cellvals(bds_sub, BDS_SUB[label], pwd, q) if label in BDS_SUB else dict(m25=q, air25="", m26=q, air26="")
    rows_out.append({"state": STATE, "category": label, "B2b_qualifying_marks_2026": q,
        "B1a_MBBS_marks_2025": mb["m25"], "B1a_MBBS_AIR_2025": mb["air25"],
        "B1a_MBBS_marks_2026est": mb["m26"], "B1a_MBBS_AIR_2026est": mb["air26"],
        "B1b_BDS_marks_2025": bd["m25"], "B1b_BDS_AIR_2025": bd["air25"],
        "B1b_BDS_marks_2026est": bd["m26"], "B1b_BDS_AIR_2026est": bd["air26"]})
    def f(c): return f"{c['m25']}/{c['air25']}", f"{c['m26']}/{c['air26']}"
    a, b = f(mb); c1, d1 = f(bd)
    print(f"{STATE[:3]} | {label:9} {q:>4} | {a:>16} {b:>16} | {c1:>16} {d1:>16}")

outp = OUT / "andhra_matrix_final.csv"
with open(outp, "w", newline="") as fh:
    cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nAP: ours(AIR-native) MBBS + theirs BDS | SC=med(SC1/2/3) OBC=med(BCA-E) | median-of-5 | wrote {outp}")
