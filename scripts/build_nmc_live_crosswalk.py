#!/usr/bin/env python3
"""
Which college card each college on NMC's live MBBS list is.

The medical cards come from NMC's 2024-25 seat-matrix PDF (780 colleges). NMC's
live list (BQ nmc_fact_mbbs_colleges, 839 today) has the colleges opened since.
This script decides, for every live college (keyed on NMC's college_code), the
card it already is, or "new". build_colleges_data.py adds a card for each "new"
one and leaves every existing card (and its id, which students' saves hold)
alone.

    python3 scripts/build_nmc_live_crosswalk.py          # rewrites the crosswalk
    python3 scripts/build_nmc_live_crosswalk.py --check  # fails if a live code is undecided

Matching is within the state, on distinctive words (names minus words every
medical college shares), with NMC's bracketed former names ("(previously
Government Medical College, Keonjhar)") tried too. A clear winner is linked; a
college no card resembles is "new"; anything between is left `open` for a person
to decide in scripts/nmc_live_crosswalk.json ("decisions" overrides the matcher:
a college_id, or "new").
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "scripts" / "nmc_live_crosswalk.json"
COLLEGES = ROOT / "public" / "data" / "colleges" / "colleges.json"

COMMON = set("""
and of the in at for a an medical college colleges government govt institute
institution sciences science research hospital hospitals health centre center
education educational post graduate pg autonomous state society trust memorial
teaching campus university deemed rural general district mc instt inst sc res
hosp ltd pvt private
""".split())
EXPAND = {"gmc": "government medical college", "aiims": "all india institute medical sciences",
          "esic": "employees state insurance corporation", "esi": "employees state insurance",
          "chattisgarh": "chhattisgarh", "uttrakhand": "uttarakhand", "orissa": "odisha",
          "pondicherry": "puducherry", "bangalore": "bengaluru", "gurgaon": "gurugram",
          "baroda": "vadodara", "calcutta": "kolkata", "bombay": "mumbai", "madras": "chennai"}


def words(s):
    s = re.sub(r"[^a-z0-9]+", " ", str(s or "").lower().replace("&", " and "))
    return [w for t in s.split() for w in EXPAND.get(t, t).split()]


def distinctive(s, state):
    st = set(words(state))
    ws = {w for w in words(s) if w not in COMMON and len(w) > 2 and not w.isdigit()}
    # a state's name says nothing, unless it is all the name has ("Government
    # Medical College, Chandigarh", "Nagaland Institute of Medical Sciences")
    return (ws - st) or ws


def flat(s):
    return " ".join(words(s))


def names_of_live(name):
    """the name, the name without its brackets, and each bracketed former name"""
    out = [name, re.sub(r"\(.*?\)", " ", name)]
    for b in re.findall(r"\((.*?)\)", name):
        out.append(re.sub(r"^(previously|formerly|erstwhile|earlier|prev\.?)\s*(known as)?\s*",
                          "", b.strip(), flags=re.I))
    return [n for n in out if n.strip()]


def state_key(s):
    k = re.sub(r"[^a-z]", "", str(s or "").lower().replace("&", "and"))
    return {"orissa": "odisha", "chattisgarh": "chhattisgarh", "pondicherry": "puducherry",
            "jammuandkashmir": "jammukashmir", "delhinct": "delhi"}.get(k, k)


def score(live_names, card, state):
    cnames = [card.get("display_name"), card.get("name"), *(card.get("aka") or [])]
    cd_all = set().union(*(distinctive(n, state) for n in cnames if n))
    # the card's own words from its shortest name, brackets dropped
    own = min((distinctive(re.sub(r"\(.*?\)", " ", n), state) for n in cnames if n),
              key=len, default=set())
    district = set(words(card.get("district")))
    best = 0.0
    for ln in live_names:
        rd = distinctive(ln, state)
        if not rd:
            continue
        shared = len(rd & (cd_all | district))
        if not shared:
            continue
        recall = shared / len(rd)
        precision = len(own & rd) / len(own) if own else 1.0
        best = max(best, 0.6 * recall + 0.4 * precision)
    return best


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--live", default=os.environ.get("NMC_LIVE_JSON"),
                    help="the live table as JSON records (default: query BigQuery)")
    args = ap.parse_args()

    if args.live:
        live = json.load(open(args.live))
    else:
        from google.cloud import bigquery
        client = bigquery.Client(project="avantifellows", location="asia-south1")
        live = client.query(
            "SELECT * FROM `avantifellows.external_data_sources.nmc_fact_mbbs_colleges`"
        ).to_dataframe().to_dict("records")

    prev = json.load(open(OUT)) if OUT.exists() else {}
    decisions = prev.get("decisions", {})

    if args.check:
        undecided = [x["college_code"] for x in live
                     if x["college_code"] not in decisions
                     and x["college_code"] not in prev.get("auto", {})]
        if undecided:
            raise SystemExit(f"{len(undecided)} live NMC colleges undecided: run "
                             f"scripts/build_nmc_live_crosswalk.py, then review `open`")
        print(f"nmc live crosswalk covers all {len(live)} colleges")
        return

    raw = json.load(open(COLLEGES))
    cards = raw if isinstance(raw, list) else raw["colleges"]
    # cards a live college could be: medical ones the build made from NMC (or
    # that take NEET), never the ones a previous run added from the live list
    med = [c for c in cards if "NEET-UG" in (c.get("entrance_exams") or [])
           and not str(c.get("college_id", "")).startswith("nmclive:")]
    by_state = {}
    for c in med:
        by_state.setdefault(state_key(c.get("state")), []).append(c)

    auto, open_ = {}, {}
    for x in sorted(live, key=lambda r: r["college_code"]):
        code = x["college_code"]
        if code in decisions:
            continue
        ln = names_of_live(x["college"])
        # the card made from NMC's own 2024-25 name for it: the same words
        # (ownership not checked here: the two NMC lists label a few colleges
        # differently, and the same name is the same college)
        exact = [c for c in by_state.get(state_key(x["state"]), [])
                 if any(flat(n) in {flat(c.get("display_name")), flat(c.get("name")),
                                    *map(flat, c.get("aka") or [])} for n in ln)]
        if len({c["college_id"] for c in exact}) == 1:
            auto[code] = {"college_id": exact[0]["college_id"], "name": x["college"],
                          "card": exact[0]["display_name"]}
            continue
        # a government college is never a private card, nor the other way
        govt = x.get("management_type") == "Government"
        pool = [c for c in by_state.get(state_key(x["state"]), [])
                if not c.get("ownership") or (c["ownership"] == "Private") != govt]
        ranked = sorted(((score(ln, c, x["state"]), c) for c in pool),
                        key=lambda t: -t[0])
        ranked = [t for t in ranked if t[0] > 0]
        best = ranked[0] if ranked else (0, None)
        second = ranked[1][0] if len(ranked) > 1 else 0
        if best[0] >= 0.85 and best[0] - second >= 0.2:
            auto[code] = {"college_id": best[1]["college_id"], "name": x["college"],
                          "card": best[1]["display_name"]}
        elif best[0] < 0.45:
            auto[code] = {"college_id": "new", "name": x["college"]}
        else:
            open_[code] = {"name": x["college"], "state": x["state"],
                           "candidates": [{"college_id": c["college_id"], "card": c["display_name"],
                                           "score": round(s, 2)} for s, c in ranked[:3]]}

    # two live colleges on one card means one of them is wrong
    seen = {}
    for code, v in {**auto, **decisions}.items():
        cid = v["college_id"] if isinstance(v, dict) else v
        if cid and cid != "new":
            seen.setdefault(cid, []).append(code)
    for cid, codes in seen.items():
        if len(codes) > 1:
            for code in codes:
                if code in auto:
                    v = auto.pop(code)
                    open_[code] = {"name": v["name"], "state": None,
                                   "candidates": [{"college_id": cid, "card": v.get("card"),
                                                   "score": None, "note": f"shared with {codes}"}]}

    json.dump({"about": __doc__.strip().splitlines()[0] + " See scripts/build_nmc_live_crosswalk.py.",
               "decisions": dict(sorted(decisions.items())),
               "auto": dict(sorted(auto.items())),
               "open": dict(sorted(open_.items()))},
              open(OUT, "w"), indent=1, ensure_ascii=False)
    OUT.open("a").write("\n")
    new = sum(1 for v in {**auto, **decisions}.values()
              if (v["college_id"] if isinstance(v, dict) else v) == "new")
    print(f"live {len(live)}: matched {len(auto) - sum(1 for v in auto.values() if v['college_id'] == 'new')}, "
          f"new {new}, decided by hand {len(decisions)}, open {len(open_)}")


if __name__ == "__main__":
    sys.exit(main())
