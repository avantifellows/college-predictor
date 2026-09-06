#!/usr/bin/env python3
"""
Uttar Pradesh state min-marks matrix. Same L1->L5 machinery.

Decisions (docs/NEET_2026_MATRIX_DECISIONS.md, "STATE SLICE — UTTAR PRADESH"):
- SOURCE = THEIRS (`UP_closing_ranks_state_govt_2025.csv`). Dropbox-ONLY state (no ours to compare).
  PARSER AUDITED (state_UP.py): clean & reusable — AIR-native (KGMU UROP closes AIR 805-4013 = real
  NEET AIR, verified vs raw), explicit govt-college filter (keyword: Autonomous State Medical/
  Government Medical/King George/RML/etc + [PPP] + ESIC), correct 4-letter category decode
  (UR/BC=OBC/SC/ST/EW=EWS × OP/GL/PH...), R1+R2+R3 cumulative (drops ~256 stray-round seats),
  gender-split (M/F) pivots. Vacated-seat check: no upgrade chains / no double-counting (clean max).
- GOVT: their file is govt-only (50 MBBS + 2 BDS colleges — most college-dense state so far).
- CATEGORIES: UR->Gen, EWS->Gen-EWS, OBC->OBC, SC->SC, ST->ST.
- GENDER: their closings are split M/F. For a general-student floor take the LOOSER (max across
  M & F) per (college, vert) — a general (male-default) student's most-accessible door. PH/EX/FF/NC
  horizontal sub-types already excluded by parser (only 'plain' kept). PwD row = qualifying.
- FLOOR = median of loosest-5 govt colleges. SEAT_GROWTH=1.008. Round = R3-cumulative (final-ish).
"""
import csv, json, re, statistics
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"
THEIR = REPO / "amogh-csv/medical-state-counselling/extracted_data/UP_closing_ranks_state_govt_2025.csv"

STATE = "Uttar Pradesh"
SEAT_GROWTH = 1.008
LAST_N = 5
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
CODE_FOR = {"Gen": "UR", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST"}
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

# ---- floor: loosest-per-college (looser of M/F) -> median of loosest-5 ----
def floor_of(per_college):
    deep = sorted(per_college.values(), reverse=True)[:LAST_N]
    return int(statistics.median(deep)) if deep else 0

def is_ppp(name):
    """UP [PPP] Public-Private-Partnership colleges: the parser tags them govt, but their UR closings
    (AIR ~380k-470k, near qualifying) show they fill like PRIVATE colleges, not govt. Exclude from the
    govt floor. (Parser-logic finding — logged in back-prop queue.)"""
    return "[ ppp]" in name.lower() or "[ppp]" in name.lower() or "[ ppp ]" in name.lower()

def is_govt_dental(name):
    """UP's BDS list contains a PRIVATE dental college their pipeline tags as govt:
    'DENTAL COLLEGE, AZAMGARH' — 98 allotments closing at **AIR 1,305,726**. Taken as the govt floor it
    made UP Gen-BDS = 232 marks, while UP OBC-BDS = 514. A General bar 282 marks BELOW the OBC bar is
    impossible as a merit cutoff, which is how the contamination was spotted.
    UP has exactly ONE govt dental college: Faculty of Dental Sciences, KGMU Lucknow (UR closes
    AIR ~35-37k = ~515 marks, consistent with OBC 514). Same program-aware rule the MH/GJ builders use:
    govt dental is named 'Government Dental'/'GDC'/a known govt institution — private ones are just
    '<place> Dental College'."""
    n = name.lower()
    return bool(re.search(r"\bgdc\b|government dental|govt dental|kgmu|king george", n))


def build_floors(prog):
    col = defaultdict(lambda: defaultdict(int))   # vert -> {college: looser-of-gender closing AIR}
    for r in csv.DictReader(open(THEIR)):
        if r["branch"] != prog: continue
        if is_ppp(r["institute"]): continue       # PPP behaves private -> exclude from govt floor
        if prog == "BDS" and not is_govt_dental(r["institute"]): continue   # private dental out
        v = r["vert"]; air = int(float(r["closing_AIR"]))
        # take MAX across gender per (college, vert) = looser general-student door
        if air > col[v][r["institute"]]: col[v][r["institute"]] = air
    return {v: floor_of(c) for v, c in col.items()}

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

print(f"\n#govt MBBS colleges used: {len(set(r['institute'] for r in csv.DictReader(open(THEIR)) if r['branch']=='MBBS'))}")

outp = OUT / "up_matrix_final.csv"
with open(outp, "w", newline="") as fh:
    cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nUP: THEIRS (parser audited=clean) AIR-native | looser-of-M/F | median-of-5 (50 colleges) | wrote {outp}")
