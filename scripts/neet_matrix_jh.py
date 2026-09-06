#!/usr/bin/env python3
"""
Jharkhand state min-marks matrix. Same L1->L5 machinery.

Decisions (docs/NEET_2026_MATRIX_DECISIONS.md, "STATE SLICE — JHARKHAND"):
- SOURCE = **THE SOURCE PDFs, re-parsed here** (`source/JH/JH_R1_2025.pdf`, `JH_R3_2025.pdf`).
  NOT their extracted CSV, and NOT their parser's column mapping.
- **⚠ PARSER BUG (found by reading the actual PDF header) — OFF-BY-ONE QUOTA COLUMN.**
  True PDF columns: [12]='NEET Score', [13]='CML Rank', [18]=CollegeName, [19]=Course,
  **[20]='Preference No'**, **[21]='Seat Opted Category/Quota'**.
  `state_JH.py` reads `allotted_quota` from **r[20]** = *Preference No* → its "quotas" were
  preference numbers 1-10 (its docstring mis-explains them as "college-specific affiliated-school
  reservations"). Only a minority of rows survived its `MAIN_QUOTAS` filter (32 closing rows), and
  category floors came out nonsensical (GENERAL floor 248 marks, BELOW SC 419 — impossible).
  Its docstring schema also omits the NEET Score column entirely.
- **ALSO: the PDF tables drift on some pages** (college name / quota land in shifted cells), so a
  fixed index is unsafe. We identify the quota by VALUE PATTERN (UR|ST|SC|BC-I|BC-II|EWS[--PH/Blind/
  Deaf]) and the college/course by value match. Robust across both rounds.
- **MARKS-NATIVE:** the PDF carries 'NEET Score' per candidate → use closing marks directly, no
  state-rank(CML)->AIR conversion needed (same clean route as Tamil Nadu). 2026 = 2025 + shift.
- GOVT: 6 govt MBBS (RIMS Ranchi, MGM Jamshedpur, SNMMC Dhanbad, SBMCH Hazaribagh, PJMC Dumka,
  Medinirai Palamu) + RIMS Dental. Round = R1+R3 union.
- CATEGORIES: UR->Gen, EWS->Gen-EWS, OBC = MEDIAN{BC-I, BC-II}, SC->SC, ST->ST.
  `--PH/--Blind/--Deaf` horizontal sub-pools excluded from base floors; PwD row = qualifying.
- FLOOR = median of the loosest-5 colleges (in MARKS space: loosest = LOWEST closing marks).
"""
import csv, json, re, statistics
from collections import defaultdict
from pathlib import Path

import pdfplumber

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"
SRC = REPO / "amogh-csv/medical-state-counselling/source/JH"

STATE = "Jharkhand"
LAST_N = 5
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
SUBGROUPS = {"Gen": ["UR"], "Gen-EWS": ["EWS"], "OBC": ["BC-I", "BC-II"], "SC": ["SC"], "ST": ["ST"]}
ROWS = [("Gen", False), ("Gen-EWS", False), ("OBC", False), ("SC", False), ("ST", False),
        ("PwD-Gen", True), ("PwD-EWS", True), ("PwD-OBC", True), ("PwD-SC", True), ("PwD-ST", True)]

QUOTA_RE = re.compile(r"^(UR|ST|SC|BC-I|BC-II|EWS)(--(PH|Blind|Deaf|LV|OH))?$")
COURSES = {"M.B.B.S.": "MBBS", "B.D.S.": "BDS"}

def canon_college(n):
    u = (n or "").upper()
    if "RAJENDRA INSTITUTE" in u and "DENTAL" in u: return "RIMS Dental Institute, Ranchi"
    if "DENTAL INSTITUTE, RAJENDRA" in u:           return "RIMS Dental Institute, Ranchi"
    if "RAJENDRA INSTITUTE" in u:                   return "RIMS, Ranchi"
    if "M.G.M" in u or "MAHATMA GANDHI MEMORIAL" in u: return "MGM Medical College, Jamshedpur"
    if "SHAHEED NIRMAL MAHTO" in u:                 return "Shaheed Nirmal Mahto MC, Dhanbad"
    if "SHEIKH BHIKHARI" in u:                      return "Sheikh Bhikhari MC, Hazaribagh"
    if "PHULO JHANO" in u or "DUMKA MEDICAL" in u:  return "Phulo Jhano MC, Dumka"
    if "MEDINIRAI" in u or "PALAMU MEDICAL" in u:   return "Medinirai MC, Palamu"
    return None

def parse_rows():
    """Robust parse of both round PDFs: identify quota/college/course by VALUE, not fixed index."""
    out = []
    for fname in ("JH_R1_2025.pdf", "JH_R3_2025.pdf"):
        with pdfplumber.open(SRC / fname) as pdf:
            for page in pdf.pages:
                for table in page.extract_tables() or []:
                    for r in table:
                        if not r or len(r) < 20: continue
                        if not str(r[0] or "").strip().isdigit(): continue
                        cells = [" ".join(str(c or "").split()) for c in r]
                        quota = next((c for c in reversed(cells) if QUOTA_RE.match(c)), None)
                        college = next((canon_college(c) for c in cells if canon_college(c)), None)
                        course = next((COURSES[c] for c in cells if c in COURSES), None)
                        score = cells[12] if len(cells) > 12 and cells[12].isdigit() else None
                        if quota and college and course and score:
                            out.append(dict(quota=quota, college=college, program=course, score=int(score)))
    return out

RAWROWS = parse_rows()

def build_floors(prog):
    """per quota -> {college: LOWEST closing marks}; base quotas only (no --PH/--Blind/--Deaf)."""
    col = defaultdict(lambda: defaultdict(lambda: 10**9))
    for r in RAWROWS:
        if r["program"] != prog or "--" in r["quota"]: continue
        if r["score"] < col[r["quota"]][r["college"]]:
            col[r["quota"]][r["college"]] = r["score"]
    floors = {}
    for q, per in col.items():
        lowest = sorted(per.values())[:LAST_N]      # marks-space: loosest = lowest marks
        floors[q] = round(statistics.median(lowest)) if lowest else None
    return floors

shift = json.load(open(OUT / "shift_2026.json")); k, Mref = shift["k"], shift["Mref"]
def difficulty_shift(m): return k * max(0.0, Mref - m)

mbbs = build_floors("MBBS")
bds = build_floors("BDS")

def collapse(floors, groups):
    vals = [floors[g] for g in groups if floors.get(g)]
    return round(statistics.median(vals)) if vals else None

def cellvals(floors, groups, pwd, q):
    if pwd or not groups: return dict(m25=q, m26=q)
    m25 = collapse(floors, groups)
    if not m25: return dict(m25=q, m26=q)
    return dict(m25=max(m25, q), m26=max(round(m25 + difficulty_shift(m25)), q))

rows_out = []
H = (f"{STATE} | {'category':9} {'B2b':>4} | {'MBBS25 marks':>12} {'MBBS26 marks':>12} | {'BDS25 marks':>12} {'BDS26 marks':>12}")
print(H); print("-"*len(H))
for label, pwd in ROWS:
    q = QUAL_2026[QCAT[label]]
    groups = SUBGROUPS.get(label, [])
    mb = cellvals(mbbs, groups, pwd, q); bd = cellvals(bds, groups, pwd, q)
    rows_out.append({"state": STATE, "category": label, "B2b_qualifying_marks_2026": q,
        "B1a_MBBS_marks_2025": mb["m25"], "B1a_MBBS_AIR_2025": "",
        "B1a_MBBS_marks_2026est": mb["m26"], "B1a_MBBS_AIR_2026est": "",
        "B1b_BDS_marks_2025": bd["m25"], "B1b_BDS_AIR_2025": "",
        "B1b_BDS_marks_2026est": bd["m26"], "B1b_BDS_AIR_2026est": ""})
    print(f"{STATE[:3]} | {label:9} {q:>4} | {mb['m25']:>12} {mb['m26']:>12} | {bd['m25']:>12} {bd['m26']:>12}")

print(f"\nparsed {len(RAWROWS)} usable rows from the PDFs (quota by value-pattern, not r[20])")
print("MBBS quota floors (marks):", {q: mbbs.get(q) for q in ['UR','EWS','BC-I','BC-II','SC','ST']})
print("BDS  quota floors (marks):", {q: bds.get(q) for q in ['UR','EWS','BC-I','BC-II','SC','ST']})

outp = OUT / "jh_matrix_final.csv"
with open(outp, "w", newline="") as fh:
    cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nJH: re-parsed SOURCE PDFs (fixes their r[20] quota off-by-one) | MARKS-native | OBC=med(BC-I,BC-II) | median-of-5 | wrote {outp}")
