#!/usr/bin/env python3
"""
Chandigarh (UT) min-marks matrix — from the OFFICIAL GMCH-32 admitted-students list.

WHY THIS EXISTS
  Chandigarh was only available as THIRD-PARTY data, and that data was WRONG: it claimed
  UR closing = AIR 2,567 (-> 588 marks). The official GMCH list shows the real UT-pool General
  closing is **AIR 37,619 / 514 marks** — the third-party figure overstated the bar by ~74 marks.
  (Surya flagged Chandigarh as a priority region, so this was worth sourcing properly.)

SOURCE (official, Government Medical College & Hospital, Chandigarh — GMCH-32):
  `amogh-csv/chandigarh-gmch32-2025-admitted-list.pdf` (11pp)
  = gmch.gov.in -> "List of students admitted merit-wise category-wise (UG & PG)" -> Batch 2025.
  This is the ADMITTED-STUDENT register, i.e. ground truth (not a projected cutoff).
  Columns used: [1] Merit No. (= NEET AIR) | [4] Physically Handicapped | [6] Category
                | [7] Sub-Category | [15] Marks Obtained in Entrance (NEET, /720)

WHY THIS SOURCE IS EXCEPTIONALLY GOOD
  - **Both AIR and NEET marks per admitted student** -> marks-native, no conversion.
  - The `Category` column separates the pools: "General AIQ" / "OBC NCL AIQ" / "SC AIQ" / "ST AIQ"
    (the 15% All-India pool) and "NRI" from the plain UT-pool entries. We keep only the UT pool.
  - `Sub-Category` gives the reservation vertical (General / OBC-NCL / SC / ST / Gen-EWS).

FILTERS
  - Drop AIQ rows (category contains 'AIQ') — that is the national pool, not Chandigarh's quota.
  - Drop NRI rows and PwD rows (horizontal sub-pool; closes far deeper).
  - **Drop the deep General stragglers.** The UT General cluster ends at AIR 37,619 (514 marks);
    two rows sit at AIR 316,263 (350) and 826,700 (194). At 194 marks — essentially the qualifying
    floor — those are special/sports/defence-type seats the Category column does not label. Using
    them would put the "General floor" at 194, which is plainly not the general-merit bar.
    Rule applied: within a vertical, drop trailing rows below 60% of the cluster's closing marks.
- Only ONE college (GMCH-32), so `median-of-loosest-5` degenerates to that college's closing.
  ST has a single admitted student -> very low confidence.
"""
import csv, json, statistics
from collections import defaultdict
from pathlib import Path

import pdfplumber

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"
PDF = REPO / "amogh-csv/chandigarh-gmch32-2025-admitted-list.pdf"

STATE = "Chandigarh"
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
SUB_FOR = {"Gen": "General", "Gen-EWS": "Gen-EWS", "OBC": "OBC- NCL (Central List)",
           "SC": "SC", "ST": "ST"}
ROWS = [("Gen", False), ("Gen-EWS", False), ("OBC", False), ("SC", False), ("ST", False),
        ("PwD-Gen", True), ("PwD-EWS", True), ("PwD-OBC", True), ("PwD-SC", True), ("PwD-ST", True)]

shift = json.load(open(OUT / "shift_2026.json")); k, Mref = shift["k"], shift["Mref"]
def difficulty_shift(m): return k * max(0.0, Mref - m)


def parse():
    recs = []
    with pdfplumber.open(PDF) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables() or []:
                for raw in table:
                    if not raw or len(raw) < 17: continue
                    c = [" ".join(str(x or "").split()) for x in raw]
                    if not c[0].isdigit(): continue
                    air, mk = c[1].replace(",", ""), c[15].replace(",", "")
                    if not (air.isdigit() and mk.isdigit()): continue
                    recs.append({"air": int(air), "marks": int(mk), "ph": c[4],
                                 "category": c[6], "sub": c[7]})
    return recs


def ut_pool(recs):
    out = []
    for r in recs:
        cat = r["category"].upper()
        if "AIQ" in cat or "NRI" in cat or cat == "PWD": continue      # not UT-pool merit seats
        if r["ph"].upper().startswith("PW"): continue                  # horizontal PwD sub-pool
        out.append(r)
    return out


GAP_BREAK = 40   # marks

def closing(rows):
    """Worst (lowest-marks) admitted in the MERIT CLUSTER.

    Special/sports/defence-type seats are not labelled in the Category column but are obvious in
    the marks sequence: the genuine cluster steps down 0-4 marks at a time, then falls off a cliff.
    e.g. General: ... 519, 515, 515, **514**, then 350 (-164), then 194 (-156).
    So we cut at the first drop larger than GAP_BREAK marks rather than using a ratio (a ratio rule
    let 350 through, since 350 is 68% of 514).
    """
    if not rows: return None, None, 0
    s = sorted(rows, key=lambda r: -r["marks"])          # best marks first
    # Only apply the gap cut where the category is big enough for a "cluster" to mean anything.
    # In a 4-6 student category, a 40-mark step between consecutive admits is normal spacing,
    # not a pool break — cutting there would wrongly raise the floor (EWS: would cut 526 -> 569).
    if len(s) < 10:
        last = s[-1]
        return last["marks"], last["air"], len(s)
    keep = [s[0]]
    for r in s[1:]:
        if keep[-1]["marks"] - r["marks"] > GAP_BREAK:
            break
        keep.append(r)
    last = keep[-1]
    return last["marks"], last["air"], len(keep)


recs = parse()
pool = ut_pool(recs)
by = defaultdict(list)
for r in pool: by[r["sub"]].append(r)

rows_out = []
H = (f"{STATE} | {'category':9} {'B2b':>4} | {'MBBS25 marks':>12} {'MBBS26 marks':>12} | {'closing AIR':>11} {'n':>3}")
print(H); print("-"*len(H))
for label, pwd in ROWS:
    q = QUAL_2026[QCAT[label]]
    sub = SUB_FOR.get(label)
    m25 = air = None; n = 0
    if not pwd and sub:
        m25, air, n = closing(by.get(sub, []))
    if not m25:
        m25v, m26v, airv = q, q, ""
    else:
        m25v = max(m25, q); m26v = max(round(m25 + difficulty_shift(m25)), q); airv = air
    rows_out.append({"state": STATE, "category": label, "B2b_qualifying_marks_2026": q,
        "B1a_MBBS_marks_2025": m25v, "B1a_MBBS_AIR_2025": airv,
        "B1a_MBBS_marks_2026est": m26v, "B1a_MBBS_AIR_2026est": "",
        "B1b_BDS_marks_2025": q, "B1b_BDS_AIR_2025": "",
        "B1b_BDS_marks_2026est": q, "B1b_BDS_AIR_2026est": ""})
    print(f"{STATE[:3]} | {label:9} {q:>4} | {m25v:>12} {m26v:>12} | {str(airv):>11} {n:>3}")

print(f"\nparsed {len(recs)} admitted students; UT-pool (excl AIQ/NRI/PwD) = {len(pool)}")
print("Only college: GMCH-32. No govt dental in Chandigarh -> BDS = qualifying.")
print("ST has a single admitted student -> very low confidence.")
print("NOTE: third-party data claimed UR 2,567 AIR (588 marks) — official closing is 514. Discarded.")

outp = OUT / "ch_matrix_final.csv"
with open(outp, "w", newline="") as fh:
    cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nCH: OFFICIAL GMCH-32 admitted list | marks-native | wrote {outp}")
