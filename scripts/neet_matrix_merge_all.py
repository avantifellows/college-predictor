#!/usr/bin/env python3
"""
Merge every per-state track into THE single deliverable sheet:
    scripts/neet_matrix_out/neet_2026_matrix_all.csv

Surya: "why are u creating new file.. we already have a file na" -> this script rewrites the ONE
existing sheet in place. It never creates a parallel deliverable.
And: "the idea is to put up the states and UTs and be as honest about sources and truthfulness",
"those that we dont have.. leave as blank" -> every one of the 36 states/UTs appears, and the ones
we cannot source honestly are emitted as BLANK rows carrying the reason.

PRECEDENCE (highest first) — this matters, because several states appear in more than one file:
  1. Purpose-built official/OCR builders (ne_, dl_, pd_, ch_, and the 22 already-merged states)
  2. smallstates_matrix_final.csv — third-party derived; used ONLY for states with no better source.
Manipur/Meghalaya/Nagaland/Arunachal/Delhi/Puducherry/Chandigarh all exist in smallstates, but we
now hold OFFICIAL documents for them, so the smallstates rows for those are DISCARDED.

`data_status` is the honesty column. `source_round` says which round the cutoff came from, so a
reader can see why some states look generous (later rounds close deeper) and others strict (R1/R2).
"""
import csv
from pathlib import Path

OUT = Path(__file__).resolve().parent / "neet_matrix_out"
SHEET = OUT / "neet_2026_matrix_all.csv"

COLS = ["state", "category", "B2b_qualifying_marks_2026",
        "B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025", "B1a_MBBS_marks_2026est", "B1a_MBBS_AIR_2026est",
        "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025", "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est",
        "source_round", "data_status"]

ROWS = ["Gen", "Gen-EWS", "OBC", "SC", "ST", "PwD-Gen", "PwD-EWS", "PwD-OBC", "PwD-SC", "PwD-ST"]
QUAL = {"Gen": 213, "Gen-EWS": 213, "OBC": 177, "SC": 177, "ST": 177,
        "PwD-Gen": 194, "PwD-EWS": 194, "PwD-OBC": 177, "PwD-SC": 177, "PwD-ST": 178}

# ---------------------------------------------------------------- new tracks
# (state -> (source_round, data_status)) for the tracks being added in this pass.
NEW = {
    "Delhi": ("R1+R3 union (MCC)",
              "VERIFIED — OUR official MCC data, Seat Type='Delhi University Quota' (MAMC/UCMS/LHMC "
              "+ Maulana Azad Dental). AIR-native. Only 3 colleges; AIIMS/VMMC/ABVIMS/BSA are central, "
              "not in this pool."),
    "Puducherry": ("R1+R3 union (MCC)",
                   "VERIFIED — OUR official MCC data, Seat Type='Internal -Puducherry UT Domicile' "
                   "(JIPMER). Sparse pools make EWS/ST look odd; reproduced from official rows, real."),
    "Chandigarh": ("Final admitted list",
                   "VERIFIED — official GMCH-32 admitted-student register (marks AND AIR per student). "
                   "Third-party claimed UR 588; official closing is 514 — third-party discarded."),
    "Arunachal Pradesh": ("R1 allotment",
                          "INDICATIVE — official APDHTE R1 text PDF, clean. ONLY ONE CATEGORY EXISTS "
                          "(Cat-I = APST); no Gen/OBC/SC split in the source, so only ST is populated. "
                          "Seats: TRIHMS + nominations to RIMS Imphal / Agartala."),
    "Meghalaya": ("Final selected list",
                  "INDICATIVE — OCR of official H&FW Order Health.189/2025/66. WAITING-LIST rows "
                  "excluded (they are not admissions). Gen 477 is an UPPER BOUND (2 selected rows lost "
                  "their score to OCR). ST uses the Garo block (deeper of the 2 tribal pools)."),
    "Nagaland": ("Final selected list",
                 "INDICATIVE / PARTIAL — OCR of rotated DTE scan; only ~12 of 66+ rows recovered, so "
                 "the TRUE FLOOR IS LOWER than shown (this over-states the bar). Seats are GoI CENTRAL "
                 "POOL nominations, not a Nagaland-college quota."),
    "Mizoram": ("Final admitted register",
                "VERIFIED — official ZMCH 2025 ADMITTED-STUDENT register (NMC return published by Zoram "
                "Medical College as page images): real students, NEET marks per student. ST n=62 closing "
                "335 = the Mizoram state quota (68 of ZMCH's 70 seats are ST). NRI rows (133-425, fee "
                "Rs 17.76L) and one PwBD row (154) excluded. The General/OBC/SC rows (443-535, "
                "non-Mizoram names) are 15% ALL-INDIA QUOTA seats at ZMCH, not state-quota floors, so "
                "they are not published as Mizoram rows. No govt BDS in Mizoram (all 12 BDS seats are "
                "outside the state). NOTE: this REPLACED a seat-count estimate of 435 that was 100 marks "
                "too high."),
    "Tripura": ("R1 only (strict)",
                "INDICATIVE / PARTIAL — official TRMCC R1 allotment PDF (18.08.2025), OCR'd, 59% line "
                "recovery. GOVT = AGMC Agartala ONLY; TMC/BRAM is a society college whose ST seats run "
                "to 118-168 marks (below the national qualifying floor) and is excluded. Marks-native. "
                "Thin: OBC n=2, SC n=3, ST n=3. Gen/EWS blank — AGMC Gen rows exist in the PDF but OCR "
                "split their institute token, so no verified Gen closing. R1 -> runs TIGHT."),
    "Ladakh": ("Final selected list (Annexure A)",
               "INDICATIVE — official DHS Ladakh notification (22.10.2025), 'Ladakh Central Pool MBBS & "
               "BDS Seats 2025-26'. NO college in the UT; this is its OWN GoI Central Pool nomination "
               "quota. Marks-native. Only 9 selected candidates -> tiny pool. Pools are Leh/Kargil x "
               "Open/Female (district-domicile), not Gen/OBC/SC/ST — floor reported on the Gen row. "
               "Waiting list (Annexure B) excluded: its top scorer (418) outranks two ADMITTED "
               "candidates, and it is labelled 2024-25."),
    "Manipur": ("R2 allotment",
                "INDICATIVE — OCR of official R2 Annexure-A, govt pool (RIMS/JNIMS/CMC; SAHS private "
                "excluded). Gen n=10, OBC n=17. SC (n=1) and ST (n=2) too thin -> left at qualifying. "
                "R2 is mid-counselling so later rounds go deeper: these floors are TIGHT."),
}
NEW_FILES = {"Delhi": "dl", "Puducherry": "pd", "Chandigarh": "ch"}

# --------------------------------------------------- states/UTs with NO data
# Honest blanks. Reason is carried in data_status so nobody mistakes blank for zero.
# ---------------------------------------------------------- NO SUCH QUOTA
# ★ Venu/Amogh flagged these as suspicious lows. They were NOT cutoffs at all: the state simply does
#   not operate that category, so the cell fell back to the national qualifying floor (177/213) and
#   READ LIKE A CUTOFF. Same number, completely different meaning — the single most misleading thing
#   in the sheet (5 of the 9 rows they queried). Fix: emit the cutoff cells BLANK and say so.
#   Each entry verified in that state's own raw source, not assumed:
#     Punjab   ST  — 199 rows / 18 categories (Open, EWS, Backward Classes, SC, Border Area,
#                    Sports, Riots-Affected, Defence...): ZERO ST rows. No notified STs in the state.
#     Haryana  ST  — 2,213 allotments / 27 category codes (OPEN_CAT, BCA, BCB, EWS, SC,
#                    SC_DEPRIVED...): ZERO ST rows. Same structural reason as Punjab.
#     Odisha   OBC — 1,940 allotments, categories are exactly GN / EW / SC / ST. No OBC in the state
#                    quota (matches the OBC/SEBC policy note: 27% OBC applies to AIQ, not state).
#     TN       EWS — 8,165 allotments: BC / MBC&DNC / OC / BCM / SC / SCA / ST. TN runs its own
#                    communal reservation and never implemented the 10% EWS quota.
#     Himachal EWS — HP R3 source carries a single EWS row: no meaningful EWS pool.
NO_QUOTA = {
    ("Punjab", "ST"): "NO ST QUOTA in Punjab state counselling (verified: 0 ST rows in 199-row "
                      "official source covering 18 categories). Not a cutoff — this door does not exist.",
    ("Haryana", "ST"): "NO ST QUOTA in Haryana state counselling (verified: 0 ST rows across 2,213 "
                       "allotments / 27 category codes). Not a cutoff — this door does not exist.",
    ("Odisha", "OBC"): "NO OBC QUOTA in Odisha state quota (verified: categories are GN/EW/SC/ST only "
                       "across 1,940 allotments). 27% OBC applies to AIQ, not the state pool.",
    ("Tamil Nadu", "Gen-EWS"): "NO EWS QUOTA in Tamil Nadu (verified: 8,165 allotments use BC/MBC&DNC/"
                               "OC/BCM/SC/SCA/ST). TN runs its own communal reservation instead.",
    ("Himachal Pradesh", "Gen-EWS"): "NO MEANINGFUL EWS POOL in HP counselling (source carries a "
                                     "single EWS row).",
}

# ------------------------------------------------------- POOL BELOW THE GATE
# The only NON-PwD cell in the whole sheet that closed at/below the national qualifying floor.
# (All the other such cells are PwD rows, which we deliberately set to qualifying everywhere.)
# Uttarakhand has 5 govt colleges and its ST pool is a SINGLE seat closing past AIR 1,091,883 — i.e.
# below the gate. With n=1 that is not a floor, it is one student. Blanked rather than published.
THIN_POOL = {
    ("Uttarakhand", "ST"): "POOL TOO THIN TO PUBLISH — Uttarakhand has 5 govt colleges and the ST "
                           "pool is effectively ONE seat, closing past AIR 1,091,883 (below the "
                           "national qualifying gate). n=1 is not a floor. Treat as AIQ-only.",
}

BLANK = {
    "Sikkim": "NO GOVT MEDICAL COLLEGE — only SMIMS (private). No state govt quota to report.",
    "Lakshadweep": "NO MEDICAL COLLEGE. Seats are central-pool nominations only.",
    "Goa": "1 govt college (GMC Bambolim). No official 2025 allotment PDF sourced; only third-party "
           "figures exist, which we do not publish unverified.",
    "Andaman & Nicobar": "1 govt college (ANIIMS). Tiny UT pool; no official 2025 list sourced.",
    "Dadra & Nagar Haveli and Daman & Diu": "1 govt college (NAMO MC, Silvassa). No official 2025 "
           "list sourced; third-party only.",
    "Nagaland (BDS)": None,  # placeholder removed below
}
BLANK.pop("Nagaland (BDS)")

ALL_STATES_UTS = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
    "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman & Nicobar", "Chandigarh", "Dadra & Nagar Haveli and Daman & Diu", "Delhi",
    "Jammu & Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
]

# ---------------------------------------------------------------- load
# ★ IDEMPOTENCE: this script REWRITES the sheet it reads, so a second run would otherwise append the
#   new tracks on top of themselves (first re-run produced 520 rows / duplicate blocks for 15 tracks).
#   Drop any state this pass is responsible for, then re-add it. Safe to run repeatedly.
OWNED = set(NEW) | set(BLANK)
existing = [r for r in csv.DictReader(open(SHEET)) if r["state"] not in OWNED]
merged = [dict(r) for r in existing]          # the already-verified tracks stay untouched

def add(rows, state, rnd, status):
    for r in rows:
        if r["state"] != state:
            continue
        o = {c: r.get(c, "") for c in COLS}
        o["state"], o["source_round"], o["data_status"] = state, rnd, status
        merged.append(o)

for state, key in NEW_FILES.items():
    src = list(csv.DictReader(open(OUT / f"{key}_matrix_final.csv")))
    add(src, state, *NEW[state])

ne = list(csv.DictReader(open(OUT / "ne_matrix_final.csv")))
for state in ["Arunachal Pradesh", "Meghalaya", "Nagaland", "Manipur", "Ladakh", "Tripura", "Mizoram"]:
    add(ne, state, *NEW[state])

for state, reason in BLANK.items():
    for cat in ROWS:
        merged.append({"state": state, "category": cat,
                       "B2b_qualifying_marks_2026": QUAL[cat],
                       "B1a_MBBS_marks_2025": "", "B1a_MBBS_AIR_2025": "",
                       "B1a_MBBS_marks_2026est": "", "B1a_MBBS_AIR_2026est": "",
                       "B1b_BDS_marks_2025": "", "B1b_BDS_AIR_2025": "",
                       "B1b_BDS_marks_2026est": "", "B1b_BDS_AIR_2026est": "",
                       "source_round": "", "data_status": "NO DATA — " + reason})

# ------------------------------------------- blank out non-existent / unpublishable cells
# Runs AFTER the merge so it applies no matter which builder produced the row.
CUTOFF_CELLS = ["B1a_MBBS_marks_2025", "B1a_MBBS_AIR_2025", "B1a_MBBS_marks_2026est",
                "B1a_MBBS_AIR_2026est", "B1b_BDS_marks_2025", "B1b_BDS_AIR_2025",
                "B1b_BDS_marks_2026est", "B1b_BDS_AIR_2026est"]
n_noq = n_thin = 0
for r in merged:
    key = (r["state"], r["category"])
    note = NO_QUOTA.get(key) or THIN_POOL.get(key)
    if not note:
        continue
    for c in CUTOFF_CELLS:
        r[c] = ""
    # keep B2b: the national qualifying floor still applies to that candidate, it just isn't a cutoff
    r["data_status"] = ("N/A — " + note) if key in NO_QUOTA else ("BLANKED — " + note)
    n_noq += key in NO_QUOTA
    n_thin += key in THIN_POOL

# ---------------------------------------------------------------- checks
order = {s: i for i, s in enumerate(["All India"] + ALL_STATES_UTS)}
merged.sort(key=lambda r: (order.get(r["state"], 999), ROWS.index(r["category"])
                           if r["category"] in ROWS else 99))

seen = {r["state"] for r in merged}
missing = [s for s in ALL_STATES_UTS if s not in seen]
dupes = [s for s in seen if sum(1 for r in merged if r["state"] == s) != 10]

# ordering sanity: within a state, Gen should not be EASIER than a reserved category
bad = []
for s in seen:
    d = {r["category"]: r for r in merged if r["state"] == s}
    g = d.get("Gen", {}).get("B1a_MBBS_marks_2025")
    if not g: continue
    for c in ["OBC", "SC", "ST"]:
        v = d.get(c, {}).get("B1a_MBBS_marks_2025")
        if v and int(v) > int(g):
            bad.append(f"{s}: {c} {v} > Gen {g}")

with open(SHEET, "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=COLS, extrasaction="ignore")
    w.writeheader(); w.writerows(merged)

# No NON-PwD cell may sit at/below the national qualifying gate: that means the pool closed below
# the gate, which is either a thin/one-seat pool or a contaminated (private) row — never a real floor.
below_gate = []
for r in merged:
    if r["category"].startswith("PwD"):
        continue                      # PwD rows are qualifying BY DESIGN
    for mk in ["B1a_MBBS_marks_2025", "B1b_BDS_marks_2025"]:
        air = mk.replace("marks", "AIR")
        if r[mk] and r[air] and int(r[mk]) <= int(r["B2b_qualifying_marks_2026"]):
            below_gate.append(f"{r['state']}/{r['category']}/{mk.split('_')[1]} = {r[mk]} @ AIR {r[air]}")

# A state is "with data" if ANY category has a real MBBS floor. Blanking a single non-existent
# quota (e.g. Punjab ST) must NOT make the whole state look uncovered.
populated = sorted({r["state"] for r in merged if r["B1a_MBBS_marks_2025"]})
blanks = sorted({r["state"] for r in merged} - set(populated))
print(f"sheet: {len(merged)} rows / {len(seen)} tracks -> {SHEET}")
print(f"\nWITH DATA ({len(populated)}): " + ", ".join(populated))
print(f"\nBLANK   ({len(blanks)}): " + ", ".join(blanks))
print(f"\nmissing from sheet: {missing or 'none — all 36 states/UTs + All India present'}")
print(f"tracks without exactly 10 rows: {dupes or 'none'}")
print(f"category-ordering violations: {bad or 'none'}")
print(f"blanked: {n_noq} no-quota cells, {n_thin} too-thin cells")
print(f"non-PwD cells at/below qualifying gate: {below_gate or 'none'}")
