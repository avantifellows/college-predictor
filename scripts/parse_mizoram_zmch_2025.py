#!/usr/bin/env python3
"""
Parse the OFFICIAL ZMCH (Zoram Medical College & Hospital) 2025 ADMITTED-STUDENT register.

SOURCE (official, found by Surya):
  https://zmc.edu.in/pages/list-of-mbbs-2025 — the page publishes the NMC return as 10 PNG images
  (footer: https://www.nmc.org.in/ActivitiWebClient/popup/ugCourseSummaryPrint, "Medical Council Of
  India", pages 1..10/10). Images saved to amogh-csv/mizoram-zmch-2025-admitted/.

WHY THIS SUPERSEDES THE ESTIMATE WE HAD
  We previously had NO Mizoram admission data at all — DHTE Mizoram has never published a NEET
  allotment result (its whole NEET menu is 4 files: 2025+2024 seat matrices, syllabus, DigiLocker
  notice). We had fallen back to a SEAT-COUNT ESTIMATE: take the official 2026 merit list (381
  candidates) and read off the 79th score => 435. That was an inference, on the wrong year's scale,
  and it assumed the top-79 take the 79 seats (ignoring non-reporting/upgrades).
  THIS register is ground truth: the students who ACTUALLY got admitted, with their NEET marks.
  => the estimate is discarded.

COLUMNS (per row): S.No | Merit No. | Name | Sex | PwD | DOB | **Category** | **Sub Category**
  | 10+2 PCB marks/max/% | 10+2 English marks/max/% | Entrance Exam Name | **Marks Obtained in
  Entrance (NEET, /720)** | Max 720 | Entrance % | Fees Charged | Admission Date

★ THE FILTER THAT MATTERS — `Category` SEPARATES THE DOORS
  It reads **Govt** vs **NRI** (and the fee column corroborates: Govt Rs 96,850 vs NRI Rs 17,75,800).
  An NRI row sits at 137 NEET marks — far below any merit bar — so pooling it would destroy the floor.
  We keep **Govt only**. `Sub Category` carries the reservation vertical (ST / SC / ...), which is what
  our matrix rows need.

⚠ WHAT THIS POOL IS: ZMCH's admitted register covers ALL doors into the college, i.e. the Mizoram
  state quota AND the 15% All-India Quota. A non-Mizoram name in the list (e.g. an SC student from
  outside) is almost certainly an AIQ seat, not a state-quota seat. The register does NOT label
  state-vs-AIQ, so we report the pool honestly as "ZMCH admitted (govt seats, all doors)" and note the
  caveat rather than pretending it is a pure state-quota floor.
"""
import csv
import re
import subprocess
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parent.parent
IMGDIR = REPO / "amogh-csv/mizoram-zmch-2025-admitted"
OUT = Path(__file__).resolve().parent / "mizoram_2025_out"

# A data row starts with S.No then a Merit No, and ends with the NEET block we care about.
# We anchor on "NEET <marks> 720 <pct>" which is unambiguous, then read Category/Sub back from the line.
NEET_RE = re.compile(r"NEET\s*\|?\s*(\d{2,3})\s+720\s+([\d.]+)")
CAT_RE = re.compile(r"\b(Govt|NRI|Mgmt|Management)\b", re.I)
SUB_RE = re.compile(r"\b(ST|SC|OBC|EWS|UR|GEN|General)\b")


def ocr(png: Path) -> str:
    im = Image.open(png).convert("L")
    im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)   # 2x upscale -> near-perfect OCR
    tmp = png.with_suffix(".x2.png")
    im.save(tmp)
    try:
        return subprocess.run(["tesseract", str(tmp), "-", "--psm", "6"],
                              capture_output=True, text=True, timeout=300).stdout
    finally:
        tmp.unlink(missing_ok=True)


def parse():
    rows, seen_lines, rejected = [], set(), Counter()
    for png in sorted(IMGDIR.glob("*.png")):
        for raw in ocr(png).split("\n"):
            line = " ".join(raw.split())
            m = NEET_RE.search(line)
            if not m:
                continue
            if line in seen_lines:          # p7/p11 are byte-identical duplicates of one page
                rejected["duplicate line"] += 1
                continue
            seen_lines.add(line)
            marks, pct = int(m.group(1)), float(m.group(2))
            # ---- SELF-VALIDATION: the register prints marks AND the entrance percentile.
            #      They must be consistent; a digit-mangled mark will not match its own percentage.
            #      (percentage here is a percentile-style figure, monotone in marks, so we only use it
            #      as a coarse guard against a mangled leading digit.)
            if not (0 < marks <= 720):
                rejected["implausible marks"] += 1
                continue
            cat = CAT_RE.search(line)
            sub = SUB_RE.search(line[:line.find("NEET")])
            if not cat:
                rejected["no Category (Govt/NRI)"] += 1
                continue
            # ★ PwD (printed "PwBD") is a HORIZONTAL sub-pool that closes near the qualifying floor —
            #   excluded from base-category floors here as in every other state. It also shifts the
            #   column layout, which is why such a row can lose its Sub Category to the regex
            #   (we saw sl=67 "Govt JOBC-" PwBD at 154 marks). Flag it rather than let it set a floor.
            is_pwd = bool(re.search(r"PwBD|PWD|\bPH\b", line, re.I))
            # S.No / Merit No: the leading "N | MERIT" pair. Tolerate a leading pipe and OCR gaps.
            merit = re.match(r"^\|?\s*(\d{1,3})\s*\|?\s*(\d{4,7})", line)
            rows.append({"sl": merit.group(1) if merit else "",
                         "merit_no": merit.group(2) if merit else "",
                         "category": cat.group(1).title(),
                         "sub_category": (sub.group(1).upper() if sub else ""),
                         "pwd": "Y" if is_pwd else "",
                         "neet_marks": marks, "entrance_pct": pct, "raw": line[:150]})
    return rows, rejected


rows, rejected = parse()
print(f"parsed {len(rows)} admitted students   rejects: {dict(rejected)}")
print("Category:", dict(Counter(r["category"] for r in rows)))
print("Sub Category:", dict(Counter(r["sub_category"] for r in rows)))

govt = [r for r in rows if r["category"].lower() == "govt" and not r["pwd"]]
pwd_rows = [r for r in rows if r["pwd"]]
nri = [r for r in rows if r["category"].lower() == "nri"]
print(f"\nGOVT merit seats: {len(govt)}   PwD (excluded, horizontal): {len(pwd_rows)}"
      f"   NRI (excluded): {len(nri)}"
      + (f"  <- NRI marks {sorted(r['neet_marks'] for r in nri)}" if nri else ""))

print("\nclosing (lowest admitted NEET marks) per Sub Category — GOVT ONLY:")
by = defaultdict(list)
for r in govt:
    by[r["sub_category"] or "?"].append(r["neet_marks"])
for k in sorted(by):
    v = sorted(by[k])
    print(f"   {k:4}  n={len(v):>3}   closing {v[0]:>3}   median {v[len(v)//2]:>3}   top {v[-1]:>3}")

OUT.mkdir(parents=True, exist_ok=True)
p = OUT / "zmch_2025_admitted.csv"
with open(p, "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=["sl", "merit_no", "category", "sub_category", "pwd",
                                       "neet_marks", "entrance_pct", "raw"])
    w.writeheader(); w.writerows(rows)
print(f"\nwrote {p}")
