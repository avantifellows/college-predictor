#!/usr/bin/env python3
"""
State min-marks matrix (starting Maharashtra). Same method as AIQ (neet_matrix_build.py)
but on STATE-QUOTA govt seats, per this state's own categories.

Decisions (docs/NEET_2026_MATRIX_DECISIONS.md):
- Maharashtra: OBC = MH's literal 'OBC' bucket only (per Amogh; ignore SEBC/NT/VJA for now).
  Gen<-OPEN, EWS<-EWS, SC<-SC, ST<-ST. PwD rows = qualifying-gated (as AIQ).
- Scope: State Quota, GOVT colleges only (private/Institute-Quota kept in data, excluded here).
- Floor = loosest (max) closing AIR across the base category's general sub-pools
  (plain / Home-Univ / Female), EXCLUDING PwD/Orphan/EarMark (they're separate deep pools).
  Loosest usually = Home-University seat = the domicile-protected door (Ananya).
- MH is AIR-native (verified vs web + their pipeline) -> reuse national marks<->AIR curve.
- Seat growth: MH govt MBBS intake +0.8% (6025->6075) -> negligible rank drift (NOT the AIQ 5.3%).
"""
import csv, json, re, statistics
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"

STATE = "Maharashtra"
SOURCE = "maharashtra_2025_r3_cutoffs"
SEAT_GROWTH = 1.008           # MH govt MBBS intake 6025->6075
# MH category -> matrix row (literal, per Amogh). PwD handled via qualifying floor.
BASE_FOR = {"Gen": "OPEN", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST"}
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
ROWS = [("Gen", "OPEN", False), ("Gen-EWS", "EWS", False), ("OBC", "OBC", False),
        ("SC", "SC", False), ("ST", "ST", False),
        ("PwD-Gen", "OPEN", True), ("PwD-EWS", "EWS", True), ("PwD-OBC", "OBC", True),
        ("PwD-SC", "SC", True), ("PwD-ST", "ST", True)]

# ---- 2025 curve + difficulty shift (shared with AIQ build) ----
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
        mid=(lo+hi)/2
        if air2025(mid) > air: lo=mid
        else: hi=mid
    return (lo+hi)/2
shift = json.load(open(OUT / "shift_2026.json")); k, Mref = shift["k"], shift["Mref"]
def difficulty_shift(m): return k * max(0.0, Mref - m)
def project(air25):
    m25 = marks2025_at_air(air25); air26 = air25*SEAT_GROWTH
    return round(m25), round(air26), round(marks2025_at_air(air26) + difficulty_shift(marks2025_at_air(air26)))

# ---- govt filter ----
def norm(s): return re.sub(r"\s+"," ",re.sub(r"[^a-z0-9]+"," ",str(s).lower())).strip()
govtset = set(norm(r["institute"]) for r in csv.DictReader(open(REPO/"amogh-csv/medical-national-ranks/extracted_data/govt_medical_closing_ranks_r1_2025_pivot.csv")))
def is_govt(inst, prog):
    """Program-aware govt filter. MBBS: GMC/Government/Grant/etc. BDS: govt dental =
    'GDC'/'Government Dental' (private dental colleges are named '<X> DC', excluded)."""
    n = norm(inst)
    if n in govtset:
        return True
    if prog == "BDS":
        return bool(re.search(r"\bgdc\b|government dental|govt dental", n))
    # MBBS
    return bool(re.search(r"\bgmc\b|\bgovernment\b|\bgovt\b|grant|gsmc|\bbjmc\b|medical college", n)) and "dental" not in n

# ---- MH state-quota govt floors, base category (excl PwD/Orphan/EarMark) ----
# FLOOR RULE (unified w/ Telangana, 2026-07-24): loosest-per-college -> MEDIAN of the loosest-5
# colleges. Robust to one lone deep mop-up seat without over-qualifying. MH clusters are tight so
# this barely moves MH vs the old single-loosest, but kept for cross-state consistency.
LAST_N = 5
def floor_of(per_college):
    deep = sorted(per_college.values(), reverse=True)[:LAST_N]
    return int(statistics.median(deep)) if deep else 0
d = json.load(open(REPO/"public/data/NEETUG/NEETUG.json"))
mh = [r for r in d if r["Source"]==SOURCE and r["Seat Type"]=="State Quota"]
def is_pwd_cat(c): return bool(re.search(r"PwD", c))
def base_ok(c): return not re.search(r"PwD|Orphan|EarMark", c)   # base floor = general sub-pools only
_col = defaultdict(lambda: defaultdict(int))       # (prog,base) -> {college: loosest AIR}   non-pwd
_col_pwd = defaultdict(lambda: defaultdict(int))   # (prog,base) -> {college: loosest AIR}   pwd
for prog in ("MBBS", "BDS"):
    for r in mh:
        if r["Academic Program Name"]!=prog or not is_govt(r["Institute"], prog): continue
        base = re.sub(r"\s*\(.*\)\s*$","",r["Category"])
        cr = int(r["Closing Rank"])
        tgt = _col_pwd if is_pwd_cat(r["Category"]) else (_col if base_ok(r["Category"]) else None)
        if tgt is None: continue
        key=(prog,base)
        if cr>tgt[key][r["Institute"]]: tgt[key][r["Institute"]]=cr
floor = {k: (floor_of(v),) for k,v in _col.items()}          # (prog,base) -> (floor AIR,)
floor_pwd = {k: (floor_of(v),) for k,v in _col_pwd.items()}   # PwD reported = median-of-5 deep pool

# ---- build matrix ----
def cellvals(prog, base, pwd, q):
    if pwd:
        src = floor_pwd.get((prog, base))
        air25 = src[0] if src else ""
        return dict(m25=q, air25=air25, m26=q, air26=(round(air25*SEAT_GROWTH) if air25 else ""))
    src = floor.get((prog, base))
    if not src or src[0]==0:
        return dict(m25=q, air25="", m26=q, air26="")
    m25, air26, m26 = project(src[0])
    return dict(m25=max(m25,q), air25=src[0], m26=max(m26,q), air26=air26)

rows_out=[]
H=(f"{STATE} | {'category':9} {'B2b':>4} | {'MBBS25 mk/rank':>16} {'MBBS26 mk/rank':>16} | {'BDS25 mk/rank':>16} {'BDS26 mk/rank':>16}")
print(H); print("-"*len(H))
for label, base, pwd in ROWS:
    q = QUAL_2026[QCAT[label]]
    mb = cellvals("MBBS", base, pwd, q); bd = cellvals("BDS", base, pwd, q)
    rows_out.append({"state":STATE,"category":label,"B2b_qualifying_marks_2026":q,
        "B1a_MBBS_marks_2025":mb["m25"],"B1a_MBBS_AIR_2025":mb["air25"],
        "B1a_MBBS_marks_2026est":mb["m26"],"B1a_MBBS_AIR_2026est":mb["air26"],
        "B1b_BDS_marks_2025":bd["m25"],"B1b_BDS_AIR_2025":bd["air25"],
        "B1b_BDS_marks_2026est":bd["m26"],"B1b_BDS_AIR_2026est":bd["air26"]})
    def f(c): return f"{c['m25']}/{c['air25']}", f"{c['m26']}/{c['air26']}"
    a,b=f(mb); c1,d1=f(bd)
    print(f"{STATE[:3]} | {label:9} {q:>4} | {a:>16} {b:>16} | {c1:>16} {d1:>16}")

outp = OUT/"maharashtra_matrix_final.csv"
with open(outp,"w",newline="") as fh:
    cols=["state","category","B2b_qualifying_marks_2026","B1a_MBBS_marks_2025","B1a_MBBS_AIR_2025",
          "B1a_MBBS_marks_2026est","B1a_MBBS_AIR_2026est","B1b_BDS_marks_2025","B1b_BDS_AIR_2025",
          "B1b_BDS_marks_2026est","B1b_BDS_AIR_2026est"]
    w=csv.DictWriter(fh,fieldnames=cols,extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nMH seat growth {SEAT_GROWTH} | OBC=literal MH OBC | State-Quota govt | PwD=qual | wrote {outp}")
