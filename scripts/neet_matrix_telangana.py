#!/usr/bin/env python3
"""
Telangana state min-marks matrix. Same L1->L5 machinery as AIQ/MH.

Decisions (docs/NEET_2026_MATRIX_DECISIONS.md, "STATE SLICE — TELANGANA"):
- TG State Quota govt seats. Source: our `telangana_2025_cutoffs` (rank_space=NEET AIR, verified
  AIR-native: Gandhi OPEN 11444/14005, Osmania 15611 == their Dropbox TG cell-by-cell + web).
- TG fragments categories: SC->SC1/SC2/SC3, OBC->BCA/BCB/BCC/BCD/BCE. Collapse rule (per Surya):
  spread large -> MEDIAN of sub-floors (ignores sparse-pool outliers); spread small -> also median
  for consistency. SC spread 4.7x (SC1=1.2M outlier) -> median. OBC spread 1.8x -> median.
- BDS: our TG parse is MBBS-only. PULL govt BDS from THEIR pipeline (TG_closing_ranks... 18 rows,
  GDC&H Hyderabad, AIR-space). take-best-of-both.
- Subpools excluded from base floor: PHO(pwd)/CAP(defence)/MSM,MRC(minority)/EMR/EMD.
- Seat growth: TG govt MBBS intake ~flat 2025->2026 (new colleges already counted) -> use +0.8%
  placeholder like MH (no evidence of large expansion; conservative). SEAT_GROWTH=1.008.
- B2b qualifying = NATIONAL NTA floor (same for every state — it's the qualify-to-be-ranked bar,
  not a state cutoff). PwD rows = qualifying-gated.
"""
import csv, json, re, statistics
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"

STATE = "Telangana"
SOURCE = "telangana_2025_cutoffs"
THEIR_TG = REPO / "amogh-csv/medical-state-counselling/extracted_data/TG_closing_ranks_state_govt_2025.csv"
SEAT_GROWTH = 1.008
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
ROWS = [("Gen", "OPEN", False), ("Gen-EWS", "EWS", False), ("OBC", "OBC", False),
        ("SC", "SC", False), ("ST", "ST", False),
        ("PwD-Gen", "OPEN", True), ("PwD-EWS", "EWS", True), ("PwD-OBC", "OBC", True),
        ("PwD-SC", "SC", True), ("PwD-ST", "ST", True)]
# how each matrix base maps to TG sub-groups (median collapse over these)
SUBGROUPS = {"OPEN": ["OPEN"], "EWS": ["EWS"], "OBC": ["BCA", "BCB", "BCC", "BCD", "BCE"],
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

# ---- govt filter (TG) ----
def norm(s): return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", str(s).lower())).strip()
def is_govt_tg(i):
    n = norm(i)
    return bool(re.search(r"govt medical|government medical|osmania|gandhi medical|kakatiya|\besi\b", n))
SUBPOOL = re.compile(r"PHO|CAP|MSM|MRC|EMR|EMD")   # excluded from base floor
def base_cat(c): return re.sub(r"\s*\(.*\)\s*$", "", c).strip()

LAST_N = 5   # floor = median of the loosest-N colleges (agreed w/ Amogh/Priyanka: robust to one
             # lone mop-up seat at the remotest college, without over-qualifying students)
def floor_of(per_college):
    """per_college: {institute: loosest closing AIR}. Return median-AIR of the LAST_N deepest
    colleges (fewer if <N exist). One remote mop-up seat no longer defines the floor."""
    deep = sorted(per_college.values(), reverse=True)[:LAST_N]
    if not deep: return None
    return int(statistics.median(deep))

# ---- OUR MBBS: loosest-per-college, then median-of-last-5 per TG sub-group ----
d = json.load(open(REPO/"public/data/NEETUG/NEETUG.json"))
tg = [r for r in d if r["Source"] == SOURCE and r["Academic Program Name"] == "MBBS"]
_mbbs_col = defaultdict(lambda: defaultdict(int))     # sub-group -> {college: loosest AIR}
for r in tg:
    if not is_govt_tg(r["Institute"]): continue
    c = r["Category"]
    if SUBPOOL.search(c): continue
    b = base_cat(c); cr = int(r["Closing Rank"])
    if cr > _mbbs_col[b][r["Institute"]]: _mbbs_col[b][r["Institute"]] = cr
mbbs_sub = {b: (floor_of(cols),) for b, cols in _mbbs_col.items()}   # (floor_air,)

# ---- THEIR BDS: loosest-per-college, then median-of-last-5 per TG sub-group ----
their = list(csv.DictReader(open(THEIR_TG)))
_bds_col = defaultdict(lambda: defaultdict(int))
for r in their:
    if r["program"] != "BDS": continue
    if r["seat_subpool"] not in ("", None): continue    # exclude CAP etc
    b = r["seat_type"]; cr = int(r["closing_rank"])
    if cr > _bds_col[b][r["college"]]: _bds_col[b][r["college"]] = cr
bds_sub = {b: (floor_of(cols),) for b, cols in _bds_col.items()}

def collapse(sub_floor, base):
    """Median of the loosest sub-group closings mapped to this matrix base."""
    vals = [sub_floor[g][0] for g in SUBGROUPS[base] if sub_floor.get(g, (0,))[0] > 0]
    if not vals: return None
    return int(statistics.median(vals)), (min(vals), max(vals), len(vals))

def cellvals(sub_floor, base, pwd, q):
    if pwd:
        return dict(m25=q, air25="", m26=q, air26="")   # PwD = qualifying (deep subpool)
    col = collapse(sub_floor, base)
    if col is None:
        return dict(m25=q, air25="", m26=q, air26="")
    air25, spread = col
    m25, air26, m26 = project(air25)
    return dict(m25=max(m25, q), air25=air25, m26=max(m26, q), air26=air26, spread=spread)

rows_out = []
H = (f"{STATE} | {'category':9} {'B2b':>4} | {'MBBS25 mk/rank':>16} {'MBBS26 mk/rank':>16} | {'BDS25 mk/rank':>16} {'BDS26 mk/rank':>16}")
print(H); print("-"*len(H))
for label, base, pwd in ROWS:
    q = QUAL_2026[QCAT[label]]
    mb = cellvals(mbbs_sub, base, pwd, q); bd = cellvals(bds_sub, base, pwd, q)
    rows_out.append({"state": STATE, "category": label, "B2b_qualifying_marks_2026": q,
        "B1a_MBBS_marks_2025": mb["m25"], "B1a_MBBS_AIR_2025": mb["air25"],
        "B1a_MBBS_marks_2026est": mb["m26"], "B1a_MBBS_AIR_2026est": mb["air26"],
        "B1b_BDS_marks_2025": bd["m25"], "B1b_BDS_AIR_2025": bd["air25"],
        "B1b_BDS_marks_2026est": bd["m26"], "B1b_BDS_AIR_2026est": bd["air26"]})
    def f(c): return f"{c['m25']}/{c['air25']}", f"{c['m26']}/{c['air26']}"
    a, b = f(mb); c1, d1 = f(bd)
    print(f"{STATE[:3]} | {label:9} {q:>4} | {a:>16} {b:>16} | {c1:>16} {d1:>16}")

# spread diagnostics
print("\nsub-group spreads (median collapse):")
for base in ("OPEN", "EWS", "OBC", "SC", "ST"):
    cm = collapse(mbbs_sub, base)
    if cm: print(f"  MBBS {base:5}: sub-floors {[ (g, mbbs_sub[g][0]) for g in SUBGROUPS[base] if mbbs_sub.get(g,(0,))[0]>0 ]} -> median {cm[0]}")

outp = OUT / "telangana_matrix_final.csv"
with open(outp, "w", newline="") as fh:
    cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nTG AIR-native | SC/OBC=median of sub-groups | MBBS=ours, BDS=theirs | PwD=qual | wrote {outp}")
