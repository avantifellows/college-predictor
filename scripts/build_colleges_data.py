"""Build public/data/colleges/colleges.json — the College tab's dataset.

WHAT THIS IS. One row per college, for pure information display: identity,
NIRF rank + trend, placement outcomes, accreditation, and the programs it
offers. NOT cutoffs — those are the predictor's job, and the row carries only
one indicative rank per branch so the branch list can be ordered by
competitiveness.

THE SPINE IS THE AISHE CODE. `overall_college_mapping` (Priyanka's crosswalk,
external_data_sources/metadata/build_overall_college_mapping.py) is one row per
AISHE institution with pre-computed join keys for NIRF, JoSAA, KCET and NMC;
NAAC joins on aishe_code directly. Everything here keys on aishe_code so that
when this table moves to AFDB Postgres it is already a join, not a re-match.

SCOPE. JoSAA (engineering) first, because it is the most holistic single
counselling body — 128 institutes across every state, one rank space. The
builder is deliberately per-source so KCET / TG-EAPCET / GUJCET / NEET can be
added as further `--source` blocks without reshaping the row.

COVERAGE IS HONEST, NOT PADDED. Every enriched field carries its own source and
year, because the vintages genuinely differ (AISHE 2024-25, NIRF 2025, placement
AY 2023-24). A field we do not have is null with a stated reason where the
reason is structural — e.g. IITs/NITs/IIITs are statutorily exempt from NAAC, so
"no grade" is a fact about the accreditation regime, not missing data.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

import pandas as pd

OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "colleges" / "colleges.json"

# JoSAA program names encode branch + duration + degree in one string:
#   "Computer Science and Engineering (4 Years, Bachelor of Technology)"
PROGRAM_RE = re.compile(r"^(.*?)\s*\((\d+)\s*Years?,\s*(.*)\)$")


def split_program(p: str):
    m = PROGRAM_RE.match(str(p))
    if m:
        return m.group(1).strip(), int(m.group(2)), m.group(3).strip()
    return str(p).strip(), None, None


def parse_rank(v):
    """JoSAA ranks are strings; 123 rows carry a 'P' suffix (preparatory).

    Sorting the raw string puts CSE at 33833 instead of 4162, so this must run
    before any ordering. Preparatory ranks are a different rank space and are
    dropped rather than mixed in.
    """
    s = str(v).strip()
    if not s or s.lower() in ("nan", "none"):
        return None, False
    prep = s.upper().endswith("P")
    digits = re.sub(r"[^0-9]", "", s)
    if not digits:
        return None, prep
    return int(digits), prep


def build_josaa(client):
    from google.cloud import bigquery  # noqa: F401

    print("Querying BigQuery…")

    # ── identity: AISHE spine, across all three AISHE dims ───────────────────
    # JoSAA is the SPINE, the crosswalk is enrichment. Keying off the crosswalk
    # instead would silently drop the 32 institutes it has not matched yet —
    # mostly IIITs and NIELIT centres (IIIT Bhopal, IIIT Sri City, NIELIT
    # Aurangabad...). A directory that omits real colleges is worse than one
    # that shows them with blank rankings, so unmatched institutes appear with
    # aishe_code = null and enrichment absent.
    identity = client.query("""
    WITH latest AS (
      SELECT MAX(year) AS y FROM `avantifellows.external_data_sources.josaa_fact_cutoffs`
    ),
    josaa AS (
      SELECT DISTINCT institute AS josaa_name
      FROM `avantifellows.external_data_sources.josaa_fact_cutoffs`
      WHERE year = (SELECT y FROM latest)
    ),
    m AS (
      SELECT aishe_code, josaa_institute_name AS josaa_name, nirf_institute_ids
      FROM `avantifellows.external_data_sources.overall_college_mapping`
      WHERE josaa_institute_name IS NOT NULL AND josaa_institute_name != ''
    ),
    aishe AS (
      SELECT aishe_code, name, state, district, website, year_of_establishment,
             college_type AS kind, management
      FROM `avantifellows.external_data_sources.aishe_dim_colleges`
      UNION ALL
      SELECT aishe_code, name, state, district, website, year_of_establishment,
             university_type AS kind, CAST(NULL AS STRING) AS management
      FROM `avantifellows.external_data_sources.aishe_dim_universities`
      UNION ALL
      SELECT aishe_code, name, state, district, website, year_of_establishment,
             standalone_type AS kind, management
      FROM `avantifellows.external_data_sources.aishe_dim_standalone_institutions`
    )
    SELECT j.josaa_name, m.aishe_code, m.nirf_institute_ids,
           a.name AS aishe_name, a.state, a.district, a.website,
           a.year_of_establishment, a.kind, a.management
    FROM josaa AS j
    LEFT JOIN m ON m.josaa_name = j.josaa_name
    LEFT JOIN aishe AS a ON a.aishe_code = m.aishe_code
    """).to_dataframe()

    # ── NIRF: latest rank + a short history, Engineering category ────────────
    nirf = client.query("""
    SELECT institute_id, ranking_year, nirf_rank, overall_score
    FROM `avantifellows.external_data_sources.nirf_fact_rankings`
    WHERE ranking_category = 'Engineering' AND nirf_rank IS NOT NULL
    """).to_dataframe()

    # ── placement: UG 4-year is what a JoSAA applicant is entering ───────────
    # Fall back through older NIRF years per institute rather than showing a
    # blank: coverage goes 47 -> 59 of our institutes, and the year travels with
    # the number so a 2022 figure is never passed off as current.
    place = client.query("""
    SELECT institute_id, ranking_year, academic_year, median_salary,
           percentage_placed, students_placed, higher_studies_selected,
           first_year_intake
    FROM `avantifellows.external_data_sources.nirf_fact_aggregate`
    WHERE ranking_category = 'Engineering'
      AND type LIKE 'UG [4 Years%'
      AND median_salary IS NOT NULL AND median_salary > 0
    """).to_dataframe()

    naac = client.query("""
    SELECT aishe_id, current_grade, current_cgpa, current_cycle_number, date_of_declaration
    FROM `avantifellows.external_data_sources.naac_dim_colleges`
    UNION ALL
    SELECT aishe_id, current_grade, current_cgpa, current_cycle_number, date_of_declaration
    FROM `avantifellows.external_data_sources.naac_dim_universities`
    """).to_dataframe()

    # ── programs + one indicative rank, from the cutoffs fact ────────────────
    # AI/OPEN/Gender-Neutral in the LAST round of the latest year: the single
    # most comparable number across institutes. Full category x gender x quota
    # x round detail stays in the predictor.
    prog = client.query("""
    WITH latest AS (
      SELECT MAX(year) AS y FROM `avantifellows.external_data_sources.josaa_fact_cutoffs`
    ), lr AS (
      SELECT MAX(round) AS r FROM `avantifellows.external_data_sources.josaa_fact_cutoffs`
      WHERE year = (SELECT y FROM latest)
    )
    SELECT institute, academic_program_name, quota, seat_type, gender,
           closing_rank, closing_is_preparatory,
           (SELECT y FROM latest) AS year, (SELECT r FROM lr) AS round
    FROM `avantifellows.external_data_sources.josaa_fact_cutoffs`
    WHERE year = (SELECT y FROM latest) AND round = (SELECT r FROM lr)
    """).to_dataframe()

    return identity, nirf, place, naac, prog


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    from google.cloud import bigquery
    client = bigquery.Client(project="avantifellows", location="asia-south1")
    identity, nirf, place, naac, prog = build_josaa(client)
    print(f"  identity {len(identity)}  nirf {len(nirf)}  placement {len(place)}  "
          f"naac {len(naac)}  program rows {len(prog)}")

    # index NIRF by institute_id
    nirf_by_id = {}
    for iid, g in nirf.groupby("institute_id"):
        g = g.sort_values("ranking_year", ascending=False)
        nirf_by_id[iid] = g

    place_by_id = {}
    for iid, g in place.groupby("institute_id"):
        place_by_id[iid] = g.sort_values(["ranking_year", "academic_year"], ascending=False)

    naac_by_aishe = {r.aishe_id: r for r in naac.itertuples()}

    # programs grouped by the JoSAA institute name (the crosswalk's join key)
    prog_by_inst = {}
    for inst, g in prog.groupby("institute"):
        prog_by_inst[inst] = g

    EXEMPT = ("Indian Institute of Technology", "National Institute of Technology",
              "Indian Institute of Information Technology")

    # For the 32 institutes the crosswalk has not matched, AISHE gives us no
    # state — but JoSAA usually names it ("IIIT Una, Himachal Pradesh"). Reading
    # it off the name keeps the state filter usable for every row instead of 3/4
    # of them. Only exact state-name matches count; no guessing from city.
    STATES = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
        "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
        "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
        "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
        "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
        "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Delhi",
        "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
    ]
    STATE_ALIASES = {"Gujrat": "Gujarat", "Jammu & Kashmir": "Jammu and Kashmir",
                     "Orissa": "Odisha", "Pondicherry": "Puducherry"}

    def state_from_name(nm: str):
        low = str(nm).lower()
        for alias, real in STATE_ALIASES.items():
            if alias.lower() in low:
                return real
        for st in STATES:
            if st.lower() in low:
                return st
        return None

    rows = []
    for r in identity.itertuples():
        josaa_name = r.josaa_name
        nids = list(r.nirf_institute_ids) if r.nirf_institute_ids is not None else []

        # NIRF: POOL every id, do not take the first that happens to have data.
        # A college carries several NIRF ids across format changes — IIT Madras
        # has IR-E-U-0456 (2019-2025), IR-2-E-OE-U-0456 (2018), IR17-ENGG-1-1-77
        # (2017) and more. nids arrives alphabetically, so "first id with any
        # rows" picked the 2018-only id and reported IIT Madras as "rank 1 as of
        # 2018" with a single history point — which also hid its trend entirely.
        nirf_block = None
        frames = [nirf_by_id[n] for n in nids if n in nirf_by_id]
        if frames:
            g = (pd.concat(frames)
                   .drop_duplicates(subset=["ranking_year"], keep="first")
                   .sort_values("ranking_year", ascending=False))
            top = g.iloc[0]
            nirf_block = {
                "engineering_rank": int(top.nirf_rank),
                "engineering_score": (round(float(top.overall_score), 2)
                                      if top.overall_score == top.overall_score else None),
                "ranking_year": int(top.ranking_year),
                "rank_history": [
                    {"year": int(x.ranking_year), "rank": int(x.nirf_rank)}
                    for x in g.head(6).itertuples()
                ],
            }

        placement = None
        pframes = [place_by_id[n] for n in nids if n in place_by_id]
        if pframes:
            g = (pd.concat(pframes)
                   .sort_values(["ranking_year", "academic_year"], ascending=False))
            if True:
                p = g.iloc[0]
                def num(v, cast=float):
                    return None if v != v else cast(v)
                placement = {
                    "median_salary": num(p.median_salary, int),
                    "percentage_placed": (round(float(p.percentage_placed), 1)
                                          if p.percentage_placed == p.percentage_placed else None),
                    "students_placed": num(p.students_placed, int),
                    "higher_studies_selected": num(p.higher_studies_selected, int),
                    "first_year_intake": num(p.first_year_intake, int),
                    "academic_year": p.academic_year,
                    "ranking_year": int(p.ranking_year),
                    "source": "NIRF Engineering, UG 4-year",
                    # NIRF publishes one figure per institute per programme LEVEL,
                    # never per branch — a CSE and a Civil student see the same
                    # number. Stated so the UI can say so rather than let a
                    # student over-read it.
                    "is_branch_specific": False,
                }

        nb = naac_by_aishe.get(r.aishe_code)
        if nb is not None and nb.current_grade == nb.current_grade:
            naac_block = {
                "grade": nb.current_grade,
                "cgpa": (round(float(nb.current_cgpa), 2)
                         if nb.current_cgpa == nb.current_cgpa else None),
                "cycle": (int(nb.current_cycle_number)
                          if nb.current_cycle_number == nb.current_cycle_number else None),
                "not_applicable_reason": None,
            }
        else:
            exempt = any(k in str(josaa_name) for k in EXEMPT)
            naac_block = {
                "grade": None, "cgpa": None, "cycle": None,
                "not_applicable_reason": (
                    "Institutes of National Importance are exempt from NAAC accreditation"
                    if exempt else None),
            }

        # programs
        g = prog_by_inst.get(josaa_name)
        programs = {"count": 0, "degrees": [], "list": [],
                    "source": None, "rank_note": None}
        if g is not None and len(g):
            best = {}
            degrees, branches = set(), {}
            for x in g.itertuples():
                branch, years, degree = split_program(x.academic_program_name)
                if degree:
                    degrees.add(degree)
                branches[(branch, years, degree)] = True
                # NITs/GFTIs have NO 'AI' quota at all — they split into HS
                # (home-state) and OS (other-state). Filtering on AI alone left
                # every branch blank for 34 of 128 colleges, NIT Raipur among
                # them. Take the LOOSEST (highest) OPEN/Gender-Neutral rank
                # across whatever quotas the institute actually uses: it is the
                # one number comparable across IITs and NITs, and it is the
                # easier door, so it never overstates how hard a branch is.
                if x.seat_type == "OPEN" and x.gender == "Gender-Neutral":
                    rank, prep = parse_rank(x.closing_rank)
                    if rank is not None and not prep and not x.closing_is_preparatory:
                        k = (branch, years, degree)
                        if k not in best or rank > best[k]:
                            best[k] = rank
            lst = [{"branch": b, "years": y, "degree": d,
                    "indicative_closing_rank": best.get((b, y, d))}
                   for (b, y, d) in branches]
            lst.sort(key=lambda z: (z["indicative_closing_rank"] is None,
                                    z["indicative_closing_rank"] or 0, z["branch"]))
            yr = int(g.iloc[0]["year"]); rd = int(g.iloc[0]["round"])
            programs = {
                "count": len(lst),
                "degrees": sorted(degrees),
                "quotas_offered": sorted(set(g["quota"])),
                "list": lst,
                "source": f"JoSAA {yr} Round {rd}",
                "rank_note": "Indicative open-category closing rank.",
            }

        exams = sorted({"JEE Advanced" if "Indian Institute of Technology" in str(josaa_name)
                        else "JEE Main"})

        has_aishe = isinstance(r.aishe_code, str) and r.aishe_code
        # Stable id: the AISHE code where we have one, else a slug of the JoSAA
        # name. The slug is a placeholder, not an identifier to build on — when
        # the crosswalk matches these 32, college_id becomes the AISHE code and
        # aishe_code stops being null. Anything persisting this must key on
        # aishe_code and treat slug ids as provisional.
        # Truncating at 60 chars collided: the three NIELIT centres
        # (Aurangabad / Gorakhpur / Patna) share their first 60 characters, so
        # all three produced ONE id — React key collisions, and expanding one row
        # expanded all three. Keep the truncated slug for readability but append a
        # short hash of the FULL name so it is unique.
        full_slug = re.sub(r"[^a-z0-9]+", "-", str(josaa_name).lower()).strip("-")
        slug = full_slug[:60].rstrip("-")
        if len(full_slug) > 60:
            slug += "-" + hashlib.sha1(full_slug.encode()).hexdigest()[:6]
        rows.append({
            "college_id": r.aishe_code if has_aishe else f"josaa:{slug}",
            "aishe_code": r.aishe_code if has_aishe else None,
            "name": (r.aishe_name if isinstance(r.aishe_name, str) and r.aishe_name
                     else josaa_name),
            "display_name": josaa_name,
            "state": (r.state if isinstance(r.state, str) and r.state
                      else state_from_name(josaa_name)),
            "state_is_inferred": not (isinstance(r.state, str) and r.state),
            "district": r.district if isinstance(r.district, str) else None,
            "kind": r.kind if isinstance(r.kind, str) else None,
            "management": r.management if isinstance(r.management, str) else None,
            "year_established": (int(r.year_of_establishment)
                                 if r.year_of_establishment == r.year_of_establishment
                                 and r.year_of_establishment is not None else None),
            "website": r.website if isinstance(r.website, str) else None,
            "entrance_exams": exams,
            "counselling": "JoSAA",
            "programs": programs,
            "nirf": nirf_block,
            "placement": placement,
            "naac": naac_block,
            "data_sources": {
                "identity": "AISHE 2024-25",
                "programs": programs["source"],
                "ranking": f"NIRF {nirf_block['ranking_year']}" if nirf_block else None,
                "placement": (f"NIRF {placement['ranking_year']} (AY {placement['academic_year']})"
                              if placement else None),
                "accreditation": "NAAC" if naac_block["grade"] else None,
            },
        })

    rows.sort(key=lambda z: (z["nirf"] is None,
                             z["nirf"]["engineering_rank"] if z["nirf"] else 0,
                             z["display_name"]))

    print(f"\nbuilt {len(rows)} colleges")
    print(f"  with NIRF rank : {sum(1 for x in rows if x['nirf'])}")
    print(f"  with placement : {sum(1 for x in rows if x['placement'])}")
    print(f"  with NAAC grade: {sum(1 for x in rows if x['naac']['grade'])}")
    print(f"  with programs  : {sum(1 for x in rows if x['programs']['count'])}")
    print(f"  with state     : {sum(1 for x in rows if x['state'])}")

    if args.dry_run:
        print("\n[dry-run] sample row:")
        print(json.dumps(rows[0], indent=1)[:1800])
        return

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(rows, indent=1))
    print(f"\nWrote {OUT}")


if __name__ == "__main__":
    main()
