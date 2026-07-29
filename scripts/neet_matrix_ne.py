#!/usr/bin/env python3
"""
North-East small-state tracks (Arunachal, Meghalaya, Nagaland, Manipur) for the NEET 2026 matrix.

CONTEXT (Surya): NE states were flagged as a priority; "even one college is fine, get some numbers";
the end goal is an estimate of how many Avanti students land MBBS/BDS seats, ~70% accuracy is fine,
underestimation is acceptable, blanks are acceptable — but **be honest about sources**.

★ THE KEY STRUCTURAL FINDING: most NE states do NOT run a normal "state college" quota.
  They nominate their students, against seats RESERVED FOR THAT STATE, into colleges ACROSS INDIA
  (GoI Central Pool / NEC North Eastern Council regional seats). Evidence, straight from the docs:
   - Nagaland (DTE): "FINAL LIST OF CANDIDATES SELECTED THROUGH NAGALAND STATE-NEET (UG) 2025
     COUNSELLING FOR **STATE RESERVED SEATS**" with an allotment column reading **"GoI Central Pool"**
     -> students placed at VMMC Safdarjung, LHMC and MAMC Delhi, GMC Nanded, RIMS Imphal, NEIGRIHMS.
     The cover letter even notes a seat at a college in **Chhattisgarh**.
   - Meghalaya (H&FW Dept): "...in respect of the **seats allotted to the State of Meghalaya**"
     -> Guwahati MC (Assam), Gandhi MC Bhopal, SP MC Bikaner, VMMC Delhi, MGM Indore, Jorhat MC.
   - Arunachal (DTE/APDHTE): 94 MBBS allotments = 85 at TRIHMS (own state) + 7 at RIMS Imphal
     (Manipur) + 2 at Agartala GMC (Tripura).
  So an NE "cutoff" is the bar to win a state-reserved nomination, NOT a state-college closing rank.
  That is still the right number for "will this student get an MBBS seat", which is what we need.

  Manipur is the exception that behaves like a normal state: RIMS / JNIMS / CMC run an 85% Manipur
  state quota (verified: RIMS is centrally-run BUT its 85% is administered by Manipur DME, and its
  seats are reserved for Manipur *and other NE-state* residents — the NEC-style regional door).

SOURCES (all official, all saved into amogh-csv/):
  AR  arunachal-2025-r1-allotment.pdf        apdhte.nic.in — TEXT pdf, clean tables (best NE source)
  ML  meghalaya-2025-mbbs-selected-list.pdf  meghealth.gov.in Order Health.189/2025/66 — SCAN, OCR'd
  NL  nagaland-2025-final-selected-list.pdf  dte.nagaland.gov.in — SCAN, rotated, OCR'd (partial)
  MN  manipur-2025-r2-state-quota-allotment.pdf  manipurmc.mn.gov.in R2 Annexure-A — SCAN, OCR'd

CATEGORY MAPPING (asked by Surya: "idk what khasi jantia and garo categories are")
  Meghalaya splits by indigenous tribe: **Khasi & Jaintia** and **Garo** are SCHEDULED TRIBES
  (Meghalaya's own ST sub-pools), NOT OBC. Mapped to ST. Plus an OPEN category and an ST/SC bucket.
  Arunachal: every row is "Cat-I" = APST (Arunachal Pradesh Scheduled Tribe) -> a single ST-like
  pool; no Gen/OBC/SC split exists in the document, so only one number is reported.
  Nagaland: category recorded as the candidate's tribe (Chakhesang/Ao/Angami/Sumi/Lotha/...) -> ST.

CONFIDENCE: these are all thin and/or OCR-derived. Emitted as INDICATIVE, never as VERIFIED.
"""
import csv, json, statistics
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "neet_matrix_out"

QUAL = {"Open": 213, "EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
        "Open PwD": 194, "EWS PwD": 194, "OBC PwD": 177, "SC PwD": 177, "ST PwD": 178}
QCAT = {"Gen": "Open", "Gen-EWS": "EWS", "OBC": "OBC", "SC": "SC", "ST": "ST",
        "PwD-Gen": "Open PwD", "PwD-EWS": "EWS PwD", "PwD-OBC": "OBC PwD",
        "PwD-SC": "SC PwD", "PwD-ST": "ST PwD"}
ROWS = ["Gen", "Gen-EWS", "OBC", "SC", "ST",
        "PwD-Gen", "PwD-EWS", "PwD-OBC", "PwD-SC", "PwD-ST"]

shift = json.load(open(OUT / "shift_2026.json")); K, MREF = shift["k"], shift["Mref"]
def proj(m25): return round(m25 + K * max(0.0, MREF - m25))

model = json.load(open(REPO / "public/data/NEETUG/score_rank_model.json"))
def _pv(c, x):
    v = 0.0
    for a in c: v = v*x + a
    return v
def marks_at_air(air):
    lo, hi = model["min_trusted_score"], model["max_trusted_score"]
    if air <= 10**_pv(model["coeffs"], hi): return hi
    if air >= 10**_pv(model["coeffs"], lo): return lo
    for _ in range(60):
        z = (lo+hi)/2
        if 10**_pv(model["coeffs"], z) > air: lo = z
        else: hi = z
    return (lo+hi)/2

# ---------------------------------------------------------------------------
# Observed 2025 closings (lowest admitted marks per category).
# AR: from the clean text PDF — MBBS worst AIR 208,132 -> 403 marks; BDS 223,728 -> 395.
# ML: OCR of the official Order — lowest admitted score per printed category block.
# NL: OCR (partial recovery ~12 of ~80 rows) — lowest recovered score. UNDER-counts depth,
#     so the true floor is LOWER than shown; we mark it clearly as partial.
# MN: OCR of R2 Annexure-A — closing AIR per college; state colleges = RIMS/JNIMS/CMC (SAHS private).
# ---------------------------------------------------------------------------
DATA = {
    "Arunachal Pradesh": {
        "note": "All rows are Cat-I (APST). Single tribal pool — no Gen/OBC/SC split in the source.",
        "conf": "INDICATIVE — official text PDF, but one category only (APST)",
        "mbbs": {"ST": round(marks_at_air(208132))},
        "bds":  {"ST": round(marks_at_air(223728))},
    },
    "Meghalaya": {
        "note": "Khasi & Jaintia and Garo are Meghalaya's indigenous SCHEDULED TRIBES (not OBC). "
                "Seats are GoI/state-reserved nominations at colleges across India. ST floor uses the "
                "GARO block (214), the deeper of the two tribal pools; Khasi & Jaintia closes at 357.",
        "conf": "INDICATIVE — OCR of official Order. Waiting-list rows excluded (see below). "
                "Open floor 477 is an UPPER BOUND: the last two selected rows lost their score to OCR.",
        # ★ Each block is "SELECTED LIST" then "WAITING LIST". The Order states a waiting-list candidate
        #   is nominated only if a selected one fails to report — so waiting rows are NOT admissions and
        #   must not set the floor. Taking the block minimum blindly picked up waiting-list scores:
        #   Open would have read 439 (waiting) instead of 477, and Khasi 354 (waiting) instead of 357.
        # Open 477 (selected tail; 439 = waiting) | ST = Garo 214 (selected; deeper than Khasi 357)
        # SC/ST block 396 (the "ST/SC Category" block: 189 there was waiting-list)
        "mbbs": {"Gen": 477, "ST": 214, "SC": 396},
        "bds":  {},
    },
    "Nagaland": {
        "note": "'State reserved seats' are GoI CENTRAL POOL nominations into colleges across India "
                "(VMMC/LHMC/MAMC Delhi, GMC Nanded, RIMS Imphal, NEIGRIHMS). Category = tribe (ST).",
        "conf": "INDICATIVE / PARTIAL — rotated scan, OCR recovered only ~12 of ~80 rows; "
                "true floor is LOWER than shown",
        "mbbs": {"ST": 349},   # lowest MBBS score recovered
        "bds":  {"ST": 204},   # lowest BDS score recovered
    },
    "Mizoram": {
        "note": "GROUND TRUTH — the official ZMCH 2025 ADMITTED-STUDENT register (the NMC return that "
                "Zoram Medical College publishes on its own site as page images). Real students, real "
                "NEET marks. GOVT seats only: NRI rows (marks 133-425, fee Rs 17.76L vs Rs 96,850) and "
                "the one PwBD row (154) are excluded. Mizoram's state quota is the ST pool — 62 admitted "
                "students closing at 335, consistent with the seat matrix (68 of ZMCH's 70 seats are ST). "
                "The General/OBC/SC rows in the register (443-535, names like Dev Pareek / Sakshi Patidar "
                "/ Alok Kumar) are NOT Mizoram-domicile — they are the 15% ALL-INDIA QUOTA seats at ZMCH "
                "and must NOT be read as Mizoram state-quota floors, so they are not published here. "
                "Seat matrix context: MBBS 79 = ZMCH 70 + RIMS Imphal 7 + AGMC Agartala 2 (NE "
                "cross-state); all 12 BDS seats are OUTSIDE Mizoram (RIMS/Guwahati/KGMU/Patna/Chandigarh) "
                "-> no Mizoram govt BDS floor.",
        "conf": "VERIFIED — official ZMCH admitted register (marks per admitted student), 2025. "
                "ST n=62. AIQ rows separated out; NRI and PwD excluded.",
        # ★ THIS REPLACED A BAD ESTIMATE. We had previously inferred 435 by taking the 79th score off
        #   the 2026 merit list (top-79-take-79-seats). The register shows the real ST closing is 335 —
        #   the estimate was 100 MARKS TOO HIGH, in exactly the over-estimating direction predicted
        #   (non-reporting/upgrades let seats cascade well below the naive seat-count boundary).
        #   Lesson: a seat-count inference is not a substitute for an admitted list.
        "mbbs": {"ST": 335},
        "bds":  {},
    },
    "Tripura": {
        "note": "GOVT = AGMC Agartala only. TMC / BRAM Teaching Hospital is a SOCIETY (private-status) "
                "college and is EXCLUDED — its ST seats go to 118-168 marks, i.e. BELOW the national "
                "qualifying floor, which is exactly the private-college depth our govt filter exists to "
                "remove. Tripura candidates are also allotted to RIMS Imphal (Manipur) under the NE "
                "regional pattern; those are central seats, kept separate. Gen/EWS left at qualifying: "
                "AGMC Gen rows exist in the PDF but OCR split their institute token onto another line, "
                "so we have no verified AGMC Gen closing (R1 sample is partial).",
        "conf": "INDICATIVE / PARTIAL — official TRMCC R1 PDF, OCR'd, 59% line recovery. AGMC-only "
                "pool is thin (OBC n=2, SC n=3, ST n=3). R1 only -> later rounds close deeper, so "
                "these run TIGHT.",
        # AGMC Agartala (the only govt college) R1 closings, marks-native from the document.
        "mbbs": {"OBC": 403, "SC": 333, "ST": 297},
        "bds":  {},   # single AGMC BDS Gen row (410) — n=1, not published
    },
    "Ladakh": {
        "note": "NO medical college in the UT — but Ladakh runs its OWN GoI CENTRAL POOL quota "
                "(DHS Ladakh, under MoHFW). Seats are nominations to colleges across India (LHMC Delhi, "
                "MLB Jhansi, LLRM Meerut, RSDKS Ambikapur, Dumka, CCM Durg; BDS at Indore & KGMU "
                "Lucknow). Pools are LEH vs KARGIL and Open vs Female (district-domicile), NOT the "
                "standard Gen/OBC/SC/ST ladder — so the single floor is reported on the Gen row.",
        "conf": "INDICATIVE — official DHS Ladakh notification, marks-native, but only 9 selected "
                "candidates (6 MBBS with scores, 2 BDS). Tiny pool; one seat moves the floor.",
        # ★ WAITING LIST EXCLUDED (Annexure B) — and here it really matters: the top waiting
        #   candidate scored 418, ABOVE two ADMITTED candidates (412 and 419). Pooling the annexures
        #   would have produced a nonsense floor. Annexure B is also labelled 2024-25, not 2025-26.
        # Annexure A (Selected/Nominated): worst admitted MBBS 412 (AIR 187,194); BDS 372 (AIR 267,074).
        "mbbs": {"Gen": 412},
        "bds":  {"Gen": 372},
    },
    "Manipur": {
        "note": "Genuine 85% state quota at RIMS / JNIMS / CMC (RIMS is centrally-run but its 85% is "
                "administered by Manipur DME and reserved for Manipur + other NE states). SAHS excluded "
                "(private). SC/ST left at qualifying: only 1 SC and 2 ST rows recovered — not a pool.",
        "conf": "INDICATIVE — OCR of R2 only (30 govt rows); Gen n=10, OBC n=17 usable; "
                "SC n=1 / ST n=2 too thin to publish. R2 is mid-counselling, so later rounds go deeper "
                "-> these floors are TIGHT (real bar is lower).",
        # Govt pool only (RIMS/JNIMS/CMC). Worst admitted AIR per category, n>=10 only.
        #   NOTE: the raw SC row sits at AIR 128,070 — *ahead of* the Gen closing (140,838). A state SC
        #   pool closing tighter than Gen is not a real cutoff, it is a single lucky allotment in a
        #   1-person sample. Publishing it would tell an SC student they need MORE marks than a
        #   General student, which is exactly backwards. Dropped.
        "mbbs": {"Gen": round(marks_at_air(140838)), "OBC": round(marks_at_air(224197))},
        "bds":  {},
    },
}

rows_out = []
print(f"{'state':20} {'cat':9} {'MBBS25':>7} {'MBBS26':>7} {'BDS25':>6} {'BDS26':>6}")
print("-"*62)
for state, d in DATA.items():
    for label in ROWS:
        q = QUAL[QCAT[label]]
        m25 = d["mbbs"].get(label); b25 = d["bds"].get(label)
        # Mizoram is derived from a 2026 merit list, so its number is ALREADY on the 2026 scale.
        # Applying the 2025->2026 difficulty shift to it would inflate it a second time. 2025 stays
        # blank for that state because we genuinely have no 2025 observation.
        direct26 = d.get("mbbs_2026_direct", {}).get(label)
        if direct26:
            m25v, m26v = "", max(direct26, q)
        else:
            m25v = max(m25, q) if m25 else q
            m26v = max(proj(m25), q) if m25 else q
        b25v = max(b25, q) if b25 else q
        b26v = max(proj(b25), q) if b25 else q
        rows_out.append({"state": state, "category": label, "B2b_qualifying_marks_2026": q,
                         "B1a_MBBS_marks_2025": m25v, "B1a_MBBS_AIR_2025": "",
                         "B1a_MBBS_marks_2026est": m26v, "B1a_MBBS_AIR_2026est": "",
                         "B1b_BDS_marks_2025": b25v, "B1b_BDS_AIR_2025": "",
                         "B1b_BDS_marks_2026est": b26v, "B1b_BDS_AIR_2026est": "",
                         "confidence": d["conf"], "notes": d["note"]})
        if not label.startswith("PwD"):
            print(f"{state:20} {label:9} {m25v:>7} {m26v:>7} {b25v:>6} {b26v:>6}")
    print()

outp = OUT / "ne_matrix_final.csv"
cols = ["state", "category", "B2b_qualifying_marks_2026", "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025",
        "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
        "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est", "confidence", "notes"]
with open(outp, "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore"); w.writeheader(); w.writerows(rows_out)
print(f"wrote {len(rows_out)} rows ({len(DATA)} NE states) -> {outp}")
