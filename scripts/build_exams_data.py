"""
Build public/data/exams/exams.json from the cleaned exams sheet
(~/jan2023/exams_cleaned.csv — Amogh's "List of entrance exams in India",
cleaned per exams_cleaning_notes.md).

One JSON object per EXAM (the sheet is one row per exam x course-stream;
435 rows fold into ~198 cards, streams listed inside). Replaced and
discontinued exams do NOT get cards — their names become searchable
aliases on the successor, so "BHU-UET" finds CUET-UG.

AFDB note: `exam_id` (slug) is the stable natural key — this file is the
staging form of the future `exam` dimension table. Everything from
`exam_id` to `open_data_id` is dimension-shaped; only the *_display
fields are presentation extras.
"""
import hashlib
import json
import os
import re
from collections import defaultdict

import pandas as pd

SRC = "/Users/surya/jan2023/exams_cleaned.csv"
OUT = "public/data/exams/exams.json"
# Hand-formatted paper patterns: the sheet stores sections and question counts
# as two parallel run-on strings; scripts/pattern_formats.json aligns them into
# rows, keyed by md5(pattern + "||" + questions_marks)[:10].
PATTERNS = "scripts/pattern_formats.json"

MONTHS = ["January", "February", "March", "April", "May", "June", "July",
          "August", "September", "October", "November", "December"]

# scope buckets for the Where filter: a state name, All India, or a specific
# university/institute (everything else)
STATES = {
    "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa",
    "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab",
    "Rajasthan", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal", "Chandigarh", "Jammu and Kashmir",
}


def month_of(text):
    for i, m in enumerate(MONTHS):
        if m.lower() in str(text).lower():
            return m, i + 1
    return None, None


def fee_number(text):
    m = re.search(r"(\d[\d,]*)", str(text).replace(",", ""))
    return int(m.group(1)) if m else None


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def pattern_key(pattern, marks):
    raw = str(pattern) + "||" + str(marks)
    return hashlib.md5(raw.encode()).hexdigest()[:10]


def main():
    fmt = {}
    if os.path.exists(PATTERNS):
        fmt = json.load(open(PATTERNS))
    d = pd.read_csv(SRC)
    active = d[d.status == "active"]
    dead = d[d.status != "active"]

    succ_aliases = defaultdict(set)
    for _, r in dead.iterrows():
        if pd.notna(r.replaced_by):
            succ_aliases[str(r.replaced_by)].add(str(r.exam_name))

    cards, seen = [], {}
    for name, g in active.groupby("exam_name", sort=True):
        f = g.iloc[0]
        # split on the LAST paren: "CUET (UG) (Common University…)" → "CUET (UG)"
        acro = name.rsplit(" (", 1)[0]
        sid = slug(acro)
        if sid in seen:  # acronym collisions (CUET central vs Christ) get
            sid = slug(name) + "-" + re.sub(r"[^a-z0-9]+", "-",
                                            str(f["scope"]).lower())[:20].strip("-")
        seen[sid] = True
        month, month_n = month_of(f["test_date"])
        aliases = set(str(a) for a in g.aliases.dropna() if str(a).strip())
        def _k(x):
            return re.sub(r"[^a-z0-9]", "", x.lower())
        # one-directional: the successor's acronym must contain the key —
        # otherwise Christ University's "CUET" inherits central CUET's history
        replaced_here = set()
        for key, olds in succ_aliases.items():
            if _k(acro).startswith(_k(key)):
                replaced_here |= olds
        aliases |= replaced_here
        streams = sorted({s.strip() for c in g.course.dropna()
                          for s in str(c).split(";")})
        pat = fmt.get(pattern_key(f["paper_pattern"], f["questions_marks"]), {})
        cards.append({
            "exam_id": sid,
            "name": name,
            "acronym": acro,
            "streams": streams,
            "degrees": sorted({str(x) for x in g.degrees.dropna()}),
            "scope": f["scope"],
            "scope_type": ("All India" if str(f["scope"]).strip() == "All India"
                           else str(f["scope"]).strip()
                           if str(f["scope"]).strip() in STATES
                           else "University"),
            "url": f["url"] if pd.notna(f["url"]) else None,
            "eligibility": (str(f["eligibility"]).strip()
                            if pd.notna(f["eligibility"]) else None),
            "fee_display": (str(f["application_fee"]).strip()
                            if pd.notna(f["application_fee"]) else None),
            "fee_number": fee_number(f["application_fee"]),
            "test_month": month,
            "test_month_n": month_n,
            "forms_out": str(f["forms_out"]) if pd.notna(f["forms_out"]) else None,
            "last_date": str(f["last_date"]) if pd.notna(f["last_date"]) else None,
            "test_date": str(f["test_date"]) if pd.notna(f["test_date"]) else None,
            "mode": str(f["mode"]) if pd.notna(f["mode"]) else None,
            "duration": str(f["duration"]) if pd.notna(f["duration"]) else None,
            "marking": str(f["marking"]) if pd.notna(f["marking"]) else None,
            "pattern": (str(f["paper_pattern"]).strip()
                        if pd.notna(f["paper_pattern"]) else None),
            "pattern_rows": pat.get("rows"),
            "pattern_note": pat.get("note") or None,
            "remarks": str(f["remarks"]) if pd.notna(f["remarks"]) else None,
            "replaces": sorted(replaced_here) or None,
            "aliases": sorted(aliases) or None,
            "predictor_exam": (str(f["avanti_predictor"]).strip()
                               if pd.notna(f["avanti_predictor"])
                               and str(f["avanti_predictor"]).strip() else None),
            "open_data_id": (str(f["avanti_open_data"]).strip()
                             if pd.notna(f["avanti_open_data"])
                             and str(f["avanti_open_data"]).strip() else None),
        })

    # exam_id is the React key and the expand toggle — a duplicate breaks both
    ids = [c["exam_id"] for c in cards]
    dupes = {i for i in ids if ids.count(i) > 1}
    assert not dupes, f"duplicate exam_ids: {dupes}"

    os.makedirs("public/data/exams", exist_ok=True)
    with open(OUT, "w") as fh:
        json.dump(cards, fh, indent=1)
    print(f"{len(cards)} exam cards → {OUT}")
    print("with fee:", sum(1 for c in cards if c["fee_number"]))
    print("with month:", sum(1 for c in cards if c["test_month"]))
    print("predictor-linked:", sum(1 for c in cards if c["predictor_exam"]))
    print("carrying replaced-aliases:", sum(1 for c in cards if c["replaces"]))
    print("streams:", sorted({s for c in cards for s in c["streams"]}))


if __name__ == "__main__":
    main()
