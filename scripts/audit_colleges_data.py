"""Audit public/data/colleges/colleges.json against structural invariants.

Written after two bugs got through visual spot-checking:

  1. IIT Madras showed "rank 1" from NIRF **2018** with a single history point,
     because the builder took the FIRST nirf_institute_id that had any rows and
     the ids arrive alphabetically — IR-2-E-OE-U-0456 (2018 only) beat
     IR-E-U-0456 (2019-2025). IIT Bombay read #2 for the same reason; it is #3.
  2. The three NIELIT centres (Aurangabad / Gorakhpur / Patna) shared ONE
     college_id, because the slug was truncated at 60 chars — before the city
     that distinguishes them. React keys collided and expanding one row expanded
     all three.

Neither is visible unless you happen to open the right row. 128 rows is small
enough to check exhaustively, so check exhaustively.

Run after any build_colleges_data.py change:
    python3 scripts/audit_colleges_data.py
Exit code is non-zero if anything fails, so it can gate a commit.
"""
from __future__ import annotations

import collections
import json
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "public" / "data" / "colleges" / "colleges.json"
LATEST_NIRF = 2025


def main() -> int:
    rows = json.loads(DATA.read_text())
    fail: dict[str, list[str]] = collections.defaultdict(list)

    def chk(cond, key, row, detail=""):
        if not cond:
            fail[key].append(f"{row['display_name'][:44]} {detail}".strip())

    for c in rows:
        nirf, place, prog = c["nirf"], c["placement"], c["programs"]

        # identity
        chk(c["college_id"], "missing college_id", c)
        chk(c["display_name"].strip(), "empty display_name", c)
        chk(c["entrance_exams"], "no entrance exam", c)
        chk(all(e in ("JEE Main", "JEE Advanced") for e in c["entrance_exams"]),
            "unexpected entrance exam", c, str(c["entrance_exams"]))
        # a row may lack an AISHE code (crosswalk gap) but then the state, if we
        # have one, must be flagged as inferred
        if c.get("state") and not c["aishe_code"]:
            chk(c.get("state_is_inferred"), "unflagged inferred state", c)
        chk(not (c.get("state_is_inferred") and c["aishe_code"]),
            "inferred flag on an AISHE-matched row", c)

        # NIRF
        if nirf:
            chk(1 <= nirf["engineering_rank"] <= 350, "rank out of range", c,
                nirf["engineering_rank"])
            years = [h["year"] for h in nirf["rank_history"]]
            chk(len(years) == len(set(years)), "duplicate years in rank_history", c, str(years))
            chk(years == sorted(years, reverse=True), "rank_history not newest-first", c, str(years))
            newest = max(nirf["rank_history"], key=lambda h: h["year"])
            chk(nirf["engineering_rank"] == newest["rank"],
                "headline rank is not the newest history point", c)
            chk(nirf["ranking_year"] == newest["year"],
                "ranking_year is not the newest history year", c)
            chk(nirf["ranking_year"] <= LATEST_NIRF, "ranking_year in the future", c,
                nirf["ranking_year"])

        # placement
        if place:
            chk(place["median_salary"] is None or 50_000 <= place["median_salary"] <= 10_000_000,
                "median_salary implausible", c, place["median_salary"])
            chk(place["percentage_placed"] is None or 0 <= place["percentage_placed"] <= 100,
                "percentage_placed out of range", c, place["percentage_placed"])
            chk(place["is_branch_specific"] is False,
                "placement claims to be branch-specific (NIRF has no branch dimension)", c)

        # programs — the only field we expect at 100%
        chk(prog["count"] > 0, "zero programs", c)
        chk(prog["count"] == len(prog["list"]), "count does not match list length", c)
        ranks = [p["indicative_closing_rank"] for p in prog["list"]]
        chk(any(r is not None for r in ranks), "every branch rank is null", c)
        present = [r for r in ranks if r is not None]
        chk(present == sorted(present), "branch list not sorted by rank", c)
        for p in prog["list"]:
            chk(p["branch"] and p["branch"].strip(), "empty branch name", c)
            r = p["indicative_closing_rank"]
            chk(r is None or 1 <= r <= 2_000_000, "branch rank implausible", c,
                f"{p['branch'][:24]}={r}")

        # NAAC
        if c["naac"]["grade"]:
            chk(c["naac"]["cgpa"] is None or 0 <= c["naac"]["cgpa"] <= 4,
                "NAAC cgpa out of range", c, c["naac"]["cgpa"])
            chk(not c["naac"]["not_applicable_reason"],
                "has a NAAC grade AND a not-applicable reason", c)

    ids = collections.Counter(c["college_id"] for c in rows)
    for cid, n in ids.items():
        if n > 1:
            fail["duplicate college_id"].append(f"{cid} ({n} rows)")

    total = sum(len(v) for v in fail.values())
    print(f"audited {len(rows)} colleges")
    if not total:
        print("  no violations")
        return 0
    print(f"  {total} violation(s):")
    for key in sorted(fail):
        print(f"\n  {key} ({len(fail[key])})")
        for line in fail[key][:8]:
            print(f"     {line}")
        if len(fail[key]) > 8:
            print(f"     … and {len(fail[key]) - 8} more")
    return 1


if __name__ == "__main__":
    sys.exit(main())
