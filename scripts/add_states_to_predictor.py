#!/usr/bin/env python3
"""
Add Rajasthan, Haryana and Odisha state-quota rows to public/data/NEETUG/NEETUG.json
(the file the college predictor reads).

WHY: we parsed these three states from OFFICIAL PDFs during the matrix work, but only the *matrix*
consumed them — the predictor's homeState dropdown still offered 10 states. This wires them in, so a
Rajasthan / Haryana / Odisha student sees their own state-quota cutoffs instead of AIQ only.

We add ONLY these three because their extracts have what a predictor row needs: **per-college,
per-category closing rank with a govt/private flag**. The other new states do not:
  - Tripura (70 rows), Mizoram (90), Arunachal (101), Meghalaya (24), Nagaland (4) are ALLOTMENT or
    ADMITTED lists, i.e. one row per student, not per (college, category) closing. Aggregating 3-seat
    categories into a "cutoff" would publish a one-student bar as if it were a reliable door — the
    exact mistake we blanked Uttarakhand ST for. They stay matrix-only.
  - Ladakh (9 candidates) likewise.

COLUMN SEMANTICS (matching the Karnataka rebuild):
  Seat Type    = the seat pool  (State Quota / Management / NRI ...)
  College Type = Govt or Private   <- DIFFERENT THING; a govt seat can sit in a private college
Both are surfaced per the Karnataka medical-student feedback.

RANK SPACE: all three are stored as **NEET AIR**, which is what the predictor compares against.
Odisha's source is state ranks, but our extract already carries `closing_air` via the official
5,817-pair merit-list bridge, so no conversion happens here.
"""
import csv
import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
NEETUG = REPO / "public/data/NEETUG/NEETUG.json"

TRUTHY = ("true", "1", "yes", "y", "t")


def truthy(v):
    return str(v).strip().lower() in TRUTHY


# Vertical code -> (central-ish category value, readable label). We keep the STATE's own code in
# `Category` (per the standing "labeled state codes" choice — we do not fabricate a state->central
# mapping) and put the expansion in `Category Label`.
RJ_LABEL = {
    "OBC": "OBC (Rajasthan state list)", "MBC": "MBC (Most Backward Class)",
    "SC": "Scheduled Caste", "ST": "Scheduled Tribe", "EWS": "EWS",
    "GEN": "General / Unreserved", "UR": "General / Unreserved",
    "SAHARIYA": "Sahariya (ST sub-quota)",
}
HR_LABEL = {
    "OPEN_CAT": "General / Unreserved", "EWS": "EWS",
    "BCA": "Backward Class-A", "BCB": "Backward Class-B",
    "SC": "Scheduled Caste", "SC_DEPRIVED": "Deprived SC (sub-quota)",
    # Haryana has NO ST quota — verified: 0 ST rows across 2,213 allotments.
}
OD_LABEL = {
    "GN": "General / Unreserved", "EW": "EWS",
    "SC": "Scheduled Caste", "ST": "Scheduled Tribe",
    # Odisha state quota has NO OBC — verified: categories are GN/EW/SC/ST only.
}


def rows_from(path, state, source, label_map, *, prog_key, cat_key, coll_key,
              air_key, govt_key, seat_key=None):
    out, skipped = [], 0
    for r in csv.DictReader(open(REPO / path)):
        air = (r.get(air_key) or "").strip()
        if not air:
            skipped += 1
            continue
        try:
            air = int(float(air))
        except ValueError:
            skipped += 1
            continue
        if air < 1 or air > 1_500_000:      # implausible -> drop rather than publish
            skipped += 1
            continue
        cat = (r.get(cat_key) or "").strip()
        coll = (r.get(coll_key) or "").strip()
        prog = (r.get(prog_key) or "").strip().upper()
        if not (cat and coll and prog):
            skipped += 1
            continue
        # Horizontal sub-pools (PwD / ex-serviceman / war-widow / sports) are separate, much deeper
        # competitions — excluded here exactly as they are from the matrix floors.
        horiz = (r.get("horizontal") or "").strip()
        if horiz:
            skipped += 1
            continue
        seat = (r.get(seat_key) or "").strip() if seat_key else ""
        # Rajasthan states the seat POOL in the data: "Govt. Seat" vs "Gen./Mgmt./NRI Seat".
        # ★ That is the pool, NOT the college. Private colleges in Rajasthan carry "Gen. Seat"
        #   (their state-quota-priced seats) and "Mgmt./NRI Seat" — e.g. "American Int. Inst. of
        #   Med. Sc., Udaipur" has Gen. Seat rows closing at AIR 584,557. Treating every Rajasthan
        #   row as a govt college (which a first version of this script did) would have labelled
        #   ~50 private colleges "Govt".
        # ★ GOVT-NESS IS PER-ROW, NOT PER-COLLEGE. 26 of Rajasthan's colleges carry BOTH a
        #   "Govt. Seat" row and a "Gen./Mgmt. Seat" row — the same campus sells a govt-priced seat
        #   and a management seat. So "is this a government seat" must be read off the ROW's own
        #   seat_type, exactly as the verified matrix builder does (`seat_type == 'Govt. Seat'`).
        #   My earlier attempts flip-flopped between per-college and per-row and mislabelled both
        #   MG MC Jaipur (govt, shown Private) and Adesh/HITECH (private, shown as government).
        if seat_key:
            s = seat.lower()
            is_govt = "govt" in s          # ONLY an explicit "Govt. Seat" row is a govt seat
            seat_type = ("State Quota" if is_govt else
                         "NRI Quota" if "nri" in s else
                         "Management Quota" if ("mgmt" in s or "management" in s) else
                         "State Quota")
        else:
            # Haryana / Odisha ship an explicit per-row is_govt flag from our own parser.
            is_govt = truthy(r.get(govt_key)) if govt_key else True
            seat_type = "State Quota"
        # ★ A few Rajasthan rows leave seat_type BLANK and put the pool in the college name instead,
        #   e.g. "Geetanjali MC, Udaipur (Mgmt. Seat) - Court Order" — a private management seat
        #   closing at AIR 1,096,552. Left unhandled it was published as a GOVERNMENT closing and made
        #   Rajasthan's govt GEN floor read AIR 1.09M instead of the real ~13,375.
        #   This ONLY DEMOTES: it can turn a row private, never promote one to govt, so it can't
        #   override the authoritative "Govt. Seat" marker handled above.
        #   Applies ONLY to the seat_type-driven sources (Rajasthan). Haryana/Odisha have no
        #   seat_type column at all, so `not seat` is always true for them — running this block on
        #   them demoted EVERY row to Private (all 97 HR and 74 OD rows), wiping out their govt
        #   colleges. Hence the `seat_key and` guard.
        low_coll = coll.lower()
        if seat_key and not seat:         # blank seat_type -> fall back to the college-name marker
            if any(t in low_coll for t in ("mgmt. seat", "mgmt seat", "management seat")):
                seat_type, is_govt = "Management Quota", False
            elif "nri seat" in low_coll:
                seat_type, is_govt = "NRI Quota", False
            elif not any(t in low_coll for t in ("govt. seat", "govt seat")):
                is_govt = False           # blank + no govt marker -> do NOT assume government
        out.append({
            "Institute": coll,
            "Address": "",
            "State": state,
            "Seat Type": seat_type,
            "College Type": "Govt" if is_govt else "Private",
            "Academic Program Name": prog,
            "Category": cat,
            "Category Label": label_map.get(cat.upper(), cat),
            "Gender": "Gender-Neutral",
            "Closing Rank": str(air),
            "Round": ROUNDS[state],
            "rank_space": "NEET AIR",
            "Source": source,
        })
    return out, skipped


ROUNDS = {
    "Rajasthan": "Round 1 (official allotment)",
    "Haryana": "Round 1 (official DMER allotment)",
    "Odisha": "Round 3 (official OJEE)",
}

SPECS = [
    ("scripts/rajasthan_2025_out/rj_closing_2025.csv", "Rajasthan", "rajasthan_2025_r1_cutoffs",
     RJ_LABEL, dict(prog_key="program", cat_key="vertical", coll_key="college",
                    air_key="closing_air", govt_key=None, seat_key="seat_type")),
    ("scripts/haryana_2025_out/hr_closing_2025.csv", "Haryana", "haryana_2025_r1_cutoffs",
     HR_LABEL, dict(prog_key="program", cat_key="vertical", coll_key="college",
                    air_key="closing_air", govt_key="is_govt")),
    ("scripts/odisha_2025_out/od_closing_2025.csv", "Odisha", "odisha_2025_r3_cutoffs",
     OD_LABEL, dict(prog_key="program", cat_key="category", coll_key="college",
                    air_key="closing_air", govt_key="is_govt")),
]

D = json.load(open(NEETUG))
before = len(D)
new_sources = {s[2] for s in SPECS}
D = [r for r in D if r.get("Source") not in new_sources]      # idempotent re-run

added = {}
for path, state, source, labels, kw in SPECS:
    rows, skipped = rows_from(path, state, source, labels, **kw)
    D.extend(rows)
    added[state] = (len(rows), skipped, len({r["Institute"] for r in rows}))

json.dump(D, open(NEETUG, "w"), indent=1)

print(f"NEETUG.json: {before} -> {len(D)} rows\n")
for state, (n, sk, ncoll) in added.items():
    print(f"  {state:11} +{n:4} rows  ({ncoll} colleges, {sk} rows skipped: no AIR / horizontal pool)")

from collections import Counter
print()
for _, state, source, _, _ in [(a, b, c, d, e) for a, b, c, d, e in SPECS]:
    rows = [r for r in D if r["Source"] == source]
    print(f"  {state:11} programs={dict(Counter(r['Academic Program Name'] for r in rows))} "
          f"collegeType={dict(Counter(r['College Type'] for r in rows))} "
          f"cats={sorted({r['Category'] for r in rows})}")
