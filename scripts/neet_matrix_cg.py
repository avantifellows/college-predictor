#!/usr/bin/env python3
"""
Chhattisgarh state min-marks matrix. Same L1->L5 machinery.

Decisions (docs/NEET_2026_MATRIX_DECISIONS.md, "STATE SLICE — CHHATTISGARH"):
- SOURCE = THEIR RAW allotments (`CG_all_allotments_2025.csv`), NOT their extracted closing_ranks
  file. WHY: the extracted `CG_closing_ranks_state_govt_2025.csv` is STALE / out-of-sync with the raw
  (produced by an older parser version; it reports PJNM Raipur UR = 180,626 which is absurd). The RAW
  allotments are clean & current — PJNM UR-NC closes AIR 24,483 (state ranks 1-13), sensible. So we
  recompute closings ourselves from raw. [Lesson: their extracted output can be out of sync with raw
  — always sanity-check extracted vs raw before trusting.]
- AIR-native: raw `neet` col IS NEET AIR (PJNM UR-NC state_rank 1 = AIR 20,174). Not CG state rank.
- GOVT FILTER = their hard-coded 10-college govt set (from state_CG.py GOVT_CG). Post-Bihar we also
  sanity-check vs neetugguidance CG: floors are plausible (top PJNM 24k ≈ AIQ; remote Kanker 86k).
- CATEGORIES: raw `cat` = VERT-SUB (UR-NC/UR-F/OBC-NC/.../ 'Special ST-NC'). Base = -NC & -F (exclude
  PH/EX/FF). UR->Gen, EWS->Gen-EWS, OBC->OBC, SC->SC, ST->ST. 'Special ST' folded into ST (looser of).
  Quota = GQ (govt quota) only. Take looser-of-gender (max across NC/F). PwD row = qualifying.
- FLOOR = median of loosest-5 govt colleges. SEAT_GROWTH=1.008. Round = R1+R2 cumulative (mop-up excl).
"""
import csv, json, statistics
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"
RAW = REPO / "amogh-csv/medical-state-counselling/extracted_data/CG_all_allotments_2025.csv"

STATE = "Chhattisgarh"
SEAT_GROWTH = 1.008
LAST_N = 5
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
# matrix base -> CG vertical(s). NOTE: 'Special ST' is a tiny separate sub-pool (1 seat at AIR 1.3M,
# a PVTG/special-tribe reservation) — do NOT fold into ST (it corrupts the ST floor). ST = plain ST only.
SUBGROUPS = {"Gen": ["UR"], "Gen-EWS": ["EWS", "EW"], "OBC": ["OBC"], "SC": ["SC"], "ST": ["ST"]}
ROWS = [("Gen", False), ("Gen-EWS", False), ("OBC", False), ("SC", False), ("ST", False),
        ("PwD-Gen", True), ("PwD-EWS", True), ("PwD-OBC", True), ("PwD-SC", True), ("PwD-ST", True)]

GOVT_CG = {
    "Bharatratna Late shri Atal Bihari Vajpayee MGMC Rajnandgaon",
    "Chandulal Chandrakar Memorial Government Medical College, Durg",
    "Chhattisgarh Institute of Medical Sciences, Bilaspur",
    "GOVERNMENT MEDICAL COLLEGE, AMBIKAPUR", "GOVERNMENT MEDICAL COLLEGE, KANKER",
    "GOVERNMENT MEDICAL COLLEGE, KORBA", "Government Medical College Mahasamund",
    "LATE BALIRAM KASHYAP SMRITI SH. MEDICAL COLLEGE, JAGDALPUR",
    "LATE SHRI LAKHIRAM AGRAWAL MEMORIAL MEDICAL COLLEGE, RAIGARH",
    "PT.JAWAHAR LAL NEHRU MEMORIAL MEDICAL COLLEGE, RAIPUR",
    "Government Dental College,Raipur",
}
GSET = set(x.strip().upper() for x in GOVT_CG)

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

def floor_of(per_college):
    deep = sorted(per_college.values(), reverse=True)[:LAST_N]
    return int(statistics.median(deep)) if deep else 0

def base_vert(cat):
    """'UR-NC'->('UR','NC'), 'Special ST-NC'->('Special ST','NC')."""
    if "-" not in cat: return cat, ""
    i = cat.rfind("-"); return cat[:i].strip(), cat[i+1:].strip()

def build_floors(prog):
    col = defaultdict(lambda: defaultdict(int))   # vert -> {college: looser-of-gender closing AIR}
    for r in csv.DictReader(open(RAW)):
        if r["course"].upper() not in ("MBBS", "M.B.B.S.") if prog == "MBBS" else r["course"].upper() not in ("BDS", "B.D.S."):
            continue
        if r.get("quota") != "GQ": continue
        if r["inst"].strip().upper() not in GSET: continue
        vert, sub = base_vert(r["cat"])
        if sub not in ("NC", "F"): continue          # base (general/female); exclude PH/EX/FF
        if not str(r.get("neet", "")).strip().isdigit(): continue
        air = int(r["neet"])
        if air > col[vert][r["inst"]]: col[vert][r["inst"]] = air
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

print("\nMBBS floors per vert:", {v: mbbs.get(v, 0) for v in ["UR", "EWS", "OBC", "SC", "ST", "Special ST"]})
print(f"#govt MBBS colleges: {len(set(r['inst'] for r in csv.DictReader(open(RAW)) if r['course'].upper() in ('MBBS','M.B.B.S.') and r.get('quota')=='GQ' and r['inst'].strip().upper() in GSET))}")

outp = OUT / "cg_matrix_final.csv"
with open(outp, "w", newline="") as fh:
    cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nCG: RAW allotments (extracted file was STALE) AIR-native | looser-of-gender | median-of-5 | wrote {outp}")
