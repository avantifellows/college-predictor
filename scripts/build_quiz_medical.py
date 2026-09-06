"""Build public/data/quiz/medical.json — the Career Quiz's medical dataset.

WHY A SEPARATE FILE. The quiz's engineering track reads colleges.json +
per-category JEE files; the medical track needs NEET all-India-quota closing
ranks per category, and NEETUG.json (the predictor's file) is 5.5 MB — far
too heavy to ship for a quiz. This trims it to one row per college x
programme with a per-category cutoff dict: ~450 rows, a few hundred KB.

SCOPE. All-India quota, Gender-Neutral, MCC 2025 Round 1 (the only round in
the source), base categories only (PwD sub-categories stay in the predictor).
State-quota tracks are NOT here: their category systems differ per state and
the quiz's reality-check caption says so instead of pretending one number.

Each row is matched (build-time, token-subset, unique-only) to the Colleges
tab so the quiz can show a NIRF rank and NMC seats and link "More about this
college" — MCC prints abbreviated names ("AIIMS, New Delhi"), so unmatched
rows simply carry no link, never a wrong one.

Run AFTER build_colleges_data.py:
    python3 scripts/build_quiz_medical.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "data" / "NEETUG" / "NEETUG.json"
COLLEGES = ROOT / "public" / "data" / "colleges" / "colleges.json"
OUT = ROOT / "public" / "data" / "quiz" / "medical.json"

CATEGORIES = ["Open", "EWS", "OBC", "SC", "ST"]

# MCC abbreviations -> the words the Colleges tab prints
ACRONYMS = {
    "aiims": "all india institute of medical sciences",
    "govt": "government",
    "inst": "institute",
    "instt": "institute",
    "med": "medical",
    "coll": "college",
    "medcl": "medical",
    "hosp": "hospital",
}
STOP = {"of", "the", "and", "&"}


def toks(s: str) -> set[str]:
    s = str(s).lower().replace("&", " and ")
    s = re.sub(r"\(.*?\)", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    out = []
    for t in s.split():
        out += ACRONYMS.get(t, t).split()
    return {t for t in out if t not in STOP}


def main():
    rows = json.loads(SRC.read_text())
    aiq = [
        r for r in rows
        if r["Seat Type"] == "All India" and r["Gender"] == "Gender-Neutral"
        and r["Category"] in CATEGORIES
    ]

    by_key = {}
    for r in aiq:
        k = (r["Institute"].strip(), r["Academic Program Name"].strip())
        d = by_key.setdefault(
            k, {"institute": k[0], "program": k[1],
                "state": str(r.get("State") or "").strip() or None,
                "type": str(r.get("College Type") or "").strip() or None,
                "cutoffs": {}})
        rank = int(re.sub(r"\D", "", str(r["Closing Rank"])) or 0)
        if rank:
            cat = r["Category"]
            # one round in the source; if a duplicate sneaks in, the later
            # (higher) closing rank is the one that finally closed the seat
            d["cutoffs"][cat] = max(d["cutoffs"].get(cat, 0), rank)

    # ── match to the Colleges tab (medical rows) for name/NIRF/seats ────────
    med_cols = [c for c in json.loads(COLLEGES.read_text())
                if c["counselling"] != "JoSAA"]
    dtokens = [(c, toks(c["display_name"])) for c in med_cols]
    matched = 0
    for d in by_key.values():
        t = toks(d["institute"])
        hits = [c for c, dt in dtokens if t <= dt]
        if len(hits) == 1:
            c = hits[0]
            d["college_q"] = c["display_name"]
            if c["nirf"]:
                d["nirf"] = c["nirf"]["rank"]
            seats = c["programs"]["list"][0].get("seats")
            if d["program"] == "MBBS" and seats:
                d["seats"] = seats
            matched += 1

    out_rows = sorted(
        by_key.values(),
        key=lambda d: (d.get("nirf") is None, d.get("nirf") or 0,
                       d.get("type") != "Govt", d["institute"]),
    )
    out = {
        "source": "MCC 2025 Round 1, All India Quota",
        "rows": out_rows,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=1))
    progs = {}
    for d in out_rows:
        progs[d["program"]] = progs.get(d["program"], 0) + 1
    print(f"wrote {OUT} — {len(out_rows)} rows {progs}, "
          f"{matched} matched to the Colleges tab, "
          f"{sum(1 for d in out_rows if 'nirf' in d)} with NIRF")


if __name__ == "__main__":
    main()
