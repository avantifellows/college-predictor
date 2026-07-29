#!/usr/bin/env python3
"""
Small-state / UT tracks for the NEET 2026 matrix — built from the UNIFIED national file.

WHY (Surya, 2026-07-27): the North-East, the South, and the Chandigarh region (PB/HR/JK/Ladakh)
were flagged as priorities, with the instruction: **"even if one college in the state it is fine,
get some numbers"** — and every state/UT should appear in the sheet (blank where we truly have none).

SOURCE: `medical-state-counselling/extracted_data/national_closing_ranks_unified_AIR_2025.csv`
  (2,863 rows, 32 states/UTs). This file was surfaced via Akshay's national-midpoint note. It is
  already normalised to a single AIR space (`air_unified`) with a documented `conversion_method`
  per row (native AIR / TN→AIR via score ladder / KL,JK→AIR via merit list / GJ per-category curves),
  plus `category_canonical`, `source_quality` (official vs third-party) and `is_estimated`.

WHY A SEPARATE BUILDER (not folded into the 21 audited states):
  For the 21 states we already parsed sources ourselves and audited each parser. These small
  states/UTs typically have **1-3 govt colleges**, so `median-of-loosest-5-colleges` degenerates to
  "the one college's closing". We therefore emit them with an explicit LOW/MEDIUM confidence flag,
  and we DO NOT overwrite any state we already built from audited sources.

METHOD (same spine as the main matrix):
  closing AIR per (college, category) -> take the LOOSEST per college -> median of up to 5 colleges
  -> marks via our score_rank model (validated to ~±1 mark vs TN/MP/HR official marks)
  -> 2026 = 2025 marks + difficulty shift. PwD rows = qualifying floor.

CONFIDENCE:
  colleges >= 5  -> Medium (still not source-audited by us)
  colleges 2-4   -> Low
  colleges == 1  -> Very low (single seat defines the number)
"""
import csv, json, statistics
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"
UNIFIED = REPO / "amogh-csv/medical-state-counselling/extracted_data/national_closing_ranks_unified_AIR_2025.csv"

# states/UTs we already built from our own audited sources — never overwrite these
ALREADY = {"MH", "TG", "KA", "GJ", "AP", "KL", "PB", "MP", "WB", "HP", "UP", "BR",
           "CG", "UK", "TN", "AS", "JH", "JK", "RJ", "HR", "OD"}
NAME = {"MN": "Manipur", "GA": "Goa", "ML": "Meghalaya", "MZ": "Mizoram", "NL": "Nagaland",
        "TR": "Tripura", "AR": "Arunachal Pradesh", "CH": "Chandigarh", "PD": "Puducherry",
        "AN": "Andaman & Nicobar", "DD": "Dadra & Nagar Haveli", "DL": "Delhi"}
CATMAP = {"Gen": "UR", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST"}
QUAL_2026 = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
             "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
ROWS = [("Gen", False), ("Gen-EWS", False), ("OBC", False), ("SC", False), ("ST", False),
        ("PwD-Gen", True), ("PwD-EWS", True), ("PwD-OBC", True), ("PwD-SC", True), ("PwD-ST", True)]
SEAT_GROWTH = 1.008
LAST_N = 5

model = json.load(open(REPO / "public/data/NEETUG/score_rank_model.json"))
def polyval(c, x):
    v = 0.0
    for a in c: v = v*x + a
    return v
def air2025(s):
    s = max(model["min_trusted_score"], min(s, model["max_trusted_score"])); return 10**polyval(model["coeffs"], s)
def marks_at_air(air):
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

rows_all = [x for x in csv.DictReader(open(UNIFIED))
            if x["air_unified"] and x["category_canonical"]]

def floors(state, prog):
    """category -> (floor AIR, n_colleges)."""
    out = {}
    for cat in ("UR", "EWS", "OBC", "SC", "ST"):
        per = {}
        for x in rows_all:
            if x["state"] != state or x["program_norm"] != prog: continue
            if x["category_canonical"] != cat: continue
            a = int(float(x["air_unified"]))
            if x["college"] not in per or a > per[x["college"]]: per[x["college"]] = a
        if per:
            deep = sorted(per.values(), reverse=True)[:LAST_N]
            out[cat] = (int(statistics.median(deep)), len(per))
    return out

def conf_of(n):
    return "Medium" if n >= 5 else ("Low" if n >= 2 else "Very low (1 college)")

emitted = []
print(f"{'state':22} {'cat':8} {'MBBS25':>7} {'MBBS26':>7} {'BDS25':>6} {'BDS26':>6}  colleges/confidence")
print("-" * 92)
for code, name in NAME.items():
    if code in ALREADY: continue
    fm, fb = floors(code, "MBBS"), floors(code, "BDS")
    if not fm: continue
    for label, pwd in ROWS:
        q = QUAL_2026[QCAT[label]]
        cat = CATMAP.get(label)
        def cell(fl):
            if pwd or not cat or cat not in fl: return (q, q, "")
            air, n = fl[cat]
            m25 = round(marks_at_air(air))
            m26 = round(marks_at_air(air*SEAT_GROWTH) + difficulty_shift(marks_at_air(air*SEAT_GROWTH)))
            return (max(m25, q), max(m26, q), air)
        m25, m26, air25 = cell(fm)
        b25, b26, bair = cell(fb)
        ncol = fm[cat][1] if (cat and cat in fm) else 0
        emitted.append({"state": name, "category": label, "B2b_qualifying_marks_2026": q,
                        "B1a_MBBS_marks_2025": m25, "B1a_MBBS_AIR_2025": air25,
                        "B1a_MBBS_marks_2026est": m26, "B1a_MBBS_AIR_2026est": (round(air25*SEAT_GROWTH) if air25 else ""),
                        "B1b_BDS_marks_2025": b25, "B1b_BDS_AIR_2025": bair,
                        "B1b_BDS_marks_2026est": b26, "B1b_BDS_AIR_2026est": (round(bair*SEAT_GROWTH) if bair else ""),
                        "n_colleges": ncol, "confidence": conf_of(ncol) if ncol else ""})
        if not label.startswith("PwD"):
            print(f"{name:22} {label:8} {m25:>7} {m26:>7} {b25:>6} {b26:>6}  {ncol} col / {conf_of(ncol) if ncol else '-'}")
    print()

outp = OUT / "smallstates_matrix_final.csv"
cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
        "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
        "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est", "n_colleges", "confidence"]
with open(outp, "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader(); w.writerows(emitted)
print(f"wrote {len(emitted)} rows ({len({e['state'] for e in emitted})} states/UTs) -> {outp}")
