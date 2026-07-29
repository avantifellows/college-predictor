#!/usr/bin/env python3
"""
Jammu & Kashmir state (UT) min-marks matrix. Same L1->L5 machinery.

Decisions (docs/NEET_2026_MATRIX_DECISIONS.md, "STATE SLICE — JAMMU & KASHMIR"):
- SOURCE = THEIRS: `JK_closing_ranks_state_govt_2025.csv` (closing_UT_rank per institution×vert)
  + `JK_meritlist_state_rank_air.csv` (5,707 rows: state_rank -> AIR + **score**).
- **MARKS via the MERIT LIST (no curve needed):** J&K publishes a UT merit list carrying BOTH `air`
  and `score` per state_rank, so we map each `closing_UT_rank` -> the marks of that ranked candidate
  directly. Verified: state_rank 1 = AIR 423 / score 622; SKIMS OM closing UT-rank 85 -> AIR 9,058 /
  558 marks (plausible for J&K's top college). Cleanest available route — no rank->AIR modelling.
- GOVT: 11 colleges (9 GMC: Jammu/Srinagar-SKIMS/Anantnag/Baramulla/Doda/Handwara/Kathua/Rajouri/
  Udhampur + GDC-Jammu, GDC-Srinagar dental). Round: their R1/R3 union.
- CATEGORIES (J&K UT scheme): **OM** (Open Merit)->Gen, EWS->Gen-EWS, OBC->OBC, SC->SC, ST->ST.
  EXCLUDED from the base matrix (J&K-specific area/horizontal quotas with no national equivalent):
  **RBA** (Reserved Backward Area), **ALC** (Actual Line of Control), **P&B** (Pahari & Backward).
  Their floors for reference: RBA 462, ALC 429, P&B 528 marks (2025).
- FLOOR = median of the loosest-5 colleges (MARKS space: loosest = LOWEST closing marks).
  2026 = 2025 marks + difficulty_shift (marks-space, as TN/JH).
"""
import csv, json, statistics
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"
DIR = REPO / "amogh-csv/medical-state-counselling/extracted_data"
CLOSING = DIR / "JK_closing_ranks_state_govt_2025.csv"
MERIT = DIR / "JK_meritlist_state_rank_air.csv"

STATE = "Jammu & Kashmir"
LAST_N = 5
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
CODE_FOR = {"Gen": "OM", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST"}
ROWS = [("Gen", False), ("Gen-EWS", False), ("OBC", False), ("SC", False), ("ST", False),
        ("PwD-Gen", True), ("PwD-EWS", True), ("PwD-OBC", True), ("PwD-SC", True), ("PwD-ST", True)]

shift = json.load(open(OUT / "shift_2026.json")); k, Mref = shift["k"], shift["Mref"]
def difficulty_shift(m): return k * max(0.0, Mref - m)

# ---- UT merit list: state_rank -> (air, score) ----
MERITMAP = {}
for r in csv.DictReader(open(MERIT)):
    try: MERITMAP[int(r["state_rank"])] = (int(r["air"]), int(r["score"]))
    except (ValueError, TypeError): pass
_KEYS = sorted(MERITMAP)
def marks_at_ut_rank(sr):
    """Marks of the candidate at this UT rank (nearest rank at or above if exact missing)."""
    if sr in MERITMAP: return MERITMAP[sr][1]
    below = [k for k in _KEYS if k <= sr]
    return MERITMAP[max(below)][1] if below else None

def build_floors(prog):
    """vert -> {college: closing MARKS} using deepest UT rank per college, then median-of-5-lowest."""
    per = defaultdict(dict)
    for r in csv.DictReader(open(CLOSING)):
        if r["discipline"] != prog: continue
        sr = int(r["closing_UT_rank"]); mk = marks_at_ut_rank(sr)
        if mk is None: continue
        inst, v = r["institution"], r["vert"]
        # keep the DEEPEST UT rank per (vert, college) -> its marks
        if inst not in per[v] or sr > per[v][inst][0]:
            per[v][inst] = (sr, mk)
    floors = {}
    for v, d in per.items():
        marks = sorted(mk for _, mk in d.values())[:LAST_N]   # lowest marks = loosest
        floors[v] = round(statistics.median(marks)) if marks else None
    return floors

mbbs = build_floors("MBBS")
bds = build_floors("BDS")

def cellvals(floors, label, pwd, q):
    code = CODE_FOR.get(label)
    if pwd or not code: return dict(m25=q, m26=q)
    m25 = floors.get(code)
    if not m25: return dict(m25=q, m26=q)
    return dict(m25=max(m25, q), m26=max(round(m25 + difficulty_shift(m25)), q))

rows_out = []
H = (f"{STATE} | {'category':9} {'B2b':>4} | {'MBBS25 marks':>12} {'MBBS26 marks':>12} | {'BDS25 marks':>12} {'BDS26 marks':>12}")
print(H); print("-"*len(H))
for label, pwd in ROWS:
    q = QUAL_2026[QCAT[label]]
    mb = cellvals(mbbs, label, pwd, q); bd = cellvals(bds, label, pwd, q)
    rows_out.append({"state": STATE, "category": label, "B2b_qualifying_marks_2026": q,
        "B1a_MBBS_marks_2025": mb["m25"], "B1a_MBBS_AIR_2025": "",
        "B1a_MBBS_marks_2026est": mb["m26"], "B1a_MBBS_AIR_2026est": "",
        "B1b_BDS_marks_2025": bd["m25"], "B1b_BDS_AIR_2025": "",
        "B1b_BDS_marks_2026est": bd["m26"], "B1b_BDS_AIR_2026est": ""})
    print(f"{STATE[:3]} | {label:9} {q:>4} | {mb['m25']:>12} {mb['m26']:>12} | {bd['m25']:>12} {bd['m26']:>12}")

print("\nMBBS floors (marks) incl. J&K-specific quotas:", {v: mbbs.get(v) for v in ['OM','RBA','OBC','SC','ST','EWS','ALC','P&B']})
print("NOTE: RBA/ALC/P&B are J&K area quotas with no national equivalent — excluded from base matrix.")

outp = OUT / "jk_matrix_final.csv"
with open(outp, "w", newline="") as fh:
    cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nJK: closing UT-rank -> marks via UT MERIT LIST (no curve) | OM=Gen | RBA/ALC/P&B excluded | median-of-5 | wrote {outp}")
