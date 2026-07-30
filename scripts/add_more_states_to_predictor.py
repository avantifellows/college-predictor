#!/usr/bin/env python3
"""
Add Bihar, Chhattisgarh, Uttar Pradesh, Uttarakhand and Tamil Nadu to the college predictor.

WHY: these five already have per-(college, category) closing ranks from the Dropbox pipeline — which
is what a PREDICTOR needs (a student wants a list of colleges, not a single state floor). They were
consumed only by the matrix until now. Takes the homeState dropdown from 13 -> 18 states.

WHAT I DID *NOT* ADD, and why: Assam, Jharkhand, J&K, Delhi, Puducherry, and the NE states/UTs.
Their extracts collapse to ONE college row, or are per-student allotment lists, or (Delhi/Puducherry)
live in the AIQ file under a special Seat Type and are already reachable. A predictor row needs a real
college list; publishing a 1-college "state" would be worse than leaving it to AIQ.

RANK SPACE — the one thing that matters here. The predictor compares the student's ALL INDIA RANK
against `Closing Rank`, so every row must be AIR:
  BR / CG / UP / UK — already AIR-native (`closing_AIR`). Used as-is.
  TN — publishes STATE rank (`closing_grank`, maxes at ~32k) AND closing MARKS (`closing_tmark`).
       Its state rank is NOT comparable to AIR, so it must be converted. We convert from **marks**
       using our own score->AIR model (validated against 4 states' published marks) rather than the
       pipeline's TN rank->AIR curve, because marks are the more direct signal.
       ★ Cross-checked the two routes against each other on all 249 TN rows: median ratio **0.98**
         (p10 0.96, p90 1.01). They agree, so either is defensible; we take the model.

CATEGORIES stay as each state's own codes in `Category`, with a readable expansion in
`Category Label` — the standing "labelled state codes" choice. Notable ones:
  BR: UR / BC / EBC (Bihar's Extremely Backward Class) / EWS / SC / ST
  TN: OC / BC / BCM (BC-Muslim) / MBC&DNC / SC / SCA (Arunthathiyar) / ST — and **NO EWS**, since
      Tamil Nadu runs its own communal reservation instead.
  UP/CG/UK: standard UR / OBC / EWS / SC / ST.

GENDER: UP and CG split closings by seat gender. We keep both rows and set `Gender` so the existing
gender filter works, rather than silently dropping the female-seat pool.
"""
import csv
import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DBX = REPO / "amogh-csv/medical-state-counselling/extracted_data"
NEETUG = REPO / "public/data/NEETUG/NEETUG.json"

# ---- our validated 2025 marks <-> AIR model (used only for TN) ----
_m = json.load(open(REPO / "public/data/NEETUG/score_rank_model.json"))
def _pv(c, x):
    v = 0.0
    for a in c: v = v * x + a
    return v
def air_from_marks(mk):
    mk = max(_m["min_trusted_score"], min(float(mk), _m["max_trusted_score"]))
    return int(round(10 ** _pv(_m["coeffs"], mk)))

LABELS = {
    "UR": "General / Unreserved", "OPEN": "General / Unreserved", "GEN": "General / Unreserved",
    "OBC": "OBC", "EWS": "EWS", "SC": "Scheduled Caste", "ST": "Scheduled Tribe",
    "BC": "Backward Class", "EBC": "Extremely Backward Class (Bihar)",
    "OC": "Open Competition (General)", "BCM": "Backward Class - Muslim",
    "MBC&DNC": "Most Backward Class & Denotified Communities",
    "SCA": "SC - Arunthathiyar (sub-quota)",
}
PROG = {"M.B.B.S.": "MBBS", "MBBS": "MBBS", "B.D.S.": "BDS", "BDS": "BDS"}


def emit(state, source, round_label, rows):
    out = []
    for coll, prog, cat, air, gender in rows:
        prog = PROG.get(str(prog).strip().upper(), str(prog).strip().upper())
        if prog not in ("MBBS", "BDS"):
            continue
        if not (coll and cat and air):
            continue
        if air < 1 or air > 1_500_000:
            continue
        out.append({
            "Institute": coll, "Address": "", "State": state,
            "Seat Type": "State Quota",
            # These sources are govt-college-only (the pipeline filters privates out upstream);
            # UP additionally has [PPP] colleges excluded by our matrix builder — see below.
            "College Type": "Govt",
            "Academic Program Name": prog,
            "Category": cat,
            "Category Label": LABELS.get(cat.upper(), cat),
            "Gender": gender or "Gender-Neutral",
            "Closing Rank": str(int(air)),
            "Round": round_label, "rank_space": "NEET AIR", "Source": source,
        })
    return out


def num(v):
    v = str(v or "").strip()
    try:
        return int(float(v))
    except ValueError:
        return None


def gender_of(v):
    v = str(v or "").strip().upper()
    if v in ("F", "FEMALE"):
        return "Female-only"
    return "Gender-Neutral"


# UP tags Public-Private-Partnership colleges as govt but they fill like privates (our matrix
# builder excludes them, and a private dental college once made UP's BDS floor read 232 marks).
def is_ppp(name):
    return "ppp" in str(name).lower()


ADDS = []

# ---------------- Bihar (AIR-native) ----------------
# ★ The upstream Bihar file lists two PRIVATE colleges as government — the same two the matrix work
#   already removed (they made Bihar's floor look implausible). Katihar Medical College and
#   Narayan Medical College Sasaram are private; NMC Sasaram's "UR" row closes at AIR 309,837 vs
#   ~19k for the deepest real govt college, which is what gives them away.
BR_PRIVATE = ("sasaram", "katihar")
rows = []
for r in csv.DictReader(open(DBX / "BR_closing_ranks_state_govt_2025.csv")):
    if any(p in r["institute"].lower() for p in BR_PRIVATE):
        continue
    rows.append((r["institute"].strip(), r["course"], r["allotted_cat"].strip(),
                 num(r["closing_AIR"]), None))
ADDS.append(("Bihar", "bihar_2025_r3_cutoffs", "Round 3 (revised)", rows))

# ---------------- Chhattisgarh (AIR-native, gender-split) ----------------
rows = []
for r in csv.DictReader(open(DBX / "CG_closing_ranks_state_govt_2025.csv")):
    rows.append((r["institute"].strip(), r["allotted_course"], r["vert"].strip(),
                 num(r["closing_AIR"]), gender_of(r.get("seat_gender"))))
ADDS.append(("Chhattisgarh", "chhattisgarh_2025_r1r2_cutoffs", "Round 1+2", rows))

# ---------------- Uttar Pradesh (AIR-native, gender-split, drop PPP) ----------------
rows = []
for r in csv.DictReader(open(DBX / "UP_closing_ranks_state_govt_2025.csv")):
    if is_ppp(r["institute"]):
        continue
    rows.append((r["institute"].strip(), r["branch"], r["vert"].strip(),
                 num(r["closing_AIR"]), gender_of(r.get("seat_gender"))))
ADDS.append(("Uttar Pradesh", "up_2025_r1r2r3_cutoffs", "R1+R2+R3 (cumulative)", rows))

# ---------------- Uttarakhand (AIR-native) ----------------
rows = []
for r in csv.DictReader(open(DBX / "UK_closing_ranks_state_govt_2025.csv")):
    rows.append((r["allotted_college"].strip(), r["program"], r["vert"].strip(),
                 num(r["closing_AIR"]), None))
ADDS.append(("Uttarakhand", "uttarakhand_2025_r3_cutoffs", "Round 3 (broadsheet)", rows))

# ---------------- Tamil Nadu (MARKS -> AIR via our model) ----------------
rows, tn_skipped = [], 0
for r in csv.DictReader(open(DBX / "TN_closing_ranks_state_govt_2025.csv")):
    tm = str(r.get("closing_tmark", "")).strip()
    if not tm.lstrip("-").isdigit() or int(tm) < 100:
        tn_skipped += 1          # no usable closing marks -> skip rather than guess
        continue
    rows.append((r["college"].strip(), r["program"], r["community"].strip(),
                 air_from_marks(int(tm)), None))
ADDS.append(("Tamil Nadu", "tamilnadu_2025_throughR3_cutoffs", "Through Round 3", rows))

# ---------------- write ----------------
D = json.load(open(NEETUG))
before = len(D)
sources = {a[1] for a in ADDS}
D = [r for r in D if r.get("Source") not in sources]      # idempotent
summary = []
for state, source, rnd, rows in ADDS:
    new = emit(state, source, rnd, rows)
    D.extend(new)
    summary.append((state, len(new), len({r["Institute"] for r in new}),
                    sorted({r["Category"] for r in new})))
json.dump(D, open(NEETUG, "w"), indent=1)

print(f"NEETUG.json: {before} -> {len(D)} rows\n")
for state, n, ncoll, cats in summary:
    print(f"  {state:16} +{n:4} rows  {ncoll:3} colleges  cats={','.join(cats)}")
print(f"\nTN rows skipped (no closing marks): {tn_skipped}")
