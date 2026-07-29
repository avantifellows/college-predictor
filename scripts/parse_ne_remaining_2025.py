#!/usr/bin/env python3
"""
Parsers for the three NE states whose numbers were previously HAND-READ into the matrix builder.

WHY THIS EXISTS (Surya caught this):
  Arunachal / Meghalaya / Nagaland numbers were typed straight into `neet_matrix_ne.py` after I read
  their PDFs interactively — no parser, no extract CSV, so nothing could re-derive or audit them.
  Every other state in the sheet has a reproducible path. This closes that gap: each state gets a
  real parser and a real CSV, so a reviewer can diff the extract against the source document.
  (The irony: Arunachal has a CLEAN TEXT LAYER and was the easiest of the six NE sources — it was the
  one left unparsed, because by then I was reading numbers straight off the page.)

SOURCES (all official, in amogh-csv/):
  AR  arunachal-2025-r1-allotment.pdf        apdhte.nic.in — TEXT pdf (no OCR needed)
  ML  meghalaya-2025-mbbs-selected-list.pdf  meghealth.gov.in Order Health.189/2025/66 — SCAN -> OCR
  NL  nagaland-2025-final-selected-list.pdf  dte.nagaland.gov.in — SCAN, rotated -> OCR (partial)

OUTPUT: scripts/ne_extracts_out/{AR,ML,NL}_2025_*.csv  + printed closings per category.
"""
import csv
import re
import subprocess
import tempfile
from collections import Counter, defaultdict
from pathlib import Path

import pdfplumber
from PIL import Image

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "ne_extracts_out"
OUT.mkdir(parents=True, exist_ok=True)


def ocr_page(page, rotate=0, res=300):
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tf:
        png = Path(tf.name)
    page.to_image(resolution=res).save(png)
    try:
        im = Image.open(png).convert("L")
        if rotate:
            im = im.rotate(rotate, expand=True)
        im.save(png)
        return subprocess.run(["tesseract", str(png), "-", "--psm", "6"],
                              capture_output=True, text=True, timeout=300).stdout
    finally:
        png.unlink(missing_ok=True)


# =============================================================== ARUNACHAL
# Clean text layer. Row shape:
#   <StateRank> <NEETRoll(10)> <NAME> <Cat-I> <ChoiceNo> <COURSE> <College...> <STATE> <AllIndiaRank>
# The college name wraps onto the PREVIOUS line, so we anchor on the data line and only need the
# trailing All India Rank + the course + a college token found anywhere on the line.
# The PWD Status column sits between Name and Category and is usually EMPTY, but is "PWD*" for
# PwD candidates — so it must be optional in the pattern, and captured, because PwD is a HORIZONTAL
# sub-pool we exclude from base floors everywhere. (Arunachal's two deepest MBBS rows are PwD at AIR
# 1,228,361 and 847,259; the deepest MERIT row is AIR 208,132. Ignoring PwD here would have moved the
# Arunachal floor by ~180 marks.)
AR_ROW = re.compile(
    r"^(\d{1,4})\s+(\d{10})\s+(.+?)\s*(PWD\*?)?\s+(Cat-[IVX]+)\s+(\d)\s+(MBBS|BDS)\s+(.*?)\s+(\d{3,7})\s*$")
AR_COLLEGES = [(r"TRIHMS|Tomo Riba", "TRIHMS Naharlagun", "ARUNACHAL PRADESH"),
               (r"RIMS,?\s*Imphal", "RIMS Imphal", "MANIPUR"),
               (r"Agartala", "AGMC Agartala", "TRIPURA"),
               (r"NEIGRIHMS", "NEIGRIHMS Shillong", "MEGHALAYA")]


def parse_arunachal():
    pdf = REPO / "amogh-csv/arunachal-2025-r1-allotment.pdf"
    rows, rejected = [], Counter()
    with pdfplumber.open(pdf) as d:
        for page in d.pages:
            for raw in (page.extract_text() or "").split("\n"):
                line = " ".join(raw.split())
                m = AR_ROW.match(line)
                if not m:
                    if re.match(r"^\d{1,4}\s+\d{10}\s", line):
                        rejected["row shape not matched"] += 1
                    continue
                srank, roll, name, pwd, cat, choice, course, coll, air = m.groups()
                inst = next((c[1] for c in AR_COLLEGES if re.search(c[0], coll or "", re.I)), "")
                inst_state = next((c[2] for c in AR_COLLEGES if re.search(c[0], coll or "", re.I)), "")
                rows.append({"state_rank": int(srank), "neet_roll": roll, "name": name.strip(),
                             "pwd": "Y" if pwd else "", "category": cat, "choice_no": choice,
                             "program": course, "institute": inst or (coll or "").strip()[:40],
                             "institute_state": inst_state, "neet_air": int(air)})
    return rows, rejected


# =============================================================== MEGHALAYA
# Scan. Blocks: "OPEN CATEGORY", "KHASI & JAINTIA CATEGORY", "GARO CATEGORY", "ST/SC Category",
# each followed by a SELECTED list and then a "WAITING LIST" that must be excluded.
# Rows print the NEET SCORE directly (marks-native). OCR loses some names/scores; we keep what
# validates and count the rest.
ML_BLOCKS = [(r"OPEN\s+CATEGORY", "OPEN", "Gen"),
             (r"KHASI\s*&?\s*JAINTIA", "KHASI & JAINTIA", "ST"),
             (r"GARO\s+CATEGORY", "GARO", "ST"),
             (r"ST\s*/\s*SC\s+CATEGORY", "ST/SC", "SC")]


def parse_meghalaya():
    pdf = REPO / "amogh-csv/meghalaya-2025-mbbs-selected-list.pdf"
    rows, rejected = [], Counter()
    block, matrix_cat, in_waiting = "", "", False
    with pdfplumber.open(pdf) as d:
        for page in d.pages:
            for raw in ocr_page(page, res=250).split("\n"):
                line = " ".join(raw.split())
                if not line:
                    continue
                for pat, bname, mcat in ML_BLOCKS:
                    if re.search(pat, line, re.I):
                        block, matrix_cat, in_waiting = bname, mcat, False
                        break
                # ★ the waiting list is NOT admissions — the Order nominates them only if a selected
                #   candidate fails to report. Everything after this header (until the next block) is out.
                if re.search(r"WAITING\s*LIST", line, re.I):
                    in_waiting = True
                    continue
                if not block:
                    continue
                # a selected row: "<sl> <Name> <score> ..." — score is a 3-digit NEET mark
                m = re.match(r"^\|?\s*(\d{1,3})[.)|]?\s+([A-Za-z][A-Za-z .'\-]{3,40})\s+(\d{3})\b", line)
                if not m:
                    continue
                sl, name, score = m.groups()
                score = int(score)
                if not (100 <= score <= 720):
                    rejected["implausible score"] += 1
                    continue
                rows.append({"block": block, "matrix_category": matrix_cat,
                             "list": "WAITING" if in_waiting else "SELECTED",
                             "sl": int(sl), "name": name.strip(), "neet_marks": score})
    return rows, rejected


# =============================================================== NAGALAND
# Rotated scan (270 deg works). "STATE RESERVED SEATS" allotted via **GoI Central Pool** to colleges
# across India. Category column is the candidate's TRIBE -> all map to ST.
# ⚠ OCR recovery is PARTIAL by nature of the scan; we report the rate honestly.
NL_ROW = re.compile(r"^\|?\s*(\d{1,3})\s*\|?\s*(\d{3})\b\s*(.*)$")
NL_TRIBES = r"Chakhesang|Angami|\bAo\b|Sumi|Lotha|Sangtam|Rengma|Zeliang|Konyak|Phom|Khiamniungan|Chang|Yimchunger|Pochury|Kuki|Kachari"


def parse_nagaland():
    pdf = REPO / "amogh-csv/nagaland-2025-final-selected-list.pdf"
    rows, rejected, cand = [], Counter(), 0
    with pdfplumber.open(pdf) as d:
        for page in d.pages:
            for raw in ocr_page(page, rotate=270, res=300).split("\n"):
                line = " ".join(raw.split())
                if len(line) < 25:
                    continue
                m = NL_ROW.match(line)
                if not m:
                    continue
                cand += 1
                sl, score, rest = m.groups()
                score = int(score)
                if not (100 <= score <= 720):
                    rejected["implausible score"] += 1
                    continue
                tribe = re.search(NL_TRIBES, rest, re.I)
                prog = "BDS" if re.search(r"\bBDS\b|Dental", rest, re.I) else "MBBS"
                rows.append({"sl": int(sl), "neet_marks": score,
                             "tribe": tribe.group(0) if tribe else "",
                             "matrix_category": "ST", "program": prog,
                             "allotment": rest.strip()[:80]})
    return rows, rejected, cand


# =============================================================== run
def write(rows, name, cols):
    p = OUT / name
    with open(p, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
        w.writeheader(); w.writerows(rows)
    return p


print("=" * 74)
ar, ar_rej = parse_arunachal()
print(f"ARUNACHAL: {len(ar)} rows   rejects: {dict(ar_rej)}")
print("  categories:", dict(Counter(r["category"] for r in ar)))
print("  programs:  ", dict(Counter(r["program"] for r in ar)))
print("  institutes:", dict(Counter(r["institute"] for r in ar)))
print("  PwD rows (excluded from floors):",
      [(r["neet_air"], r["name"][:18]) for r in ar if r["pwd"]])
for prog in ["MBBS", "BDS"]:
    merit = [r for r in ar if r["program"] == prog and not r["pwd"]]
    if merit:
        w = max(merit, key=lambda r: r["neet_air"])
        print(f"  {prog}: n={len(merit)} merit rows  worst admitted AIR {w['neet_air']}"
              f"  <- this is the floor (PwD excluded)")
print(" ->", write(ar, "AR_2025_allotments.csv",
                   ["state_rank", "neet_roll", "name", "category", "choice_no", "program",
                    "pwd", "institute", "institute_state", "neet_air"]))

print("=" * 74)
ml, ml_rej = parse_meghalaya()
sel = [r for r in ml if r["list"] == "SELECTED"]
print(f"MEGHALAYA: {len(ml)} rows ({len(sel)} SELECTED, {len(ml)-len(sel)} WAITING)  rejects: {dict(ml_rej)}")
by = defaultdict(list)
for r in sel:
    by[r["block"]].append(r["neet_marks"])
for k in sorted(by):
    v = sorted(by[k])
    print(f"  {k:16} n={len(v):>3}  SELECTED floor {v[0]:>3}  top {v[-1]:>3}")
wl = defaultdict(list)
for r in ml:
    if r["list"] == "WAITING":
        wl[r["block"]].append(r["neet_marks"])
for k in sorted(wl):
    print(f"  {k:16} WAITING (excluded): {sorted(wl[k])}")
print("  ⚠ PARTIAL EXTRACT — recovered rows only. The strict name+score regex skips more heavily")
print("    OCR-damaged lines, so these floors are SHALLOWER than the document's true floors.")
print("    Verified present in the raw OCR text but NOT recovered here: OPEN 477, GARO 214, ST/SC 396.")
print("    The MATRIX uses the fuller hand-verified figures (Open 477 / Khasi 357 / Garo 214 / SC 396);")
print("    this CSV is the auditable subset, not a replacement for them.")
print(" ->", write(ml, "ML_2025_selected_list.csv",
                   ["block", "matrix_category", "list", "sl", "name", "neet_marks"]))

print("=" * 74)
nl, nl_rej, nl_cand = parse_nagaland()
print(f"NAGALAND: {len(nl)} rows recovered of {nl_cand} candidate lines  rejects: {dict(nl_rej)}")
if nl:
    mx = max(r["sl"] for r in nl)
    print(f"  ⚠ PARTIAL: highest S.No seen = {mx}, so the list runs to at least {mx} rows.")
    for prog in ["MBBS", "BDS"]:
        v = sorted(r["neet_marks"] for r in nl if r["program"] == prog)
        if v:
            print(f"  {prog}: n={len(v)}  lowest recovered {v[0]}  (TRUE floor is LOWER — partial OCR)")
    print("  tribes:", dict(Counter(r["tribe"] for r in nl if r["tribe"])))
print(" ->", write(nl, "NL_2025_selected_list.csv",
                   ["sl", "neet_marks", "tribe", "matrix_category", "program", "allotment"]))
print("=" * 74)
