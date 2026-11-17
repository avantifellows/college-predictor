#!/usr/bin/env python3
"""
Which college card each dental college on the National Dental Commission's
list is (BQ ndc_dim_dental_colleges, 330 colleges), or "new".

The Colleges tab had no dental spine: the dental cards it has come from other
lists (Gujarat's ACPMEC, AISHE/NIRF). build_colleges_data.py adds a card for
each "new" one and leaves existing cards (and their ids) alone.

    python3 scripts/build_ndc_crosswalk.py          # rewrites scripts/ndc_crosswalk.json
    python3 scripts/build_ndc_crosswalk.py --check  # fails if a college is undecided

Matching is the NMC live list's (scripts/build_nmc_live_crosswalk.py): within
the state, distinctive words, exact names first; candidates are cards that are
dental (the name says so, or they list BDS). A government college is never a
private card. Close calls go to `open` for a person to decide in `decisions`.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import build_nmc_live_crosswalk as m

# words every dental college shares say nothing about which one
m.COMMON.update({"dental", "dentistry", "oral", "surgery", "school", "faculty", "dentist"})

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "scripts" / "ndc_crosswalk.json"


def is_dental(c):
    text = " ".join([c.get("display_name") or "", c.get("name") or "", *(c.get("aka") or [])])
    return "dental" in text.lower() or any("BDS" in str(d) for d in (c.get("programs") or {}).get("degrees") or [])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--dim", default=os.environ.get("NDC_DIM_JSON"),
                    help="ndc_dim_dental_colleges as JSON records (default: query BigQuery)")
    args = ap.parse_args()
    if args.dim:
        ndc = json.load(open(args.dim))
    else:
        from google.cloud import bigquery
        client = bigquery.Client(project="avantifellows", location="asia-south1")
        ndc = client.query("SELECT * FROM `avantifellows.external_data_sources.ndc_dim_dental_colleges`"
                           ).to_dataframe().to_dict("records")

    prev = json.load(open(OUT)) if OUT.exists() else {}
    decisions = prev.get("decisions", {})
    if args.check:
        undecided = [x["ndc_id"] for x in ndc if x["ndc_id"] not in decisions and x["ndc_id"] not in prev.get("auto", {})]
        if undecided:
            raise SystemExit(f"{len(undecided)} NDC colleges undecided: run scripts/build_ndc_crosswalk.py")
        print(f"ndc crosswalk covers all {len(ndc)} colleges")
        return

    cards = json.load(open(m.COLLEGES))
    pool = [c for c in cards if is_dental(c) and not str(c["college_id"]).startswith("ndc:")]
    by_state = {}
    for c in pool:
        by_state.setdefault(m.state_key(c.get("state")), []).append(c)

    auto, open_ = {}, {}
    for x in sorted(ndc, key=lambda r: r["list_sl_no"]):
        key = x["ndc_id"]
        if key in decisions:
            continue
        here = by_state.get(m.state_key(x["state"]), [])
        names = [x["college"], x["college_short"]]
        exact = [c for c in here if any(m.flat(n) in {m.flat(c.get("display_name")), m.flat(c.get("name")),
                                                      *map(m.flat, c.get("aka") or [])} for n in names)]
        if len({c["college_id"] for c in exact}) == 1:
            auto[key] = {"college_id": exact[0]["college_id"], "name": x["college"], "card": exact[0]["display_name"]}
            continue
        govt = x.get("college_type") == "Govt."
        cand = [c for c in here if not c.get("ownership") or (c["ownership"] == "Private") != govt]
        place = set(m.words(x.get("city"))) | set(m.words(x["state"]))
        row_own = set().union(*(m.distinctive(n, x["state"]) for n in names)) - place

        def sc(c):
            v = max(m.score(m.names_of_live(n), c, x["state"]) for n in names)
            # a card with no words of its own ("K L E Society's Institute of
            # Dental Sciences") agrees with every college in its town: a row
            # that has words of its own can't land on it unreviewed
            card_own = set().union(*(m.distinctive(n, c.get("state"))
                                     for n in [c.get("display_name"), c.get("name")] if n))
            card_own -= set(m.words(c.get("district"))) | place
            return min(v, 0.6) if not card_own else v
        ranked = sorted(((sc(c), c) for c in cand), key=lambda t: -t[0])
        ranked = [t for t in ranked if t[0] > 0]
        best = ranked[0] if ranked else (0, None)
        second = ranked[1][0] if len(ranked) > 1 else 0
        if best[0] >= 0.85 and best[0] - second >= 0.2:
            auto[key] = {"college_id": best[1]["college_id"], "name": x["college"], "card": best[1]["display_name"]}
        elif best[0] < 0.45:
            auto[key] = {"college_id": "new", "name": x["college"]}
        else:
            open_[key] = {"name": x["college"], "state": x["state"],
                          "candidates": [{"college_id": c["college_id"], "card": c["display_name"],
                                          "score": round(s, 2)} for s, c in ranked[:3]]}

    json.dump({"about": "NDC dental college -> existing card or 'new'. See scripts/build_ndc_crosswalk.py.",
               "decisions": dict(sorted(decisions.items())), "auto": auto, "open": open_},
              open(OUT, "w"), indent=1, ensure_ascii=False)
    OUT.open("a").write("\n")
    linked = sum(1 for v in {**auto, **decisions}.values() if v["college_id"] != "new")
    new = sum(1 for v in {**auto, **decisions}.values() if v["college_id"] == "new")
    print(f"ndc {len(ndc)}: on an existing card {linked}, new {new}, open {len(open_)}")


if __name__ == "__main__":
    main()
