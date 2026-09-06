#!/usr/bin/env python3
"""
Parse the OFFICIAL Tripura NEET UG 2025 Round-1 allotment list (TRMCC).

SOURCE (official, sent by Surya):
  amogh-csv/tripura-2025-r1-allotment.pdf
  = Government of Tripura / TRIPURA MEDICAL COUNSELLING COMMITTEE (TRMCC),
    No.F.5(6)-DME/NEET/UG/Counselling/2025, dated Agartala 18 August 2025,
    "Provisional Allotment result of Round-1 of Tripura NEET UG 2025 Counselling".
    Portal: https://trmcc.admissions.nic.in
  27pp SCAN (no text layer) -> OCR at 300dpi greyscale, tesseract --psm 6.

WHY THIS IS THE BEST SMALL-STATE SOURCE WE HAVE
  Each row carries **NEET Rank AND NEET Marks** for the same candidate, plus Category, Sub Category,
  Allotted Category, Allotted Institute, Program and Status. So:
   - it is MARKS-NATIVE (no AIR->marks conversion needed), and
   - the (marks, AIR) pair lets us **self-validate every OCR'd row** against our score_rank model.
     Any row whose marks disagree with its rank by more than a tolerance is an OCR digit-mangle and is
     dropped rather than guessed at. This is the same discipline used for the other NE scans, but here
     the document itself supplies the check.

★ CROSS-STATE SEATS (matters beyond Tripura): Tripura candidates are allotted to
  **RIMS Imphal (Manipur)** and **NEIGRIHMS Shillong (Meghalaya)** as well as Tripura's own AGMC and
  TMC. That is the NE regional/NEC pattern again — a Tripura student's "state quota" reaches colleges
  in other NE states. Recorded per row so the doors stay separable.

GOVT vs PRIVATE: Tripura's two colleges are AGMC (govt) and TMC = Tripura Medical College &
  Dr. B.R.A.M. Teaching Hospital (a SOCIETY/private-status college that carries a state quota).
  RIMS/NEIGRIHMS are central institutes taking Tripura-reserved candidates. We tag each and let the
  matrix builder decide, rather than baking one choice in here.
"""
import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / "tripura_2025_out"
TXT = Path("/private/tmp/claude-501/-Users-surya-jan2023-college-predictor/"
           "3491cd03-fb57-4cf5-a1e1-ea8bbe09cd7a/scratchpad")

# ---- our 2025 marks<->AIR model, used ONLY as an OCR consistency check -------------------
_m = json.load(open(REPO / "public/data/NEETUG/score_rank_model.json"))
def _pv(c, x):
    v = 0.0
    for a in c: v = v * x + a
    return v
def air_at_marks(mk):
    mk = max(_m["min_trusted_score"], min(mk, _m["max_trusted_score"]))
    return 10 ** _pv(_m["coeffs"], mk)

INSTITUTES = [
    (r"AGARTALA GOVERNMENT|AGARTALA GOVT", "AGMC Agartala", "Tripura", "govt"),
    (r"TRIPURA MEDICAL COLLEGE|B\.?R\.?A\.?M", "TMC Agartala", "Tripura", "society"),
    (r"REGIONAL INSTITUTE OF MEDICAL|RIMS", "RIMS Imphal", "Manipur", "central"),
    (r"NEIGRIHMS|NORTH EASTERN INDIRA", "NEIGRIHMS Shillong", "Meghalaya", "central"),
    (r"DENTAL", "Govt Dental", "?", "govt"),
]
# ORDER MATTERS (most specific first). OCR mangles these badly, so patterns are deliberately loose:
#   "Other Backward Class (OBC)" often loses "Other" -> match bare "Backward"
#   "General-EWS" / "General- EWS" / "GeneralEWS"    -> the EWS test must precede plain "General"
#   Bare \bST\b would also match inside "INSTITUTE"/"INSTITUTE OF" -> require the spelled-out form or a
#   standalone token that is not part of a word we know appears in the institute names.
CATS = [
    (r"Backward|\bOBC\b", "OBC"),
    (r"General\s*-?\s*EWS|\bEWS\b", "Gen-EWS"),
    (r"Scheduled\s*Caste|\bSC\b", "SC"),
    (r"Scheduled\s*Trib|\bST\b(?!\w)", "ST"),
    (r"\bGeneral\b|\bUR\b", "Gen"),
]

def tok(line, table):
    for pat, *rest in table:
        if re.search(pat, line, re.I):
            return rest
    return None

def parse():
    rows, cand, rejected = [], 0, Counter()
    for f in sorted(TXT.glob("tr_txt_*.txt")):
        for raw in f.read_text().split("\n"):
            line = " ".join(raw.split())
            if len(line) < 40:
                continue
            inst = tok(line, INSTITUTES)
            if not inst:
                continue
            cand += 1
            cat = tok(line, CATS)
            if not cat:
                rejected["no category"] += 1
                continue
            # ---- COLUMN ORDER MATTERS. The table is: Roll(10 digits) | Name | NEET Rank | NEET Marks
            #      so rank and marks are an ADJACENT PAIR, rank first. Picking "the first number in
            #      100..720" instead grabs a fragment of the roll or the rank itself and then fails
            #      validation — that was a parser bug of mine, not OCR noise (it rejected 37 good rows).
            #      Strip the 10-digit roll first, then take the first adjacent (rank, marks) pair that
            #      is mutually consistent.
            roll_m = re.search(r"\b\d{10}\b", line)
            roll = roll_m.group(0) if roll_m else ""
            rest = line.replace(roll, " ") if roll else line
            nums = [int(n) for n in re.findall(r"\b\d{1,7}\b", rest)]
            rank = marks = None
            for a, b in zip(nums, nums[1:]):
                if not (100 <= b <= 720 and 1 <= a <= 1_400_000):
                    continue
                exp = air_at_marks(b)
                if 0.45 * exp <= a <= 2.2 * exp:       # the doc's own pair, checked against our curve
                    rank, marks = a, b
                    break
            if marks is None:
                rejected["no consistent (rank,marks) pair"] += 1
                continue
            prog = "BDS" if re.search(r"\bBDS\b", line, re.I) else "MBBS"
            rows.append({"roll": roll or "", "air": rank, "marks": marks, "category": cat[0],
                         "institute": inst[0], "inst_state": inst[1], "inst_type": inst[2],
                         "program": prog, "raw": line[:150]})
    return rows, cand, rejected


rows, cand, rejected = parse()
print(f"candidate lines {cand} -> validated {len(rows)} ({100*len(rows)/max(cand,1):.0f}%)")
print("rejects:", dict(rejected))
print("\ninstitutes:", dict(Counter(f"{r['institute']} [{r['inst_type']}]" for r in rows)))
print("categories:", dict(Counter(r["category"] for r in rows)))
print("programs:  ", dict(Counter(r["program"] for r in rows)))

print("\nclosing (worst admitted) per program x category — GOVT+SOCIETY+CENTRAL (all Tripura-quota):")
for prog in ["MBBS", "BDS"]:
    for c in ["Gen", "Gen-EWS", "OBC", "SC", "ST"]:
        sub = [r for r in rows if r["program"] == prog and r["category"] == c]
        if not sub:
            continue
        w = min(sub, key=lambda r: r["marks"])
        print(f"   {prog:4} {c:8} n={len(sub):>3}  closing {w['marks']:>3} marks / AIR {w['air']:>7}"
              f"  @ {w['institute']}")

print("\nclosing per program x category — TRIPURA-STATE COLLEGES ONLY (AGMC + TMC):")
for prog in ["MBBS", "BDS"]:
    for c in ["Gen", "Gen-EWS", "OBC", "SC", "ST"]:
        sub = [r for r in rows if r["program"] == prog and r["category"] == c
               and r["inst_state"] == "Tripura"]
        if not sub:
            continue
        w = min(sub, key=lambda r: r["marks"])
        print(f"   {prog:4} {c:8} n={len(sub):>3}  closing {w['marks']:>3} marks / AIR {w['air']:>7}"
              f"  @ {w['institute']}")

OUT.mkdir(parents=True, exist_ok=True)
p = OUT / "tripura_2025_r1_allotments.csv"
with open(p, "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=["roll", "air", "marks", "category", "institute",
                                       "inst_state", "inst_type", "program", "raw"])
    w.writeheader(); w.writerows(rows)
print(f"\nwrote {p}")
