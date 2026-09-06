#!/usr/bin/env python3
"""
Rajasthan state min-marks matrix. Same L1->L5 machinery.

Decisions (docs/NEET_2026_MATRIX_DECISIONS.md, "STATE SLICE — RAJASTHAN"):
- SOURCE = **OUR OWN 2025 PARSER** `scripts/parse_rajasthan_2025.py`, which parses the OFFICIAL
  board PDFs Surya supplied (`amogh-csv/599136R1 Allotment 2025.pdf` — "Provisional allotment list,
  Round 1, 18.08.2025", 299pp; + the 657pp revised merit list). This CLOSES the RJ-2025 gap: the
  Dropbox `state_RJ.py` is stuck on 2024 because `rajugneet2025.in` blocks programmatic access.
- **AIR-native** — the board publishes `NEET A.I. Rank` per allottee; no rank conversion needed.
- **GOVT FILTER = STATED IN THE DATA.** The college string carries an explicit seat-type marker:
  `(Govt. Seat)` vs `(Gen. Seat)` / `(Mgmt. Seat)` / `(NRI Seat)`. Verified ZERO overlap: 31 colleges
  have `Govt. Seat`, a disjoint 26 have `Gen. Seat` (= general seat at a PRIVATE college). Cleanest
  govt filter of any state — no heuristic, no fee classifier, no hard-coded roster (the failure mode
  that broke KA / PB / UP / BR).
- **HORIZONTAL SUB-POOLS EXCLUDED** (critical): `category_considered` carries PwD / EXS1-5
  (Ex-Serviceman) / WPP1-3 (war-widow) flags. Those close at AIR ~1.1-1.3M; including them made GEN
  "close" at AIR 1,136,995 — looser than EWS, impossible. Base seats only (2,102 of 2,200 govt rows).
- **CATEGORIES (Rajasthan verticals):** GEN->Gen, EWS->Gen-EWS, SC->SC.
  **OBC = MEDIAN{OBC, MBC}** (MBC = Most Backward Class, an OBC-family bucket in RJ).
  **ST  = MEDIAN{ST, SA}**  (SA = Sahariya, a PVTG/ST-family bucket).
  `category_allotted` token2 is area+gender (URB/URG/OBB/OBG/...) -> we take the looser of gender.
- **⚠ ROUND CAVEAT: Round 1 ONLY.** Every other state uses a later/final round (R3 / mop-up /
  R1+R3). Later rounds close deeper, so RJ's floor runs STRICT (same caveat as AIQ-R1 and PB-R2).
  Labeled in `source_round`; do not read RJ as directly comparable without that in mind.
- FLOOR = median of loosest-5 govt colleges (30 colleges -> robust). SEAT_GROWTH=1.008.
"""
import csv, json, statistics
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"
CLOSING = Path(__file__).resolve().parent / "rajasthan_2025_out" / "rj_closing_2025.csv"

STATE = "Rajasthan"
SEAT_GROWTH = 1.008
LAST_N = 5
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
# matrix base -> Rajasthan vertical(s) to median-collapse
SUBGROUPS = {"Gen": ["GEN"], "Gen-EWS": ["EWS"], "OBC": ["OBC", "MBC"],
             "SC": ["SC"], "ST": ["ST", "SA"]}
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

# ---- govt BASE closings only: seat_type == 'Govt. Seat' AND no horizontal flag ----
ROWS_IN = [r for r in csv.DictReader(open(CLOSING))
           if r["seat_type"] == "Govt. Seat" and r["horizontal"] == ""]

def vert_floor(prog, vert):
    """median-of-loosest-5 colleges for one Rajasthan vertical (looser of gender per college)."""
    per = defaultdict(int)
    for r in ROWS_IN:
        if r["program"] != prog or r["vertical"] != vert: continue
        air = int(r["closing_air"])
        if air > per[r["college"]]: per[r["college"]] = air
    deep = sorted(per.values(), reverse=True)[:LAST_N]
    return int(statistics.median(deep)) if deep else 0

def collapse(prog, groups):
    vals = [v for v in (vert_floor(prog, g) for g in groups) if v]
    return int(statistics.median(vals)) if vals else None

def cellvals(prog, label, pwd, q):
    if pwd: return dict(m25=q, air25="", m26=q, air26="")
    air25 = collapse(prog, SUBGROUPS.get(label, []))
    if not air25: return dict(m25=q, air25="", m26=q, air26="")
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

print("\nMBBS vertical floors (AIR):", {v: vert_floor("MBBS", v) for v in ["GEN","EWS","OBC","MBC","SC","ST","SA"]})
print("OBC = median(OBC, MBC); ST = median(ST, SA=Sahariya PVTG)")
print("NOTE: Round 1 only -> floor runs STRICT vs states using final rounds.")

outp = OUT / "rj_matrix_final.csv"
with open(outp, "w", newline="") as fh:
    cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
            "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
            "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader()
    for r in rows_out: w.writerow(r)
print(f"\nRJ: OUR parser on official 2025 board PDFs | govt via '(Govt. Seat)' marker | horizontals excluded | wrote {outp}")
