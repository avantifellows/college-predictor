"""
Puducherry (UT) min-marks matrix. Built from OUR OWN official data.

Decisions (docs/NEET_2026_MATRIX_DECISIONS.md, "STATE SLICE — PUDUCHERRY"):
- SOURCE = OURS. `NEETUG.json` `aiq_2025_cutoffs` carries an explicit
  **`Seat Type = "Internal -Puducherry UT Domicile"`** — 9 official MCC rows across
  **JIPMER Puducherry** and **JIPMER Karaikal**, categories Open/EWS/OBC/SC/ST. True NEET AIRs.
- **Corrects an earlier wrong call.** The third-party file showed EWS (354,130) ~16x looser than
  UR (22,390) and I flagged Puducherry as "INCOHERENT — do not use". Our OFFICIAL rows reproduce
  those very numbers (EWS 354,130; ST 599,794), so the pattern is REAL, not corrupt: the
  Puducherry UT-domicile quota at JIPMER is tiny, so EWS/ST have so few domicile applicants that
  they fill to very deep ranks. Same sparse-pool behaviour as Telangana SC1 / Uttarakhand ST.
- **CAVEAT:** only 2 colleges (both JIPMER, a CENTRAL institute); ST has a single row. Gen/OBC/SC
  are usable; **EWS and ST are single-/thin-pool artefacts — treat as very low confidence.**
"""
import csv, json, statistics
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"

STATE = "Puducherry"
SEAT_GROWTH = 1.008
LAST_N = 5
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
CODE_FOR = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST"}
ROWS = [("Gen", False), ("Gen-EWS", False), ("OBC", False), ("SC", False), ("ST", False),
        ("PwD-Gen", True), ("PwD-EWS", True), ("PwD-OBC", True), ("PwD-SC", True), ("PwD-ST", True)]

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

D = json.load(open(REPO / "public/data/NEETUG/NEETUG.json"))
DU = [r for r in D if r["Source"] == "aiq_2025_cutoffs" and r["Seat Type"] == "Internal -Puducherry UT Domicile"]

def floor_air(prog, cat):
    per = {}
    for r in DU:
        if r["Academic Program Name"] != prog or r["Category"] != cat: continue
        a = int(r["Closing Rank"])
        if r["Institute"] not in per or a > per[r["Institute"]]: per[r["Institute"]] = a
    deep = sorted(per.values(), reverse=True)[:LAST_N]
    return (int(statistics.median(deep)), len(per)) if deep else (0, 0)

def cellvals(prog, label, pwd, q):
    code = CODE_FOR.get(label)
    air25 = 0 if (pwd or not code) else floor_air(prog, code)[0]
    if not air25:
        return dict(m25=q, air25="", m26=q, air26="")
    m25, air26, m26 = project(air25)
    return dict(m25=max(m25, q), air25=air25, m26=max(m26, q), air26=air26)

rows_out = []
H = (f"{STATE} | {'category':9} {'B2b':>4} | {'MBBS25 mk/rank':>16} {'MBBS26 mk/rank':>16} | {'BDS25 mk/rank':>16} {'BDS26 mk/rank':>16}")
print(H); print("-"*len(H))
for label, pwd in ROWS:
    q = QUAL_2026[QCAT[label]]
    mb = cellvals("MBBS", label, pwd, q); bd = cellvals("BDS", label, pwd, q)
    rows_out.append({"state": STATE, "category": label, "B2b_qualifying_marks_2026": q,
        "B1a_MBBS_marks_2025": mb["m25"], "B1a_MBBS_AIR_2025": mb["air25"],
        "B1a_MBBS_marks_2026est": mb["m26"], "B1a_MBBS_AIR_2026est": mb["air26"],
        "B1b_BDS_marks_2025": bd["m25"], "B1b_BDS_AIR_2025": bd["air25"],
        "B1b_BDS_marks_2026est": bd["m26"], "B1b_BDS_AIR_2026est": bd["air26"]})
    def f(c): return f"{c['m25']}/{c['air25']}", f"{c['m26']}/{c['air26']}"
    a, b = f(mb); c1, d1 = f(bd)
    print(f"{STATE[:3]} | {label:9} {q:>4} | {a:>16} {b:>16} | {c1:>16} {d1:>16}")

print("\nMBBS UT-domicile floors (AIR, n colleges):", {c: floor_air("MBBS", c) for c in ["Open","EWS","OBC","SC","ST"]})
print("Pool = JIPMER Puducherry + JIPMER Karaikal (central institute, tiny UT-domicile quota).")
print("EWS/ST are single-/thin-pool artefacts -> very low confidence.")

outp = OUT / "pd_matrix_final.csv"
with open(outp, "w", newline="") as fh:
    cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nPD: OUR official data (Seat Type='Internal -Puducherry UT Domicile') | wrote {outp}")
