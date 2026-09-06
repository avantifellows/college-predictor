#!/usr/bin/env python3
"""
West Bengal state min-marks matrix. Same L1->L5 machinery.

Decisions (docs/NEET_2026_MATRIX_DECISIONS.md, "STATE SLICE — WEST BENGAL"):
- SOURCE = OURS (`westbengal_2025_cutoffs`, Round 1, AIR-native). Reconciled vs theirs (govt medical,
  exact-ish name): Medical College Kolkata ours 15,419 vs theirs 16,403; Nilratan 9,842 vs 10,597;
  Bankura/Burdwan/Midnapore ~1.08-1.10x. Consistent (ours R1 vs their R2, ours slightly tighter).
- GOVT FILTER = their state_govt college set (authoritative, govt-only) + JMN & Jakir Hosain (two
  newer govt medical colleges present in our data but missing from their closing summary; verified
  govt). Excludes private (IQ City, ICARE, JIS, KPC, Jagannath Gupta, Gouri Devi, East West,
  Santiniketan, Krishnanagar) and private dental. Implemented as an explicit GOVT name-substring set.
- CATEGORIES: UR->Gen, EWS->Gen-EWS, SC->SC, ST->ST. OBC split OBC-A / OBC-B (both Non-Creamy Layer)
  -> OBC = MEDIAN of the two. PwD variants excluded from base; PwD row = qualifying.
- FLOOR = median of loosest-5 govt colleges. SEAT_GROWTH=1.008. R1 -> runs strict (like AIQ/MP).
"""
import csv, json, re, statistics
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"

STATE = "West Bengal"
SOURCE = "westbengal_2025_cutoffs"
SEAT_GROWTH = 1.008
LAST_N = 5
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
# WB category strings in our data
CAT = {"Gen": ["UR"], "Gen-EWS": ["EWS"], "SC": ["SC"], "ST": ["ST"],
       "OBC": ["OBC-A (Non- Creamy Layer)", "OBC-B (Non- Creamy Layer)", "OBC (Non-Creamy Layer)"]}
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

# ---- govt filter: explicit govt name-substrings (their 25-set + JMN/Jakir Hosain); NOT the privates ----
GOVT_SUB = ["bankura sammilani", "barasat government", "burdwan medical", "burdwan dental",
            "calcutta national", "college of medicine and jnm", "college of medicine and sagore",
            "deben mahata", "diamond harbour", "dr. r. ahmed dental", "esi pgi", "esic medical",
            "institute of pg medical", "jalpaiguri government", "jhargram government",
            "maharaja jitendra narayan", "malda medical", "medical college, kolkata",
            "midnapore medical", "murshidabad medical", "nilratan sircar", "north bengal medical",
            "north bengal dental", "prafulla chandra sen", "r.g. kar", "raiganj govt",
            "rampurhat govt", "sarat chandra chattopadhyay", "tamralipto government",
            "jmn medical", "jakir hosain"]
def is_govt_wb(inst):
    il = inst.lower()
    return any(x in il for x in GOVT_SUB)

# ---- floor: loosest-per-college -> median of loosest-5 ----
def floor_of(per_college):
    deep = sorted(per_college.values(), reverse=True)[:LAST_N]
    return int(statistics.median(deep)) if deep else 0

def build_floors(prog):
    d = json.load(open(REPO/"public/data/NEETUG/NEETUG.json"))
    col = defaultdict(lambda: defaultdict(int))   # category string -> {college: loosest AIR}
    for r in d:
        if r["Source"] != SOURCE or r["Academic Program Name"] != prog: continue
        if r["Seat Type"] != "State Quota" or not is_govt_wb(r["Institute"]): continue
        c = r["Category"]
        if "PwD" in c: continue
        cr = int(r["Closing Rank"])
        if cr > col[c][r["Institute"]]: col[c][r["Institute"]] = cr
    return {c: floor_of(v) for c, v in col.items()}

mbbs = build_floors("MBBS")
bds = build_floors("BDS")

def collapse(floors, cats):
    """median across the category strings (for OBC-A/OBC-B); single for others."""
    vals = [floors[c] for c in cats if floors.get(c, 0) > 0]
    return int(statistics.median(vals)) if vals else None

def cellvals(floors, cats, pwd, q):
    air25 = None if pwd else collapse(floors, cats)
    if not air25:
        return dict(m25=q, air25="", m26=q, air26="")
    m25, air26, m26 = project(air25)
    return dict(m25=max(m25, q), air25=air25, m26=max(m26, q), air26=air26)

rows_out = []
H = (f"{STATE} | {'category':9} {'B2b':>4} | {'MBBS25 mk/rank':>16} {'MBBS26 mk/rank':>16} | {'BDS25 mk/rank':>16} {'BDS26 mk/rank':>16}")
print(H); print("-"*len(H))
for label, pwd in ROWS:
    q = QUAL_2026[QCAT[label]]
    cats = CAT.get(label, [])
    mb = cellvals(mbbs, cats, pwd, q); bd = cellvals(bds, cats, pwd, q)
    rows_out.append({"state": STATE, "category": label, "B2b_qualifying_marks_2026": q,
        "B1a_MBBS_marks_2025": mb["m25"], "B1a_MBBS_AIR_2025": mb["air25"],
        "B1a_MBBS_marks_2026est": mb["m26"], "B1a_MBBS_AIR_2026est": mb["air26"],
        "B1b_BDS_marks_2025": bd["m25"], "B1b_BDS_AIR_2025": bd["air25"],
        "B1b_BDS_marks_2026est": bd["m26"], "B1b_BDS_AIR_2026est": bd["air26"]})
    def f(c): return f"{c['m25']}/{c['air25']}", f"{c['m26']}/{c['air26']}"
    a, b = f(mb); c1, d1 = f(bd)
    print(f"{STATE[:3]} | {label:9} {q:>4} | {a:>16} {b:>16} | {c1:>16} {d1:>16}")

print("\nOBC-A/OBC-B MBBS floors -> median:", {c: mbbs.get(c, 0) for c in CAT["OBC"]}, "->", collapse(mbbs, CAT["OBC"]))

outp = OUT / "wb_matrix_final.csv"
with open(outp, "w", newline="") as fh:
    cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nWB: ours(AIR,R1) + their-govt-set filter | OBC=median(OBC-A,OBC-B) | median-of-5 | wrote {outp}")
