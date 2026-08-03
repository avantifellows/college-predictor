#!/usr/bin/env python3
"""
Rebuild the Karnataka rows in public/data/NEETUG/NEETUG.json from R1+R2+R3 (was R3-only).

WHY (Karnataka medical-student feedback, 2026-07-29, via Amogh):
  "We are using only round 3 data for state cutoffs in Karnataka, but that only includes cutoffs for
   seats left vacant after R1 and 2. For data completeness we need to merge R1,2,3 and then take the
   max value of cutoffs for each category."

They are right, and the effect is bigger than it first looks. `KA_all_allotments_R1_R2_R3_2025.csv`
holds **24,418** allotments split R1 10,457 / R2 12,615 / **R3 1,346** — so the R3-only build used
**5.5%** of the data. The closing RANKS barely move (R3's leftover seats are the deepest, so they
already sat near the floor) but **college coverage collapses**, and coverage is what a predictor shows:

  category   R3-only        R1+R2+R3
  GM          8 colleges    28
  2AG         3             28
  2BG         2             28
  3BG         1             28
  3AG         0  (!!)       25      <- a whole category was invisible in the predictor
  STG         2             28
  SCG         4             28

So a Karnataka 3AG student currently sees NOTHING, and a GM student sees 8 of 28 govt colleges.

METHOD: max closing rank per (institute, program, category) across all three rounds — the looser
(deeper) door, which is what "can I get in" needs. Rounds are cumulative in Karnataka: a seat filled in
R1 stays filled, so the deepest rank a category reached in ANY round is the real bar.

GOVT/PRIVATE: from `KA_college_govt_classification.csv`, which carries a **fee-based** `is_true_govt`
flag (median fee per college). Fee is the most reliable govt signal we have in any state — Karnataka's
own seat-type tags include private colleges. College names there are clean while the allotment file
appends the address, so we match on a normalized prefix.

ALSO FIXES (same feedback): the state-quota list now carries an explicit `College Type` (Govt/Private)
alongside `Seat Type`, because those differ — a *government seat* can exist inside a *private college*
(the govt-quota seats at private colleges), which is exactly the distinction students asked to see.
And `Category Label` spells out Karnataka's codes, including the GM/OPN confusion:
  "OPN is used only for private seats while GM is used only for govt seats, but both mean the same."
"""
import csv
import json
import re
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DBX = REPO / "amogh-csv/medical-state-counselling/extracted_data"
ALLOT = DBX / "KA_all_allotments_R1_R2_R3_2025.csv"
GOVTC = DBX / "KA_college_govt_classification.csv"
NEETUG = REPO / "public/data/NEETUG/NEETUG.json"

SOURCE_NEW = "karnataka_2025_r1r2r3_cutoffs"
SOURCE_OLD = "karnataka_2025_r3_cutoffs"


def norm(s):
    return re.sub(r"[^a-z0-9]", "", str(s).lower())


# Karnataka category codes. Suffixes: G = Government seat pool, H = Hyderabad-Karnataka
# (Art.371-J) regional quota, K = Kannada-medium, R = Rural. The BASE letter/number is the
# social category.
KA_BASE = {
    "GM": "General (= OPN on private-seat lists)",
    "1": "Category-1 (OBC — most backward)",
    "2A": "Category-2A (OBC)",
    "2B": "Category-2B (OBC — Muslim)",
    "3A": "Category-3A (OBC)",
    "3B": "Category-3B (OBC)",
    "SC": "Scheduled Caste",
    "ST": "Scheduled Tribe",
}
SUFFIX = {"G": "Govt seat pool", "H": "Hyderabad-Karnataka (Art. 371-J)",
          "K": "Kannada medium", "R": "Rural", "RH": "Rural + HK"}


def decode(cat):
    """'2AGH' -> base 2A, suffixes G+H. Returns a readable label."""
    c = str(cat or "").strip().upper()
    for base in sorted(KA_BASE, key=len, reverse=True):
        if c.startswith(base):
            rest = c[len(base):]
            bits = [KA_BASE[base]]
            if rest in SUFFIX:
                bits.append(SUFFIX[rest])
            elif rest:
                bits.append(rest)
            return " — ".join(bits)
    return c


# ---- govt classification (fee-based) ----
govt_names = []
for r in csv.DictReader(open(GOVTC)):
    if str(r.get("is_true_govt", "")).strip().lower() in ("true", "1", "yes"):
        govt_names.append(norm(r["college_clean"]))


def is_govt_college(name):
    n = norm(name)
    return any(n.startswith(g[:26]) or g in n for g in govt_names)


# ★ GOVT-vs-PRIVATE SEAT: settled from the FEE column, which separates Karnataka's pools cleanly.
#   Median fee per code at PRIVATE colleges (MBBS, R1+R2+R3):
#     Rs   153,571  40 codes  1G 1H 1K 1R 2AG 2AH 2AK 2AR 2BG .. GM GMH GMK GMR SCG SCH STG ..
#                             -> the GOVERNMENT QUOTA. Note this includes bare GM and every
#                                region/medium suffix (H/K/R), NOT just `G`.
#     Rs   810,535   7 codes  RC1..RC7           -> religious/linguistic minority quota
#     Rs 1,200,117   9 codes  GMP GMPH MA MC ME MEH MM MU OPN  -> the college's OWN paid seats
#     Rs 1,629,965   1 code   MMH
#     Rs 3,511,950+  2 codes  NRI, OTH
#   So the discriminator is **P (Payment) / OPN / MA-MU / RC / NRI**, NOT the letter G.
#   (`OPN` being the private-seat code is exactly what the students reported: "OPN is used only
#    for private seats while GM is used only for govt seats, but both mean the same thing.")
#
#   TWO EARLIER VERSIONS OF THIS WERE WRONG:
#     v1  endswith(("G","GH","GK")) — "GM" ends in "M", so all General rows were mislabelled.
#     v2  "seat type = college type" — a real student caught this: SRI CHAMUNDESHWARI MEDICAL
#         COLLEGE is a PRIVATE college (fee Rs 1,53,571 > every govt college's Rs 0-1,09,350) that
#         nonetheless hosts GOVERNMENT-quota seats. She got one; we displayed "Private".
#     v3  `G`-suffix only — labelled 459 govt-COLLEGE seats (2AH/2AK/SCR at Bangalore MC) private
#         even though all cost Rs 64,350.
#   Govt-ness is a property of the SEAT, not the college. Hence: identify the non-govt pools
#   explicitly and treat everything else as the merit/government quota.
#   ★ ...AND NONE OF THAT INFERENCE IS NEEDED. The source has a `course_name` column that STATES
#     the seat pool: "MBBS-GOVT." / "MBBS-PRIV." / "MBBS-NRI" / "MBBS-OTHERS" (and the BDS
#     equivalents). Verified against the fee column across all 24,418 rows — every label matches
#     its money, with no overlap:
#         MBBS-GOVT.    n=11221  median Rs    64,350
#         BDS-GOVT.     n= 1877  median Rs    95,308
#         BDS-PRIV.     n= 2480  median Rs   361,950
#         MBBS-PRIV.    n= 6273  median Rs 1,200,117
#         MBBS-NRI      n=  189  median Rs 3,511,950
#         MBBS-OTHERS   n= 1674  median Rs 3,611,950
#     Chamundeshwari is the textbook case: 74 rows of MBBS-GOVT. (the govt quota inside this
#     PRIVATE college, Rs 1,53,571) and 177 of MBBS-PRIV. (its own seats, Rs 12,00,117) — and the
#     `MA` code sits under MBBS-PRIV., confirming it is a MANAGEMENT seat, not a merit category.
#     Read the stated field; do not re-derive it from category-code spelling.
def is_govt_seat(course_name):
    """Is THIS SEAT a government-quota seat? Read from the source's own `course_name`, which is
    authoritative and fee-verified. Independent of whether the COLLEGE is govt."""
    return "GOVT" in str(course_name or "").strip().upper()


# ---- merge rounds: max closing rank per (institute, program, category) ----
best = {}
rounds_seen = defaultdict(set)
for r in csv.DictReader(open(ALLOT)):
    prog = (r.get("program") or "").strip()
    cat = (r.get("category") or "").strip()
    coll = (r.get("college") or "").strip()
    if not (prog and cat and coll):
        continue
    try:
        rank = int(float(r["rank"]))
    except (ValueError, KeyError, TypeError):
        continue
    # ★ Key on the NORMALIZED college string. The raw value jams the address onto the name and the
    #   source spells it inconsistently — "A.J. Institute of Dental Sciences,NH- 66,,Mangalore" vs
    #   "...,NH-66,,Mangalore". Keying on the raw string split those into two entries, so the
    #   predictor showed the SAME college twice with two different closing ranks (224 such pairs).
    # Seat POOL is part of the identity: the same college+category exists in MBBS-GOVT. and
    # MBBS-PRIV. at very different ranks and fees, and collapsing them would hide the govt door.
    course = (r.get("course_name") or "").strip()
    key = (norm(coll), prog, cat, "GOVT" if is_govt_seat(course) else "OTHER")
    if rank > best.get(key, (0,))[0]:
        # keep the first spelling we saw as the display name
        best[key] = (rank, r.get("round", ""), coll, course)
    rounds_seen[key].add(str(r.get("round", "")))

# ---- emit NEETUG rows ----
rows = []
for (_norm_coll, prog, cat, _pool), (rank, _rnd, coll, course) in sorted(best.items()):
    govt = is_govt_college(coll)
    # college name vs address: the allotment file jams them together with commas
    parts = [p.strip() for p in coll.split(",")]
    inst = parts[0] if parts else coll
    addr = ", ".join(parts[1:]) if len(parts) > 1 else ""
    rows.append({
        "Institute": inst,
        "Address": addr,
        "State": "Karnataka",
        # ★ SEAT TYPE IS A PROPERTY OF THE SEAT, NOT THE COLLEGE — this is the whole point the
        #   Karnataka students were making, and two earlier versions of this line got it wrong.
        #   v1 used the category suffix endswith(("G","GH","GK")): broken, because "GM" (General)
        #      ends in "M", so every General row was mislabelled Private.
        #   v2 used the college's govt flag: also wrong, and a real student caught it. SRI
        #      CHAMUNDESHWARI MEDICAL COLLEGE is a PRIVATE college (median fee Rs 1,53,571, above
        #      every govt college's Rs 0-1,09,350) that nonetheless hosts GOVERNMENT-QUOTA seats.
        #      A student told Surya she got in through a govt seat there while we displayed
        #      "Seat Type: Private".
        #   The fee data proves the seat/college split cleanly. At PRIVATE colleges:
        #      G-suffix categories -> median fee Rs 1,53,571   (1,832 seats)
        #      everything else     -> median fee Rs 12,00,117  (10,896 seats)   <- 8x more
        #   So a `G`-suffix category IS the government seat pool wherever it appears. Karnataka's
        #   other suffixes (H = Hyderabad-Karnataka, K = Kannada medium, R = Rural, P) are
        #   orthogonal region/medium markers and may follow the G.
        "Seat Type": ("Government" if is_govt_seat(course)
                      else "NRI Quota" if "NRI" in course.upper()
                      else "Management / Other" if "OTHER" in course.upper()
                      else "Private"),
        # NEW (feedback): college type is NOT the same as seat type — a govt seat
        # can sit inside a private college.
        "College Type": "Govt" if govt else "Private",
        "Academic Program Name": prog,
        "Category": cat,
        "Category Label": decode(cat),
        "Gender": "Gender-Neutral",
        "Closing Rank": str(rank),
        "Round": "R1+R2+R3 (max)",
        "rank_space": "NEET AIR",
        "Source": SOURCE_NEW,
    })

# ---------------------------------------------------------------- GUARD
# A "Government" seat must never carry private-tier fees. This is the check that would have caught
# the Chamundeshwari misclassification immediately instead of a student finding it: we had labelled
# a private college's entire seat list "Private", hiding the govt-quota door she actually used.
# Karnataka's fee tiers (fee-verified, all 24,418 rows):
#   govt college govt seat  Rs    64,350 | private college govt quota Rs 1,53,571
#   private college own seat Rs 12,00,117 | NRI Rs 3.5L+ | OTHERS Rs 3.6L+
# So: anything tagged Government above ~Rs 6.2L is suspect. (JGMM Hubli is the one legitimate
# outlier — it charges a flat Rs 6,09,084 for every seat, merit codes included.)
GOVT_FEE_CEILING = 620_000
fee_by_key = {}
for r in csv.DictReader(open(ALLOT)):
    try:
        fee_by_key[(norm(r.get("college")), (r.get("program") or "").strip(),
                    (r.get("category") or "").strip())] = float(r["fees"])
    except (ValueError, KeyError, TypeError):
        continue
violations = []
for row in rows:
    if row["Seat Type"] != "Government":
        continue
    fee = fee_by_key.get((norm(row["Institute"] + ("," + row["Address"] if row["Address"] else "")),
                          row["Academic Program Name"], row["Category"]))
    if fee is not None and fee > GOVT_FEE_CEILING:
        violations.append((row["Institute"][:44], row["Category"], int(fee)))
if violations:
    print(f"\n!! GUARD: {len(violations)} rows tagged Government but priced above "
          f"Rs {GOVT_FEE_CEILING:,} — check the seat-pool logic:")
    for v in violations[:10]:
        print(f"     {v[0]:46} {v[1]:6} Rs {v[2]:,}")
else:
    print("\nGUARD OK: no 'Government' seat is priced above a govt quota.")

D = json.load(open(NEETUG))
before = len(D)
# IDEMPOTENT: drop the old R3-only rows AND any rows this script wrote on a previous run,
# otherwise re-running appends a second copy of Karnataka (we hit exactly that: 2,562 -> 5,124).
kept = [r for r in D if r.get("Source") not in (SOURCE_OLD, SOURCE_NEW)]
dropped = before - len(kept)
D = kept + rows
json.dump(D, open(NEETUG, "w"), indent=1)

print(f"dropped {dropped} old R3-only Karnataka rows")
print(f"added   {len(rows)} merged R1+R2+R3 rows  ({len(set(r['Institute'] for r in rows))} institutes)")
print(f"NEETUG.json: {before} -> {len(D)} rows")
from collections import Counter
print("\nby program :", dict(Counter(r["Academic Program Name"] for r in rows)))
print("by seat type:", dict(Counter(r["Seat Type"] for r in rows)))
print("by coll type:", dict(Counter(r["College Type"] for r in rows)))
print("\ngovt-pool MBBS colleges per category (was 0-8 with R3-only):")
gm = defaultdict(set)
for r in rows:
    if r["Academic Program Name"] == "MBBS" and r["College Type"] == "Govt":
        gm[r["Category"]].add(r["Institute"])
for c in sorted(gm, key=lambda k: -len(gm[k]))[:12]:
    print(f"   {c:6} {len(gm[c])} colleges")
