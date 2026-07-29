#!/usr/bin/env python3
"""
Collect EVERY source file the NEET-2026 matrix is built from into one upload-ready folder.

Surya: "can u put all source files you've used in one folder.. that i can just upload to google
drive... whatever source pdf or source csv you've used.. and name it appropriately..
maharashtra-round-1 etc... i am expecting there to be like 25-30 files.. it could come from my end
or that dropbox end"

NAMING: <state-or-scope>-<year>-<what-it-is>.<ext>, lowercase, hyphenated, so the folder sorts
readably and each filename says what the document IS without opening it.

PROVENANCE TAGS in the manifest:
  OFFICIAL  = the counselling authority's / college's own published document (best)
  OURS      = our consolidated extract (public/data/NEETUG) or a raw PDF we parsed ourselves
  DROPBOX   = Amogh's pipeline output (their parse of a state's counselling data)
Only files that a builder or parser ACTUALLY reads are copied. Nothing is invented.
"""
import csv
import hashlib
import shutil
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DEST = REPO / "neet_2026_matrix_sources"
DB = "amogh-csv/medical-state-counselling"
DBX = f"{DB}/extracted_data"

# (source_path, dest_name, provenance, what it is / how it is used)
FILES = [
    # ---------------------------------------------------------------- national / model
    ("public/data/NEETUG/NEETUG.json", "00-ALL-consolidated-cutoffs-ours.json", "OURS",
     "Our consolidated 2025 cutoff extract (10,298 rows). Carries aiq_2025_cutoffs (AIQ/MCC, incl. "
     "the Delhi-University-Quota and Puducherry-UT-Domicile seat types) plus our own parses for "
     "MH/GJ/KL/MP/PB/TG/WB/AP/RJ/HR/OD. Primary source for 12+ tracks."),
    ("public/data/NEETUG/score_rank_model.json", "00-ALL-score-to-rank-model-2025.json", "OURS",
     "Fitted 2025 NEET marks<->AIR curve (deg-4 poly, 32,093 real pairs). Used to convert every "
     "AIR-native closing into marks. Validated against 4 states' official marks (TN, MP, HR, TR)."),
    ("scripts/neet_matrix_out/shift_2026.json", "00-ALL-2026-difficulty-shift.json", "OURS",
     "The 2025->2026 marks shift model (delta = 0.085 * max(0, 720 - m)) used to project all 2026 estimates."),
    ("neet_pdfs/aiq_r1.pdf", "aiq-2025-round1-cutoffs-OFFICIAL.pdf", "OFFICIAL",
     "MCC All-India-Quota Round 1 closing ranks 2025 (national AIR)."),
    ("neet_pdfs/aiq.pdf", "aiq-2025-round3-cutoffs-OFFICIAL.pdf", "OFFICIAL",
     "MCC All-India-Quota Round 3 closing ranks 2025."),
    (f"amogh-csv/medical-national-ranks/extracted_data/govt_medical_closing_ranks_r1_2025.csv",
     "aiq-2025-govt-closing-ranks-dropbox.csv", "DROPBOX",
     "AIQ govt-college closing ranks + the NMC/DCI seat matrix that gives our govt-college roster."),

    # ---------------------------------------------------------------- states: our own raw PDFs
    ("neet_pdfs/maharashtra.pdf", "maharashtra-2025-round3-final-cutoffs-OFFICIAL.pdf", "OURS",
     "Maharashtra CET Cell state-quota R3 (final) cutoffs. Source of the MH track."),
    ("neet_pdfs/gujarat.pdf", "gujarat-2025-round3-final-cutoffs-OFFICIAL.pdf", "OURS",
     "Gujarat ACPUGMEC R3 (final). GMERS counted as govt; private-with-govt-quota excluded."),
    ("neet_pdfs/karnataka.pdf", "karnataka-2025-round3-cutoffs-OFFICIAL.pdf", "OURS",
     "Karnataka KEA R3 cutoffs."),
    ("neet_pdfs/kerala.pdf", "kerala-2025-phase3-final-cutoffs-OFFICIAL.pdf", "OURS",
     "Kerala CEE Phase-3 (final) allotment cutoffs."),
    ("neet_pdfs/kerala_ranklist.pdf", "kerala-2025-state-rank-list-OFFICIAL.pdf", "OURS",
     "Kerala CEE merit list — the state-rank -> AIR bridge for Kerala."),
    ("neet_pdfs/mp.pdf", "madhya-pradesh-2025-round1-cutoffs-OFFICIAL.pdf", "OURS",
     "MP DME R1 cutoffs (runs strict). Carries closing_neet marks -> validated our model to +/-1."),
    ("neet_pdfs/punjab.pdf", "punjab-2025-round2-cutoffs-OFFICIAL.pdf", "OURS",
     "Punjab BFUHS R2 cutoffs. NOTE: Punjab has NO ST quota (18 categories, 0 ST rows)."),
    ("neet_pdfs/telangana.pdf", "telangana-2025-mopup-final-cutoffs-OFFICIAL.pdf", "OURS",
     "Telangana KNRUHS mop-up (loosest round) cutoffs."),
    ("neet_pdfs/tg_meritlist.pdf", "telangana-2025-merit-list-OFFICIAL.pdf", "OURS",
     "Telangana merit list — one of the 3 sources behind the 32k-pair score<->rank calibration."),
    ("neet_pdfs/westbengal.pdf", "west-bengal-2025-round1-cutoffs-OFFICIAL.pdf", "OURS",
     "WB WBMCC R1 cutoffs (runs strict)."),
    ("neet_pdfs/andhra.pdf", "andhra-pradesh-2025-round3-final-cutoffs-OFFICIAL.pdf", "OURS",
     "Andhra NTRUHS R3 (final). SC = median of SC1/2/3; OBC = median of BCA-BCE."),
    ("neet_pdfs/himachal.pdf", "himachal-2025-round3-final-cutoffs-OFFICIAL.pdf", "OURS",
     "Himachal AtoM R3 (final). Only 6 govt colleges; no meaningful EWS pool."),

    # ---------------------------------------------------------------- states: official PDFs we parsed ourselves
    ("amogh-csv/haryana-neet-ug-2025-round1-allotment.pdf",
     "haryana-2025-round1-allotment-OFFICIAL.pdf", "OFFICIAL",
     "DMER Haryana R1 allotment, 234pp. MARKS-native + AIR -> independently validated our model "
     "(mean +0.86, sd 2.39). Only 'Allotted' rows are real (2,213 of 7,595). NO ST quota."),
    ("amogh-csv/599136R1 Allotment 2025.pdf", "rajasthan-2025-round1-allotment-OFFICIAL.pdf", "OFFICIAL",
     "Rajasthan R1 allotment, 299pp. Govt vs private is stated IN the data via '(Govt. Seat)' "
     "vs '(Gen./Mgmt./NRI Seat)' — 31 govt colleges."),
    ("amogh-csv/rajasthan-neet-merit-list.pdf", "rajasthan-2025-merit-list-OFFICIAL.pdf", "OFFICIAL",
     "Rajasthan NEET merit list (companion to the allotment above)."),
    ("amogh-csv/191568Odisha R3 MBBS Cutoff 2025.pdf",
     "odisha-2025-round3-mbbs-cutoff-OFFICIAL.pdf", "OFFICIAL",
     "Odisha OJEE R3 MBBS cutoffs (state ranks). Categories are GN/EW/SC/ST only — NO OBC in state quota."),
    ("amogh-csv/2025072943.pdf", "odisha-2025-merit-list-rank-bridge-OFFICIAL.pdf", "OFFICIAL",
     "Odisha merit list, 150pp -> the 5,817-pair State-rank <-> NEET-AIR bridge that makes OD usable."),
    ("amogh-csv/chandigarh-gmch32-2025-admitted-list.pdf",
     "chandigarh-2025-gmch32-admitted-register-OFFICIAL.pdf", "OFFICIAL",
     "GMCH-32 admitted-student register: marks AND AIR per admitted student. Disproved a "
     "third-party UR figure of 588 (official closing is 514)."),
    (f"{DB}/source/JH/JH_R1_2025.pdf", "jharkhand-2025-round1-allotment-OFFICIAL.pdf", "OFFICIAL",
     "Jharkhand JCECEB R1. Re-parsed by us: their parser read the wrong column (off-by-one)."),
    (f"{DB}/source/JH/JH_R3_2025.pdf", "jharkhand-2025-round3-allotment-OFFICIAL.pdf", "OFFICIAL",
     "Jharkhand JCECEB R3. MARKS-native ('NEET Score' column)."),

    # ---------------------------------------------------------------- NE states + small UTs (official)
    ("amogh-csv/tripura-2025-r1-allotment.pdf", "tripura-2025-round1-allotment-OFFICIAL.pdf", "OFFICIAL",
     "TRMCC R1 allotment (18.08.2025), 27pp scan. NEET Rank AND Marks per candidate. GOVT = AGMC "
     "only: TMC/BRAM is a society college whose ST seats reach 118-168 marks (below the qualifying gate)."),
    ("amogh-csv/arunachal-2025-r1-allotment.pdf", "arunachal-2025-round1-allotment-OFFICIAL.pdf", "OFFICIAL",
     "APDHTE R1 allotment, clean text PDF, 718 rows. ONLY ONE CATEGORY EXISTS (Cat-I = APST)."),
    ("amogh-csv/meghalaya-2025-mbbs-selected-list.pdf",
     "meghalaya-2025-selected-list-OFFICIAL.pdf", "OFFICIAL",
     "H&FW Order Health.189/2025/66. Marks printed directly. Khasi&Jaintia and Garo are SCHEDULED "
     "TRIBES. WAITING-LIST rows must be excluded (they are not admissions)."),
    ("amogh-csv/nagaland-2025-final-selected-list.pdf",
     "nagaland-2025-final-selected-list-OFFICIAL.pdf", "OFFICIAL",
     "DTE Nagaland final selected list (rotated scan; OCR recovered ~12 of 66+ rows). Allotment "
     "column reads 'GoI Central Pool' — nominations across India, not a state-college quota."),
    ("amogh-csv/manipur-2025-r2-state-quota-allotment.pdf",
     "manipur-2025-round2-state-quota-allotment-OFFICIAL.pdf", "OFFICIAL",
     "Manipur R2 Annexure-A. Govt = RIMS/JNIMS/CMC (SAHS is private). SC n=1 / ST n=2 too thin to publish."),
    ("amogh-csv/ladakh-2025-central-pool-selected-list.pdf",
     "ladakh-2025-central-pool-selected-list-OFFICIAL.pdf", "OFFICIAL",
     "DHS Ladakh notification (22.10.2025). No college in the UT — its OWN GoI Central Pool quota. "
     "Waiting list (Annexure B) excluded: its top scorer outranks two ADMITTED candidates."),
    ("amogh-csv/mizoram-2025-neet-seat-matrix.pdf", "mizoram-2025-seat-matrix-OFFICIAL.pdf", "OFFICIAL",
     "DHTE Mizoram 2025 seat matrix: MBBS 79 = ZMCH 70 + RIMS Imphal 7 + AGMC Agartala 2; ~98% ST; "
     "all 12 BDS seats are OUTSIDE the state."),
    ("amogh-csv/mizoram-2026-provisional-merit-list.pdf",
     "mizoram-2026-provisional-merit-list-OFFICIAL.pdf", "OFFICIAL",
     "DHTE Mizoram 2026 merit list (381 candidates w/ NEET scores). Kept as EVIDENCE ONLY — the "
     "seat-count estimate built from it (435) was 100 marks too high vs the admitted register."),

    # ---------------------------------------------------------------- Dropbox-pipeline states
    (f"{DBX}/AS_all_allotments_2025.csv", "assam-2025-allotments-dropbox.csv", "DROPBOX",
     "Assam raw allotments. Needed a score>=350 guard: their parse put score-150 candidates in UR seats."),
    (f"{DBX}/BR_closing_ranks_state_govt_2025.csv", "bihar-2025-round3-closing-ranks-dropbox.csv", "DROPBOX",
     "Bihar R3 revised closings. We removed 2 PRIVATE colleges (KMC Katihar, NMC Sasaram) from their govt list."),
    (f"{DBX}/CG_all_allotments_2025.csv", "chhattisgarh-2025-allotments-dropbox.csv", "DROPBOX",
     "Chhattisgarh raw R1+R2 allotments. Their summary file was STALE — we rebuilt from this raw file."),
    (f"{DBX}/HP_closing_ranks_state_govt_2025.csv", "himachal-2025-closing-ranks-dropbox.csv", "DROPBOX",
     "Himachal closings (cross-check for our own PDF above)."),
    (f"{DBX}/UP_closing_ranks_state_govt_2025.csv", "uttar-pradesh-2025-closing-ranks-dropbox.csv", "DROPBOX",
     "UP R1+R2+R3 closings. We EXCLUDED [PPP] colleges their parser wrongly tagged as govt."),
    (f"{DBX}/UK_closing_ranks_state_govt_2025.csv", "uttarakhand-2025-closing-ranks-dropbox.csv", "DROPBOX",
     "Uttarakhand R3 closings. Only 5 govt colleges; ST pool is 1 seat -> blanked as unpublishable."),
    (f"{DBX}/TN_closing_ranks_state_govt_2025.csv", "tamil-nadu-2025-closing-ranks-dropbox.csv", "DROPBOX",
     "TN through-R3 closings, MARKS-native (closing_tmark) -> no conversion. NO EWS category in TN."),
    (f"{DBX}/TN_all_allotments_2025.csv", "tamil-nadu-2025-allotments-dropbox.csv", "DROPBOX",
     "TN raw allotments (8,165). Confirms categories are BC/MBC&DNC/OC/BCM/SC/SCA/ST — no EWS."),
    (f"{DBX}/AP_closing_ranks_state_govt_2025.csv", "andhra-pradesh-2025-closing-ranks-dropbox.csv", "DROPBOX",
     "Andhra closings, incl. the BDS rows our own PDF lacked."),
    (f"{DBX}/TG_closing_ranks_state_govt_2025.csv", "telangana-2025-closing-ranks-dropbox.csv", "DROPBOX",
     "Telangana closings, incl. BDS."),
    (f"{DBX}/JK_closing_ranks_state_govt_2025.csv", "jammu-kashmir-2025-closing-ranks-dropbox.csv", "DROPBOX",
     "J&K closings. Open Merit = Gen; RBA/ALC/P&B are J&K-only quotas and are excluded."),
    (f"{DBX}/JK_meritlist_state_rank_air.csv", "jammu-kashmir-2025-rank-air-bridge-dropbox.csv", "DROPBOX",
     "J&K merit list state-rank -> AIR bridge."),
    (f"{DBX}/KA_closing_ranks_state_govt_2025.csv", "karnataka-2025-closing-ranks-dropbox.csv", "DROPBOX",
     "Karnataka R3 closings + the FEE-BASED govt classifier (their tag alone included private colleges)."),
    (f"{DBX}/national_closing_ranks_unified_AIR_2025.csv",
     "national-2025-unified-closing-ranks-thirdparty.csv", "DROPBOX",
     "Akshay's unified national file. USED ONLY as a cross-check — NOT as a source for any published "
     "row (all 12 states we tested were 100% third-party; 3 were incoherent). Kept for traceability."),
    (f"{DBX}/_round_multipliers_2025.csv", "national-2025-round-depth-multipliers-dropbox.csv", "DROPBOX",
     "Empirical R1->final round-depth multipliers (UR-Mid 1.22, OBC 1.05, EWS 1.06, SC 1.23, ST 1.05)."),
]

# Mizoram's admitted register is a folder of page images -> copied wholesale.
IMG_DIRS = [("amogh-csv/mizoram-zmch-2025-admitted",
             "mizoram-2025-zmch-admitted-register-OFFICIAL", "OFFICIAL",
             "ZMCH's NMC admitted-student return, published as 10 page images. Marks per admitted "
             "student = GROUND TRUTH. Govt vs NRI (fee Rs 96,850 vs Rs 17.76L) and PwBD must be "
             "filtered; the General/OBC/SC rows are 15% AIQ seats, not Mizoram state quota.")]

DEST.mkdir(parents=True, exist_ok=True)
manifest, missing, total = [], [], 0
for src, name, prov, desc in FILES:
    p = REPO / src
    if not p.exists():
        missing.append(src); continue
    shutil.copy2(p, DEST / name)
    kb = p.stat().st_size / 1024
    total += p.stat().st_size
    manifest.append({"file": name, "provenance": prov, "size_kb": f"{kb:.0f}",
                     "original_path": src, "what_it_is": desc})

for src, dname, prov, desc in IMG_DIRS:
    d = REPO / src
    if not d.exists():
        missing.append(src); continue
    out = DEST / dname
    out.mkdir(exist_ok=True)
    n = 0
    for f in sorted(d.glob("*.png")):
        shutil.copy2(f, out / f.name); n += 1; total += f.stat().st_size
    manifest.append({"file": dname + f"/ ({n} images)", "provenance": prov,
                     "size_kb": "-", "original_path": src, "what_it_is": desc})

# ---------------------------------------------------------------- EXTRACTS
# The parsed/OCR'd output of every source we parsed OURSELVES, in an extracted/ subfolder so raw
# documents and derived data never get confused. Surya: "u haven't put the pdf ocr'ed extracted
# versions in here?" — these are the audit trail: diff them against the source PDF above.
EXTRACTS = [
    ("scripts/haryana_2025_out/hr_allotments_2025.csv", "haryana-2025-allotments-extracted.csv",
     "2,213 allotted rows (of 7,595 — only Remark='Allotted' are real). MARKS + AIR per student."),
    ("scripts/haryana_2025_out/hr_closing_2025.csv", "haryana-2025-closings-extracted.csv",
     "169 closings per college x category, derived from the allotments."),
    ("scripts/rajasthan_2025_out/rj_allotments_2025.csv", "rajasthan-2025-allotments-extracted.csv",
     "R1 allotments. Govt vs private is stated in the data ('(Govt. Seat)' vs '(Gen./Mgmt./NRI Seat)')."),
    ("scripts/rajasthan_2025_out/rj_closing_2025.csv", "rajasthan-2025-closings-extracted.csv",
     "Closings per college x category; horizontal PwD/EXS/WPP recorded separately and excluded."),
    ("scripts/rajasthan_2025_out/rj_meritlist_2025.csv", "rajasthan-2025-meritlist-extracted.csv",
     "Parsed Rajasthan merit list."),
    ("scripts/odisha_2025_out/od_allotments_2025.csv", "odisha-2025-allotments-extracted.csv",
     "1,940 R3 allotments. Categories are GN/EW/SC/ST only — proves there is NO OBC in OD state quota."),
    ("scripts/odisha_2025_out/od_closing_2025.csv", "odisha-2025-closings-extracted.csv",
     "74 closings per college x category (state ranks)."),
    ("scripts/odisha_2025_out/od_rank_air_bridge_2025.csv", "odisha-2025-rank-air-bridge-extracted.csv",
     "THE 5,817-pair State-rank <-> NEET-AIR bridge. Without this Odisha is unusable."),
    ("scripts/tripura_2025_out/tripura_2025_r1_allotments.csv", "tripura-2025-allotments-extracted.csv",
     "70 validated rows (59% line recovery) with NEET marks AND AIR; inst_type separates govt AGMC "
     "from society TMC and central RIMS."),
    ("scripts/mizoram_2025_out/zmch_2025_admitted.csv", "mizoram-2025-zmch-admitted-extracted.csv",
     "90 admitted students with NEET marks; Category=Govt/NRI and pwd flag are the filters that matter."),
    ("scripts/ne_ocr_out/MN_allotments_ocr.csv", "manipur-2025-allotments-extracted.csv",
     "40 OCR'd R2 rows; institute separates govt RIMS/JNIMS/CMC from private SAHS."),
    ("scripts/ne_extracts_out/AR_2025_allotments.csv", "arunachal-2025-allotments-extracted.csv",
     "101 rows, all Cat-I (APST). pwd flag matters: the 2 deepest MBBS rows are PwD (AIR 1.23M/847k); "
     "the merit floor is AIR 208,132."),
    ("scripts/ne_extracts_out/ML_2025_selected_list.csv", "meghalaya-2025-selected-list-extracted.csv",
     "PARTIAL (24 of ~100 rows). Carries the SELECTED-vs-WAITING split. The matrix uses the fuller "
     "hand-verified floors (Open 477 / Khasi 357 / Garo 214 / SC 396) which are in the source but too "
     "OCR-damaged for the strict regex."),
    ("scripts/ne_extracts_out/NL_2025_selected_list.csv", "nagaland-2025-selected-list-extracted.csv",
     "PARTIAL — heavily degraded rotated scan. Serial numbers prove the list runs to 63+ rows, so the "
     "true floor is LOWER than anything recovered here."),
]
exdir = DEST / "extracted"
exdir.mkdir(exist_ok=True)
for src, name, desc in EXTRACTS:
    p2 = REPO / src
    if not p2.exists():
        missing.append(src); continue
    shutil.copy2(p2, exdir / name)
    total += p2.stat().st_size
    manifest.append({"file": "extracted/" + name, "provenance": "EXTRACT",
                     "size_kb": f"{p2.stat().st_size/1024:.0f}", "original_path": src,
                     "what_it_is": desc})

# Per-state matrix blocks (one 10-row block per state) — the intermediate between extract and sheet.
mxdir = DEST / "extracted" / "per-state-matrix-blocks"
mxdir.mkdir(parents=True, exist_ok=True)
n_mx = 0
for f in sorted((REPO / "scripts/neet_matrix_out").glob("*_matrix_final.csv")):
    shutil.copy2(f, mxdir / f.name); n_mx += 1; total += f.stat().st_size
manifest.append({"file": f"extracted/per-state-matrix-blocks/ ({n_mx} files)", "provenance": "EXTRACT",
                 "size_kb": "-", "original_path": "scripts/neet_matrix_out/*_matrix_final.csv",
                 "what_it_is": "Per-state 10-row matrix blocks that the final sheet is assembled from."})

# The deliverable itself + the docs that explain it, so the folder is self-contained.
for src, name in [
    ("scripts/neet_matrix_out/neet_2026_matrix_all.csv", "ZZ-DELIVERABLE-neet-2026-matrix-all.csv"),
    ("docs/NEET_STATE_COVERAGE.md", "ZZ-README-state-coverage-summary.md"),
    ("docs/NEET_2026_MATRIX_DECISIONS.md", "ZZ-README-full-provenance-decisions.md"),
    ("docs/NEET_SOURCE_OF_TRUTH.md", "ZZ-README-source-of-truth-ledger.md"),
]:
    p = REPO / src
    if p.exists():
        shutil.copy2(p, DEST / name)
        manifest.append({"file": name, "provenance": "OUTPUT", "size_kb": f"{p.stat().st_size/1024:.0f}",
                         "original_path": src, "what_it_is": "The matrix itself / the docs explaining it."})

with open(DEST / "MANIFEST.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=["file", "provenance", "size_kb", "original_path", "what_it_is"])
    w.writeheader(); w.writerows(manifest)

print(f"collected {len(manifest)} entries -> {DEST}  ({total/1024/1024:.0f} MB)")
from collections import Counter
print("by provenance:", dict(Counter(m["provenance"] for m in manifest)))
if missing:
    print(f"\n!! MISSING ({len(missing)}) — referenced but not on disk:")
    for m in missing: print("   ", m)
