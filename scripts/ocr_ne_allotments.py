#!/usr/bin/env python3
"""
OCR-based parser for NORTH-EAST state allotment PDFs that are SCANS (no usable text layer).

WHY
  Manipur and Nagaland publish full, official allotment lists — but as scanned images. Their
  embedded text layer is unusable (e.g. `I\\,4 B B S-R II\\,4 S` for "MBBS-RIMS", `)Jt I I` for a
  rank). Running Tesseract at 300dpi recovers these cleanly, so the data IS obtainable.

SOURCES (official)
  Manipur — Directorate of Health Services, Manipur / Manipur Medical e-Counselling 2025-26
    portal: https://manipurmc.mn.gov.in  (publishes every round: merit lists + allotment lists)
    used:   "Notification of the list of candidates allotted in State Government quota seats for
             the 2nd Round of Manipur Medical e-Counselling 2025" (25 Sep 2025), Annexure-A.
    cols:   State Rank | All India Rank | NEET Roll No | Name | Category | Special Category
            | Seat Allotted (e.g. MBBS-RIMS / MBBS-JNIMS / MBBS-CMC / MBBS-SAHS) | Seat Category
  Nagaland — Directorate of Technical Education, Nagaland
    https://dte.nagaland.gov.in/wp-content/uploads/2025/09/Final-List-of-MBBS-Allied-courses-2025-26.pdf

⚠ QUOTA SEMANTICS — READ BEFORE USING NAGALAND
  Nagaland places students through more than one door and they MUST NOT be pooled:
    1. Nagaland state quota at NIMSR Kohima (its own college)
    2. **NEC (North Eastern Council) regional quota** — seats at NEIGRIHMS Shillong and other
       regional institutes reserved for NE-state students. A different competition entirely.
    3. Central-pool / other nominations.
  RIMS Imphal (Manipur) is likewise a CENTRAL institute, so its "state quota" mechanics differ
  from an ordinary state medical college. We therefore record the seat/institute per row and keep
  the doors separate rather than computing one blended "state floor".

METHOD
  render page at 300dpi (pdfplumber) -> tesseract --psm 6 -> parse rows with STRICT validation:
  a row is accepted only if we can read a plausible AIR (4-7 digits), a category token, and an
  institute token. Rows failing validation are counted and reported, never guessed at.

OUTPUT: scripts/ne_ocr_out/<STATE>_allotments_ocr.csv  + a per-file quality report on stdout.
"""
import csv
import re
import subprocess
import sys
import tempfile
from collections import Counter, defaultdict
from pathlib import Path

import pdfplumber

OUT = Path(__file__).resolve().parent / "ne_ocr_out"

# institute tokens, tolerant of residual OCR noise
# ORDER MATTERS: longer / more specific patterns first, else e.g. "NIMS" matches inside "JNIMS"
# and a Manipur row is mislabelled as Nagaland's NIMSR.
INSTITUTES = [
    (r"NEIGRIHMS|NEIGRI", "NEIGRIHMS"),           # central, NE regional (NEC quota lands here)
    (r"JN\W?I\W?M\W?S|JNIVS|JNINIS", "JNIMS"),    # Jawaharlal Nehru IMS, Imphal   (before RIMS/NIMSR!)
    (r"NIMSR", "NIMSR"),                          # Nagaland IMS & Research, Kohima
    (r"\bRI\W?M\W?S\b|RIIVIS|\bRIVS\b", "RIMS"),  # Regional IMS, Imphal (CENTRAL institute)
    (r"\bC\W?M\W?C\b|CIVC", "CMC"),               # Churachandpur Medical College
    (r"SAHS", "SAHS"),                            # Shija Academy of Health Sciences (private)
]
# A govt MBBS seat should not close beyond roughly this AIR; anything past it in a small-state
# list is an OCR digit-mangle (we saw a spurious 988,279), not a real closing.
AIR_SANITY_MAX = 600_000
CATEGORIES = [
    (r"\bOBC\W?MP\b|\bOBC\W?M\W?P\b", "OBC"),
    (r"\bOBC\W?M\b|\bOBC\b|\b0BC\b", "OBC"),
    (r"\bGEN\b|\bGENERAL\b|\bUR\b", "Gen"),
    (r"\bEWS\b|\bEW\b", "EWS"),
    (r"\bSC\b", "SC"),
    (r"\bST\b", "ST"),
]


def ocr_page(page) -> str:
    """300dpi render -> tesseract --psm 6 (assume a uniform block of text)."""
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tf:
        png = tf.name
    page.to_image(resolution=300).save(png)
    try:
        res = subprocess.run(["tesseract", png, "-", "--psm", "6"],
                             capture_output=True, text=True, timeout=180)
        return res.stdout
    finally:
        Path(png).unlink(missing_ok=True)


def find_token(line, table):
    for pat, val in table:
        if re.search(pat, line, re.I):
            return val
    return None


def parse_lines(text):
    """Yield validated rows. Returns (rows, n_candidate_lines) so we can report a recovery rate."""
    rows, candidates = [], 0
    for raw in text.split("\n"):
        line = raw.strip()
        if not line or len(line) < 20:
            continue
        # a data line has a long digit run (NEET roll) or an institute token
        if not (re.search(r"\d{5,}", line) and find_token(line, INSTITUTES)):
            continue
        candidates += 1
        inst = find_token(line, INSTITUTES)
        cat = find_token(line, CATEGORIES)
        # AIR = a 4-7 digit number that is NOT the 10-digit NEET roll and not the small state rank
        nums = [int(n) for n in re.findall(r"\b(\d{3,7})\b", line)]
        nums = [n for n in nums if 1000 <= n <= AIR_SANITY_MAX]
        air = nums[0] if nums else None
        if air is None or cat is None or inst is None:
            continue
        rows.append({"neet_air": air, "category": cat, "institute": inst, "raw": line[:130]})
    return rows, candidates


def run(pdf_path: Path, state: str, skip_pages=1):
    print(f"\n{'='*74}\n{state}  <-  {pdf_path.name}\n{'='*74}")
    all_rows, total_cand = [], 0
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            if i < skip_pages:      # cover/notification pages
                continue
            txt = ocr_page(page)
            rows, cand = parse_lines(txt)
            all_rows.extend(rows); total_cand += cand
            print(f"  page {i+1}: {len(rows)} valid / {cand} candidate lines")
    print(f"\n  TOTAL: {len(all_rows)} validated rows "
          f"({100*len(all_rows)/total_cand:.0f}% of candidate lines)" if total_cand else "  no rows")
    if not all_rows:
        return []
    print(f"  institutes: {dict(Counter(r['institute'] for r in all_rows))}")
    print(f"  categories: {dict(Counter(r['category'] for r in all_rows))}")
    print("\n  closing AIR per (institute, category)  [worst admitted]:")
    d = defaultdict(int)
    for r in all_rows:
        d[(r["institute"], r["category"])] = max(d[(r["institute"], r["category"])], r["neet_air"])
    for kk in sorted(d):
        n = sum(1 for r in all_rows if (r["institute"], r["category"]) == kk)
        print(f"     {kk[0]:10} {kk[1]:4}  n={n:>3}  closing AIR {d[kk]:>9}")
    OUT.mkdir(parents=True, exist_ok=True)
    p = OUT / f"{state}_allotments_ocr.csv"
    with open(p, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["neet_air", "category", "institute", "raw"])
        w.writeheader(); w.writerows(all_rows)
    print(f"\n  wrote {p}")
    return all_rows


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) >= 2:
        run(Path(args[0]), args[1], skip_pages=int(args[2]) if len(args) > 2 else 1)
    else:
        print(__doc__)
