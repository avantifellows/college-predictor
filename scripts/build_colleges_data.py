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

MEDICAL (added Sep 2026). Spine = nmc_fact_mbbs_seats, the NMC's own list of
every MBBS college with its approved annual intake — 780 colleges, all of
which appear in students' NEET predictor lists. Enrichment rides Priyanka's
crosswalk (nmc_college_name -> aishe_code, 498 matched; the rest are mostly
colleges newer than the AISHE vintage, which appear with identity from NMC
alone). NIRF Medical ranks reach an NMC college two ways: the crosswalk's
nirf_institute_ids where present, plus a state-constrained name match against
the ~100 NIRF-Medical-ranked names with hand-verified pins for the
university-umbrella cases (NIRF ranks "Banaras Hindu University"; the NMC row
is "Institute of Medical Sciences, BHU"). PG-only institutes (PGIMER, SGPGI,
NIMHANS, SCTIMST, ILBS) rightly match nothing — they admit no MBBS batch.
No per-college NEET cutoff ships on the card: MCC prints institute names too
abbreviated to match honestly ("KGMC, LUCKNOW"), and cutoffs are the
predictor's job anyway.

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


# branch text -> career page: JoSAA branch strings resolve to a parent
# branch (exam_branch_mapping) and each parent to its career slug
# (branch_to_career.json, built by build_careers_data.py) — so a branch in
# a college's programme table can link to "what does this lead to".
EXAM_BRANCH_MAP = "data-sources/exam_branch_mapping.csv"
BRANCH_TO_CAREER = "public/data/careers/branch_to_career.json"


def career_lookup(exam="JoSAA"):
    import csv
    b2c = json.load(open(BRANCH_TO_CAREER))
    base_to_career = {}
    conflicts = set()
    with open(EXAM_BRANCH_MAP) as fh:
        for r in csv.DictReader(fh):
            if r["exam"] != exam:
                continue
            # strip ONLY the trailing "(4 Years, Bachelor of Technology)" —
            # a first-paren split collapses "CSE (Cyber Security)" into
            # plain CSE and links the wrong career
            base = re.sub(r"\s*\(\d+\s*Years?,[^)]*\)$", "",
                          r["branch_raw"]).strip()
            cid = b2c.get(r["branch_id"])
            if cid:
                if base in base_to_career and base_to_career[base] != cid:
                    conflicts.add(base)
                base_to_career.setdefault(base, cid)
    # a branch whose NAME is itself a career wins its own page
    # ("Engineering Physics" -> engineering-physics, not physics)
    career_ids = set(b2c.values())
    for base in list(base_to_career):
        exact = re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")
        if exact in career_ids:
            base_to_career[base] = exact
            conflicts.discard(base)
    for b in sorted(conflicts):
        print(f"  WARNING: branch base maps to two careers, kept first: {b}")
    return base_to_career


# Public / Private / Government-aided from AISHE's kind + management fields.
# The few colleges AISHE leaves blank are pinned by name (all verified):
# BIT Mesra and its off-campuses are a private deemed university; ICT Mumbai
# is a state-funded deemed university.
PUBLIC_KINDS = {
    "Institute of National Importance", "Central University",
    "State Public University", "Deemed University-Government",
    "Institutes under Ministries",
}
PRIVATE_NAME_PINS = ("Birla Institute of Technology",)
# NIELIT is an autonomous body under MeitY — public, but AISHE leaves it blank
PUBLIC_NAME_PINS = ("Institute of Chemical Technology",
                    "National Institute of Electronics")


def ownership_of(kind, management, name):
    k, m = str(kind or ""), str(management or "")
    if "Aided" in k or "Aided" in m:
        return "Government-aided"
    if k in PUBLIC_KINDS or "Government" in m:
        return "Public"
    if "Private" in k or "Private" in m:
        return "Private"
    if any(p in name for p in PRIVATE_NAME_PINS):
        return "Private"
    if any(p in name for p in PUBLIC_NAME_PINS):
        return "Public"
    return None


def disciplines_of(programs):
    """Macro education types from what the college actually admits into.
    JoSAA's universe is engineering-first; Architecture/Planning/Science
    surface for the SPAs and the BSc-degree institutes (Akshay: show the
    macro type, 3-4 max)."""
    found, has_eng = [], False
    for p in programs.get("list", []):
        b = str(p.get("branch", "")).lower()
        deg = str(p.get("degree", "")).lower()
        if "architect" in b:
            found.append("Architecture")
        elif "planning" in b:
            found.append("Planning")
        elif "bachelor of science" in deg:
            found.append("Science")
        else:
            has_eng = True
    out = (["Engineering"] if has_eng else []) + sorted(set(found))
    return out[:4]


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
    SELECT institute_id, institute_name, ranking_year, nirf_rank, overall_score
    FROM `avantifellows.external_data_sources.nirf_fact_rankings`
    WHERE ranking_category = 'Engineering' AND nirf_rank IS NOT NULL
    """).to_dataframe()

    # Rank-band rows (101-150 etc.): NIRF publishes NO institute_id for these,
    # so they can't ride the crosswalk — they are matched to a college by the
    # NIRF-printed name of its exactly-ranked years (same site, same
    # formatting). This is what turns "PEC #87 (2022)" into "PEC, band 101-150
    # in 2025": a college that slid out of the top 100 still has a current,
    # honest NIRF position instead of a stale rank.
    bands = client.query("""
    SELECT institute_name, ranking_year, rank_band
    FROM `avantifellows.external_data_sources.nirf_fact_rankings`
    WHERE ranking_category = 'Engineering' AND rank_band IS NOT NULL
    """).to_dataframe()

    # ── placement: UG 4-year is what a JoSAA applicant is entering ───────────
    # Fall back through older NIRF editions per institute rather than showing
    # a blank; the year travels with the number so an old figure is never
    # passed off as current.
    # First-party since Aug 2026: nirf_fact_dcs_placements is parsed straight
    # from the institutes' own NIRF filings (external_data_sources nirf/), has
    # ~2x the institutes of the old Dataful-derived aggregate (rank-band
    # colleges file DCS PDFs too), no known holes, and carries
    # graduated_on_time so both percentages share a real denominator.
    place = client.query(f"""
    SELECT p.institute_id, p.edition_year AS ranking_year,
           p.graduating_academic_year AS academic_year, p.median_salary,
           {ENG_UG5_COLS},
           {ENG_UG_INTAKE_COL}
    FROM `avantifellows.external_data_sources.nirf_fact_dcs_placements` p
    {ENG_UG_INTAKE_JOIN}
    {ENG_UG5_JOIN}
    WHERE p.discipline = 'Engineering'
      AND p.program_level = 'UG-4Y'
      AND NOT p.superseded
      AND p.median_salary IS NOT NULL AND p.median_salary > 0
      AND p.graduated_on_time IS NOT NULL AND p.graduated_on_time > 0
    """).to_dataframe()

    # ── gender mix: women as a share of enrolled UG students ─────────────────
    # From the institutes' own NIRF filings (dcs_strength), UG levels only —
    # that's the cohort a JoSAA applicant would join. Latest edition per
    # institute; the year ships with the number.
    gender = client.query("""
    SELECT institute_id, edition_year,
           SUM(male) AS male, SUM(female) AS female
    FROM `avantifellows.external_data_sources.nirf_fact_dcs_strength`
    WHERE discipline = 'Engineering'
      AND program_level LIKE 'UG%'
      AND total IS NOT NULL AND total > 0
    GROUP BY institute_id, edition_year
    """).to_dataframe()

    # ── fees: hand-collected from each college's own fee page ────────────────
    # Entry-year figures (first semester/year incl. one-time charges),
    # annualised in the clean layer. One number per college: the median
    # across its courses — fee spread within a college is small next to the
    # spread between colleges, and a range would crowd the expander.
    fees = client.query("""
    SELECT
      college_id AS aishe_code,
      CAST(APPROX_QUANTILES(IF(demo_id = 'OPEN', annual_total_fee, NULL), 2)[OFFSET(1)] AS INT64) AS annual_fee_open,
      CAST(APPROX_QUANTILES(IF(tuition_fee = 0 AND (category IN ('SC','ST') OR is_pwd), annual_total_fee, NULL), 2)[OFFSET(1)] AS INT64) AS annual_fee_waived,
      CAST(APPROX_QUANTILES(annual_hostel_mess_fee, 2)[OFFSET(1)] AS INT64) AS annual_hostel_mess,
      APPROX_TOP_COUNT(source_url, 1)[OFFSET(0)].value AS source_url
    FROM `avantifellows.external_data_sources.collegefees_fact_costs`
    WHERE counselling = 'JOSAA'
    GROUP BY college_id
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
           opening_rank, opening_is_preparatory,
           (SELECT y FROM latest) AS year, (SELECT r FROM lr) AS round
    FROM `avantifellows.external_data_sources.josaa_fact_cutoffs`
    WHERE year = (SELECT y FROM latest) AND round = (SELECT r FROM lr)
    """).to_dataframe()

    return identity, nirf, bands, place, gender, fees, naac, prog


# ── medical: NMC spine ───────────────────────────────────────────────────────

# NIRF Medical entries whose printed name is a university umbrella or a
# format variant the state-constrained matcher can't resolve. Values are the
# NMC college string VERBATIM (typos like "Varansi" included — it's the join
# key). Every pin verified against the NMC 2024-25 list; university pins name
# the university's one MBBS college. Deliberately NOT pinned: PG-only
# institutes (no MBBS batch), SVIMS Tirupati (its NMC row is the separate
# women's college), Siksha `O` Anusandhan (two SUM Hospital rows in NMC —
# ambiguous which the rank describes).
NIRF_MEDICAL_PINS = {
    "banaras hindu university": "Institute of Medical Sciences, BHU, Varansi",
    "aligarh muslim university": "Jawaharlal Nehru Medical College, Aligarh",
    "srm institute of science technology":
        "SRM Medical College Hospital & Research Centre, Kancheepuram",
    "s r m institute of science technology":
        "SRM Medical College Hospital & Research Centre, Kancheepuram",
    "saveetha institute of medical technical sciences":
        "Saveetha Medical College and Hospital, Kanchipuram",
    "sri ramachandra institute of higher education research":
        "Sri Ramachandra Medical College & Research Institute, Chennai",
    "chettinad academy of research education":
        "Chettinad Hospital & Research Institute, Kanchipuram",
    "psg institute of medical sciences research":
        "PSG Institute of Medical Sciences, Coimbatore",
    "madras medical college government general hospital":
        "Madras Medical College, Chennai",
    "sawai man singh medical college": "SMS Medical College, Jaipur",
    "government medical college hospital|chandigarh":
        "Government Medical College, Chandigarh",
    "government medical college thiruvananthapuram":
        "Medical College, Thiruvananthapuram",
    "university college of medical sciences":
        "University College of Medical Sciences & GTB Hospital, New Delhi",
    "kasturba medical college|manipal": "Kasturba Medical College, Manipal",
    "kasturba medical college|mangaluru": "Kasturba Medical College, Mangalore",
    "kasturba medical college|mengaluru": "Kasturba Medical College, Mangalore",
    "kalinga institute of industrial technology":
        "Kalinga Institute of Medical Sciences, Bhubaneswar",
    "scb medical college hospital": "SCB Medical College, Cuttack",
    "krishna institute of medical sciences deemed university":
        "Krishna Institute of Medical Sciences, Karad",
    "annamalai university": "Rajah Muthiah Medical College, Annamalainagar",
    "jamia hamdard": "Hamdard Institute of Medical Sciences & Research, New Delhi",
    "maharishi markandeshwar":
        "Maharishi Markandeshwar Institute Of Medical Sciences & Research, Mullana, Ambala",
    "maharishi markandeshwar deemed to be university":
        "Maharishi Markandeshwar Institute Of Medical Sciences & Research, Mullana, Ambala",
    "datta meghe institute of medical sciences":
        "Jawaharlal Nehru Medical College, Sawangi (Meghe), Wardha",
    "datta meghe institute of higher education research":
        "Jawaharlal Nehru Medical College, Sawangi (Meghe), Wardha",
    "dr d y patil vidyapeeth":
        "Dr. D Y Patil Medical College, Hospital and Research Centre, Pimpri, Pune",
    "padmashree dr d y patil vidyapeeth mumbai":
        "Padmashree Dr. D.Y.Patil Medical College, Navi Mumbai",
    "pt b d sharma pgims":
        "Pt. B D Sharma Postgraduate Institute of Medical Sciences, Rohtak (Haryana)",
    "pandit bhagwat dayal sharma university of health sciences":
        "Pt. B D Sharma Postgraduate Institute of Medical Sciences, Rohtak (Haryana)",
    # Amrita's ranked medical school is the Kochi flagship (the Faridabad
    # campus opened 2022, after the rank history begins)
    "amrita vishwa vidyapeetham": "Amrita School of Medicine, Elamkara, Kochi",
}

_MED_STOP = {"the", "of", "and"}


def _mnorm(s: str) -> str:
    # apostrophes vanish, not split: "Galgotia's" must equal NIRF's "Galgotias"
    s = re.sub(r"['’`]", "", str(s).lower()).replace("&", " and ")
    s = re.sub(r"\bgovt\.?\b", "government", s)
    s = re.sub(r"\(.*?\)", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    return " ".join(t for t in s.split() if t not in _MED_STOP)


def _mshort(s: str) -> str:
    return _mnorm(str(s).split(",")[0])


# display-only spelling fixes; the NMC string stays verbatim as the join key
NMC_TYPO_FIXES = {"Varansi": "Varanasi", "Odhisha": "Odisha",
                  "Telengana": "Telangana", "Resarch": "Research",
                  "Reseach": "Research", "Instt. Of": "Institute of"}


def clean_nmc_name(s: str) -> str:
    """NMC prints footnote markers and seat-split notes inside the name."""
    s = re.sub(r"\s*\((?=[^)]*(?:seats|Formerly))[^)]*\)", "", str(s))
    s = re.sub(r"[*#]+\s*$", "", s).strip().rstrip(",").strip()
    for bad, good in NMC_TYPO_FIXES.items():
        s = s.replace(bad, good)
    return s


def match_nirf_medical_to_nmc(nirf_med, nmc):
    """NIRF-Medical institute -> NMC college name. State-constrained exact /
    short-name / fuzzy tiers, then the hand pins. Only unique hits count."""
    import difflib
    st_alias = {"orissa": "odisha", "pondicherry": "puducherry",
                "new delhi": "delhi", "nct delhi": "delhi"}
    def nst(s):
        x = _mnorm(s)
        return st_alias.get(x, x)

    nmc_rows = list(nmc.itertuples())
    by_id = {}
    for r in nirf_med[["institute_id", "institute_name", "state", "city"]].drop_duplicates().itertuples():
        pin = (NIRF_MEDICAL_PINS.get(f"{_mnorm(r.institute_name)}|{_mnorm(r.city)}")
               or NIRF_MEDICAL_PINS.get(_mnorm(r.institute_name)))
        if pin:
            by_id[r.institute_id] = pin
            continue
        cand = [x for x in nmc_rows if nst(x.state) == nst(r.state)]
        n_full, n_city = _mnorm(r.institute_name), _mnorm(f"{r.institute_name} {r.city}")
        hits = [x for x in cand if _mnorm(x.college) in (n_full, n_city)]
        if not hits:
            hits = [x for x in cand if _mshort(x.college) == _mshort(r.institute_name)]
        if not hits:
            hits = [x for x in cand
                    if difflib.SequenceMatcher(None, _mnorm(x.college), n_city).ratio() >= 0.88
                    or difflib.SequenceMatcher(None, _mshort(x.college), _mshort(r.institute_name)).ratio() >= 0.92]
        if len(hits) == 1:
            by_id[r.institute_id] = hits[0].college
    return by_id


def build_medical(client):
    print("Querying BigQuery (medical)…")
    nmc = client.query("""
    SELECT college, state, district, university, management_category,
           year_of_inception, annual_intake_seats
    FROM `avantifellows.external_data_sources.nmc_fact_mbbs_seats`
    WHERE snapshot = '2024-25'
    """).to_dataframe()

    xwalk = client.query("""
    WITH aishe AS (
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
    SELECT m.nmc_college_name, m.aishe_code, m.nirf_institute_ids,
           a.name AS aishe_name, a.website, a.kind
    FROM `avantifellows.external_data_sources.overall_college_mapping` AS m
    LEFT JOIN aishe AS a ON a.aishe_code = m.aishe_code
    WHERE m.nmc_college_name IS NOT NULL AND m.nmc_college_name != ''
    """).to_dataframe()

    nirf_med = client.query("""
    SELECT institute_id, institute_name, state, city, ranking_year,
           nirf_rank, overall_score
    FROM `avantifellows.external_data_sources.nirf_fact_rankings`
    WHERE ranking_category = 'Medical' AND nirf_rank IS NOT NULL
    """).to_dataframe()

    place = client.query("""
    SELECT institute_id, edition_year AS ranking_year,
           graduating_academic_year AS academic_year, median_salary,
           graduated_on_time, students_placed, higher_studies_selected,
           first_year_intake
    FROM `avantifellows.external_data_sources.nirf_fact_dcs_placements`
    WHERE discipline = 'Medical' AND program_level = 'UG-5Y'
      AND NOT superseded
      AND median_salary IS NOT NULL AND median_salary > 0
      AND graduated_on_time IS NOT NULL AND graduated_on_time > 0
    """).to_dataframe()

    gender = client.query("""
    SELECT institute_id, edition_year,
           SUM(male) AS male, SUM(female) AS female
    FROM `avantifellows.external_data_sources.nirf_fact_dcs_strength`
    WHERE discipline = 'Medical' AND program_level = 'UG-5Y'
      AND total IS NOT NULL AND total > 0
    GROUP BY institute_id, edition_year
    """).to_dataframe()

    return nmc, xwalk, nirf_med, place, gender


# ── MHT-CET: State CET Cell spine (Maharashtra) ─────────────────────────────

MH_DISTRICTS = {
    "Ahmednagar", "Akola", "Amravati", "Aurangabad", "Chhatrapati Sambhajinagar",
    "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli",
    "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai",
    "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Dharashiv",
    "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara",
    "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal",
}

STREAM_DEGREE = {
    "engineering": ("B.E. / B.Tech", 4, "Engineering"),
    "pharmacy": ("B.Pharm", 4, "Pharmacy"),
    "architecture": ("B.Arch", 5, "Architecture"),
    "bdesign": ("B.Des", 4, "Design"),
}


def mh_district_of(name: str):
    """The CET Cell prints '…, City' — accept it as the district only when the
    city IS a district name; 'Pimpri' or 'Lonere' stay null rather than lie."""
    tail = str(name).rsplit(",", 1)[-1].strip().rstrip(".")
    return tail if tail in MH_DISTRICTS else None


def mhtcet_ownership(college_type: str):
    t = str(college_type or "")
    if t in ("Govt", "State-Univ-Dept"):
        return "Public"
    if t == "Govt-Aided":
        return "Government-aided"
    if t.startswith("Private") or t == "Deemed":
        return "Private"
    return None


# a bare "University of <place>" or "<place> University" ("University of
# Lucknow", "Rajasthan University") is a subset of many longer names. The
# second form only for places: "Alliance University" is a real match.
_PLACES = ("rajasthan|punjab|gujarat|kerala|assam|bihar|odisha|orissa|goa|manipur|mizoram|"
           "nagaland|sikkim|tripura|meghalaya|jharkhand|uttarakhand|haryana|karnataka|"
           "maharashtra|telangana|chhattisgarh|lucknow|mumbai|bombay|calcutta|kolkata|madras|"
           "chennai|mysore|gauhati|delhi|allahabad|patna|jammu|kashmir|pune|hyderabad|kerela")
# (_mnorm drops "of", so both spellings)
_NATIONAL = re.compile(r"^(indian institute (of )?(information )?technology|national institute (of )?technology)\b")
_UNIV_OF_CITY = re.compile(rf"^(the )?university( of)? [a-z]+$|^({_PLACES}) university$")

# one NIRF list per college when it is ranked in several the same year
_NIRF_CAT_ORDER = ["Engineering", "Pharmacy", "Architecture and Planning",
                   "Law", "Medical", "College", "Research Institutions",
                   "University", "Overall"]


def _latest_nirf(frames):
    """Rows of the college's headline NIRF list, newest first. Ties within a
    year go by _NIRF_CAT_ORDER, then rank, so the pick never depends on row
    order."""
    g = pd.concat(frames)
    g = g.assign(_cat=g.ranking_category.map(
        lambda c: _NIRF_CAT_ORDER.index(c) if c in _NIRF_CAT_ORDER else 99))
    g = g.sort_values(["ranking_year", "_cat", "nirf_rank"],
                      ascending=[False, True, True], kind="mergesort")
    top_cat = g.iloc[0]["ranking_category"]
    g = g[g["ranking_category"] == top_cat].drop_duplicates(subset=["ranking_year"])
    return top_cat, g.drop(columns="_cat")


def match_nirf_to_mhtcet(nirf_mh, colleges):
    """NIRF (Maharashtra, Engineering/Pharmacy/Architecture) institute -> CET
    college_code. Exact / short-name / token-subset tiers; unique hits only.
    Both lists are Maharashtra, so the usual state constraint is implicit."""
    def toks(x):
        return set(_mnorm(x).split())
    by_code = [(c.college_code, _mnorm(c.college_name), _mshort(c.college_name),
                toks(c.college_name)) for c in colleges.itertuples()]
    out = {}
    for r in nirf_mh[["institute_id", "institute_name"]].drop_duplicates().itertuples():
        n_full, n_short, n_toks = _mnorm(r.institute_name), _mshort(r.institute_name), toks(r.institute_name)
        hits = [c for c, full, short, _ in by_code if full == n_full or short == n_short]
        # "University of Lucknow" is {university, lucknow}, a subset of
        # "Dr. Ram Manohar Lohiya National Law University, Lucknow": a bare
        # "University of <city>" never matches by token subset
        # IIT / NIT / IIIT names are generic words + a city: "Indian Institute
        # of Technology (BHU) Varanasi" is a subset of "Indian Institute of
        # Handloom Technology, Varanasi". They match exactly via JoSAA.
        if not hits and not _UNIV_OF_CITY.match(n_full) and not _NATIONAL.match(n_full):
            hits = [c for c, _, _, t in by_code if n_toks and n_toks <= t]
        if len(set(hits)) == 1:
            out[r.institute_id] = hits[0]
    # NIRF re-issues an institute's id when the format changes
    # (IR-2-C-OC-C-22470 in 2018, IR-C-C-22470 since) but keeps the trailing
    # number. A name match on one spelling ("St. Stephen`s", 2018) must pull
    # in every sibling id, or the college shows a 2018 rank as current.
    def tail(iid):
        m = re.search(r"(\d+)$", str(iid))
        return m.group(1) if m else None
    code_by_tail = {tail(i): c for i, c in out.items() if tail(i)}
    for iid in nirf_mh["institute_id"].unique():
        t = tail(iid)
        if t in code_by_tail and iid not in out:
            out[iid] = code_by_tail[t]
    return out


def build_mhtcet(client):
    print("Querying BigQuery (MHT-CET)…")
    T = "`avantifellows.external_data_sources.mhtcet_fact_cutoffs`"
    colleges = client.query(f"""
    SELECT college_code,
           ANY_VALUE(college_name) AS college_name,
           ANY_VALUE(college_type) AS college_type,
           ANY_VALUE(status) AS status,
           ANY_VALUE(home_university) AS home_university,
           ANY_VALUE(source_url) AS source_url,
           MAX(year) AS year
    FROM {T}
    WHERE year = (SELECT MAX(year) FROM {T})
    GROUP BY college_code
    """).to_dataframe()

    # one indicative rank per branch: open category, all-gender seats, the
    # LOOSEST closing across quotas (state level / home / other) — the easier
    # door, comparable across colleges and never overstating difficulty.
    # Opening rides on the same row so the pair is one real quota.
    programs = client.query(f"""
    SELECT college_code, stream, branch_name,
           ARRAY_AGG(
             IF(category = 'GEN' AND gender = 'All',
                STRUCT(opening_rank, closing_rank, quota), NULL)
             IGNORE NULLS ORDER BY closing_rank DESC LIMIT 1
           )[SAFE_OFFSET(0)] AS best
    FROM {T}
    WHERE year = (SELECT MAX(year) FROM {T})
    GROUP BY college_code, stream, branch_name
    """).to_dataframe()

    nirf_mh = client.query("""
    SELECT institute_id, institute_name, ranking_category, ranking_year,
           nirf_rank, overall_score
    FROM `avantifellows.external_data_sources.nirf_fact_rankings`
    WHERE state = 'Maharashtra' AND nirf_rank IS NOT NULL
      AND ranking_category IN ('Engineering', 'Pharmacy', 'Architecture and Planning')
    """).to_dataframe()

    place = client.query(f"""
    SELECT p.institute_id, p.edition_year AS ranking_year,
           p.graduating_academic_year AS academic_year, p.median_salary,
           {ENG_UG5_COLS},
           {ENG_UG_INTAKE_COL}, p.discipline
    FROM `avantifellows.external_data_sources.nirf_fact_dcs_placements` p
    {ENG_UG_INTAKE_JOIN}
    {ENG_UG5_JOIN}
    WHERE p.discipline IN ('Engineering', 'Pharmacy') AND p.program_level = 'UG-4Y'
      AND NOT p.superseded
      AND p.median_salary IS NOT NULL AND p.median_salary > 0
      AND p.graduated_on_time IS NOT NULL AND p.graduated_on_time > 0
    """).to_dataframe()
    return colleges, programs, nirf_mh, place


# ── the other state counsellings + CLAT: one spec-driven spine ──────────────
# Each spec names the cutoff fact table's columns and the row filter that
# means "open category, all-gender, no sub-quota" — the one number that is
# comparable across colleges. The rank is the LOOSEST closing across quotas /
# rounds / phases (the easier door; never overstates difficulty), same rule
# as JoSAA and MHT-CET above.
D = "avantifellows.external_data_sources"
LATEST_NIRF = 2025  # newest NIRF edition loaded (matches the audit and pages/colleges.js)
# First-year intake for an engineering placement row = UG 4-year + UG 5-year
# (dual degree) sanctioned intake for the SAME entry year. The placement row
# only carries its own level's intake, so IIT Bombay's 2020-21 entry read
# 1,030 instead of 1,241 (211 dual-degree seats). Rows from other
# disciplines keep their own figure; a missing year falls back to it.
ENG_UG_INTAKE_JOIN = """
    LEFT JOIN (
      SELECT institute_id, academic_year, SUM(sanctioned_intake) AS ug_intake
      FROM `avantifellows.external_data_sources.nirf_fact_dcs_intake`
      WHERE discipline = 'Engineering' AND NOT superseded
        AND program_level IN ('UG-4Y', 'UG-5Y')
      GROUP BY 1, 2) i
    ON i.institute_id = p.institute_id AND i.academic_year = p.intake_academic_year"""
# Placement counts likewise add the UG 5-year graduates of the SAME
# graduating year, so the % placed and the intake describe one group. Only
# when all three 5-year counts exist. Median salary cannot be combined (two
# medians don't make one) and stays the 4-year figure; includes_dual_degree
# lets the card say so.
ENG_UG5_JOIN = """
    LEFT JOIN (
      SELECT institute_id, graduating_academic_year,
             SUM(graduated_on_time) AS g5, SUM(students_placed) AS p5,
             SUM(higher_studies_selected) AS h5
      FROM `avantifellows.external_data_sources.nirf_fact_dcs_placements`
      WHERE discipline = 'Engineering' AND program_level = 'UG-5Y' AND NOT superseded
        AND graduated_on_time > 0 AND students_placed IS NOT NULL
        AND higher_studies_selected IS NOT NULL
      GROUP BY 1, 2) f
    ON f.institute_id = p.institute_id
   AND f.graduating_academic_year = p.graduating_academic_year"""
_DUAL = ("(p.discipline = 'Engineering' AND p.program_level = 'UG-4Y' AND f.g5 IS NOT NULL "
         "AND p.students_placed IS NOT NULL AND p.higher_studies_selected IS NOT NULL)")
ENG_UG5_COLS = (f"IF({_DUAL}, p.graduated_on_time + f.g5, p.graduated_on_time) AS graduated_on_time, "
                f"IF({_DUAL}, p.students_placed + f.p5, p.students_placed) AS students_placed, "
                f"IF({_DUAL}, p.higher_studies_selected + f.h5, p.higher_studies_selected) AS higher_studies_selected, "
                f"COALESCE({_DUAL}, FALSE) AS includes_dual_degree")
ENG_UG_INTAKE_COL = ("IF(p.discipline = 'Engineering' AND p.program_level = 'UG-4Y', "
                     "COALESCE(i.ug_intake, p.first_year_intake), p.first_year_intake) AS first_year_intake")
STATE_SPECS = {
    "KCET": dict(table="kcet_fact_cutoffs", year="year", name="college_name",
                 code="college_code", branch="course_name", ctype="college_type",
                 district=None, university=None, stream="stream",
                 open_where="category_code = 'GM' AND domicile_pool = 'GEN'",
                 key_by_name=True,  # KEA gives one college two codes (aided / private seats)
                 label="KCET", counselling="KEA (KCET)", map_exam="KCET",
                 state="Karnataka", source="KEA {y} Round 3"),
    "TNEA": dict(table="tnea_fact_cutoffs", year="exam_year", name="college",
                 code="code", branch="branch", ctype="college_type",
                 district="district", university=None, stream=None,
                 open_where="category = 'GEN'",
                 label="TNEA", counselling="TNEA (Anna University)", map_exam="TNEA",
                 state="Tamil Nadu", source="TNEA {y}"),
    "WBJEE": dict(table="wbjee_fact_cutoffs", year="exam_year", name="institute",
                  code=None, branch="program", ctype="college_type",
                  district=None, university=None, stream=None,
                  open_where="category = 'GEN' AND sub_pool = '' AND (seat_type IS NULL OR seat_type != 'JEE(Main) Seats')",
                  label="WBJEE", counselling="WBJEE Board", map_exam="WBJEE",
                  state="West Bengal", source="WBJEE {y}"),
    "KEAM": dict(table="keam_fact_cutoffs", year="exam_year", name="college_name",
                 code="college_code", branch="course", ctype="college_type",
                 district=None, university=None, stream=None,
                 open_where="category = 'GEN' AND sub_pool = '' AND phase != 'Trial'",
                 label="KEAM", counselling="CEE Kerala (KEAM)", map_exam="KEAM",
                 state="Kerala", source="KEAM {y}"),
    "AP EAPCET": dict(table="apeapcet_fact_cutoffs", year="exam_year", name="college_name",
                      code="college_code", branch="branch_code", ctype="college_type",
                      district=None, university=None, stream=None,
                      open_where="category = 'GEN' AND sub_pool = ''", gender_col="gender",
                      label="AP EAPCET", counselling="AP-EAPCET counselling (APSCHE)",
                      map_exam="AP-EAPCET", state="Andhra Pradesh", source="AP-EAPCET {y}"),
    "TG-EAPCET": dict(table="tgeapcet_fact_cutoffs", year="year", name="college_name",
                      code="college_code", branch="branch_name", ctype="college_type",
                      district=None, university="affiliated_to", stream="stream",
                      open_where="category = 'GEN'", gender_col="gender",
                      label="TG-EAPCET", counselling="TG-EAPCET counselling (TGCHE)",
                      map_exam="TG-EAPCET", state="Telangana", source="TG-EAPCET {y}"),
    "OJEE": dict(table="ojee_fact_cutoffs", year="exam_year", name="institute",
                 code=None, branch="programme", ctype=None,
                 district=None, university=None, stream=None,
                 open_where="category = 'GEN' AND seat_type = 'Gender Neutral' AND NOT tfw",
                 label="OJEE", counselling="OJEE counselling", map_exam="OJEE",
                 state="Odisha", source="OJEE {y}"),
    "CLAT": dict(table="clat_fact_cutoffs", year="year", name="college",
                 code=None, branch="program", ctype=None,
                 district=None, university=None, stream=None,
                 rank_col="air_cutoff", seats_col="seats",
                 open_where="category_canonical = 'GEN' AND NOT is_women_row AND NOT is_pwd_row AND domicile_state IS NULL",
                 label="CLAT", counselling="CLAT Consortium counselling", map_exam="CLAT",
                 state=None, source="CLAT {y}"),
    # JEE Main ranks; CCA's B.Arch rides its Paper 2 rank (own scale, like
    # MHT-CET's architecture stream). Defence / Sports merit positions and
    # the TFW pool never make the open number, nor does the SPOT round: it
    # fills leftover seats at ranks several times deeper than Round 3
    # (CCET Mechanical 2.5 lakh -> 14.6 lakh).
    "JAC Chandigarh": dict(table="jacchd_fact_cutoffs", year="year", name="institute",
                           code=None, branch="programme", ctype=None,
                           district=None, university=None, stream=None,
                           open_where="category = 'GEN' AND NOT tfw AND rank_basis != 'category merit list' AND round != 'SPOT Round'",
                           label="JEE Main", counselling="JAC Chandigarh", map_exam="JAC-Chandigarh",
                           state="Chandigarh", state_by_name={"Hoshiarpur": "Punjab"},
                           source="JAC Chandigarh {y}",
                           rank_note="Indicative open-category JEE Main closing rank (B.Arch: Paper 2 rank)."),
    # UPTAC (AKTU): JEE Main ranks, open category without a U.P.
    # sub-category, regular co-ed seats; loosest over all rounds incl. the
    # special round (open to non-U.P. candidates)
    "UPTAC": dict(table="uptac_fact_cutoffs", year="year", name="institute",
                  code=None, branch="branch", ctype=None,
                  district=None, university=None, stream=None,
                  open_where=("rank_basis = 'JEE Main rank' AND allotted AND programme LIKE 'B.Tech (All%' "
                              "AND parent_category = 'GEN' AND sub_category IS NULL AND NOT tfw "
                              "AND seat_pool IS NULL AND seat_gender = 'Co-Education'"),
                  # a card only for institutes UPTAC fills B.Tech seats for
                  # (MBA / MCA / lateral-only institutes have no B.Tech row)
                  all_where="programme LIKE 'B.Tech (All%' AND rank_basis = 'JEE Main rank' AND allotted",
                  nirf_cats=["Engineering"],
                  label="JEE Main", counselling="UPTAC (AKTU)", map_exam="UPTAC",
                  state="Uttar Pradesh", source="UPTAC {y}"),
    "GUJCET": dict(table="gujcet_fact_cutoffs", year="year", name="college_name",
                   code=None, branch="branch_name", ctype="college_type",
                   district=None, university=None, stream="stream",
                   open_where="category = 'GEN' AND sub_pool = '' AND gender = 'All'",
                   label="GUJCET", counselling="ACPC (GUJCET)", map_exam="GUJCET",
                   state="Gujarat", source="ACPC {y}"),
}

# CLAT's table has no state column; NLU names carry the city
NLU_CITY_STATE = {
    "Patna": "Bihar", "Visakhapatnam": "Andhra Pradesh", "Jabalpur": "Madhya Pradesh",
    "Prayagraj": "Uttar Pradesh", "Lucknow": "Uttar Pradesh", "Gandhinagar": "Gujarat",
    "Silvassa": "Dadra and Nagar Haveli", "Raipur": "Chhattisgarh", "Shimla": "Himachal Pradesh",
    "Goa": "Goa", "Chhatrapati Sambhajinagar": "Maharashtra", "Mumbai": "Maharashtra",
    "Nagpur": "Maharashtra", "Hyderabad": "Telangana", "Bengaluru": "Karnataka",
    "Sonepat": "Haryana", "Jodhpur": "Rajasthan", "Odisha": "Odisha", "Agartala": "Tripura",
    "Assam": "Assam", "Ranchi": "Jharkhand", "Punjab": "Punjab",
    "Tiruchirappalli": "Tamil Nadu", "Bhopal": "Madhya Pradesh", "Kochi": "Kerala",
    "Kolkata": "West Bengal",
}

AP_BRANCH_LEGEND = Path(__file__).resolve().parent.parent.parent / "external_data_sources" / "apeapcet" / "branch_codes.csv"


def generic_ownership(ctype):
    t = str(ctype or "")
    if not t or t == "Unknown":
        return None
    if "Aided" in t:
        return "Government-aided"
    if t in ("Govt", "Government", "Univ-Govt", "State-Univ-Dept") or t.startswith("Govt"):
        return "Public"
    if "Private" in t or "Deemed" in t or "SelfFin" in t or "SelfSup" in t or t == "Private/SF":
        return "Private"
    return None


def discipline_of_program(name, stream=None):
    n = str(name).lower()
    st = str(stream or "").lower()
    if "law" in st or "ll.b" in n or "llb" in n:
        return "Law", "LL.B. (integrated)", 5
    if "pharm" in n or st == "pharmacy":
        return "Pharmacy", "B.Pharm", 4
    if "arch" in n or st == "architecture":
        return "Architecture", "B.Arch", 5
    if "plan" in n and "planning" in n:
        return "Planning", "B.Plan", 4
    if "integrated" in n and "mba" in n:
        return "Engineering", "Integrated B.E.-MBA", 5
    return "Engineering", "B.E. / B.Tech", 4


def build_state_spines(client):
    import csv
    ap_legend = {}
    if AP_BRANCH_LEGEND.exists():
        with open(AP_BRANCH_LEGEND) as fh:
            ap_legend = {r["branch_code"]: r["branch_name"].title() for r in csv.DictReader(fh)}
    out = {}
    for exam, sp in STATE_SPECS.items():
        T = f"`{D}.{sp['table']}`"
        rank = sp.get("rank_col", "closing_rank")
        code = sp["code"] or "NULL"
        ctype = sp["ctype"] or "NULL"
        dist = sp["district"] or "NULL"
        uni = sp["university"] or "NULL"
        stream = sp["stream"] or "NULL"
        seats = sp.get("seats_col") or "NULL"
        gcol = sp.get("gender_col")
        # AP/TG publish Boys and Girls pools; the open number is the Boys
        # (general) pool — the Girls pool is only used for women's colleges,
        # which have no Boys rows at all (see the fallback below)
        rank_expr = f"MAX(IF({gcol} = 'Boys', {rank}, NULL))" if gcol else f"MAX({rank})"
        girls_expr = f"MAX(IF({gcol} = 'Girls', {rank}, NULL))" if gcol else "NULL"
        q = f"""
        SELECT {sp['name']} AS college_name,
               CAST({code} AS STRING) AS college_code,
               CAST({ctype} AS STRING) AS college_type,
               CAST({dist} AS STRING) AS district,
               CAST({uni} AS STRING) AS university,
               CAST({stream} AS STRING) AS stream,
               {sp['branch']} AS branch,
               {rank_expr} AS closing_rank,
               {girls_expr} AS girls_rank,
               MAX({seats}) AS seats,
               MAX({sp['year']}) AS year
        FROM {T}
        WHERE {sp['year']} = (SELECT MAX({sp['year']}) FROM {T})
          AND ({sp['open_where']})
        GROUP BY 1, 2, 3, 4, 5, 6, 7
        """
        df = client.query(q).to_dataframe()
        # colleges that publish NO open-category row still belong on the tab
        allq = f"""
        SELECT {sp['name']} AS college_name, CAST({code} AS STRING) AS college_code,
               ANY_VALUE(CAST({ctype} AS STRING)) AS college_type,
               ANY_VALUE(CAST({dist} AS STRING)) AS district,
               ANY_VALUE(CAST({uni} AS STRING)) AS university,
               ANY_VALUE(CAST({stream} AS STRING)) AS stream,
               MAX({sp['year']}) AS year
        FROM {T} WHERE {sp['year']} = (SELECT MAX({sp['year']}) FROM {T})
          AND ({sp.get('all_where', 'TRUE')})
        GROUP BY 1, 2
        """
        allc = client.query(allq).to_dataframe()
        if exam == "AP EAPCET":
            df["branch"] = df["branch"].map(lambda b: ap_legend.get(str(b), str(b)))
        if gcol and len(df):
            # women's colleges: no Boys pool anywhere -> their open number is
            # the Girls pool
            has_boys = df.groupby("college_name")["closing_rank"].transform(lambda c: c.notna().any())
            df.loc[~has_boys, "closing_rank"] = df.loc[~has_boys, "girls_rank"]
            df["women_only"] = ~has_boys
        else:
            df["women_only"] = False
        out[exam] = (allc, df)
        print(f"  {exam}: {len(allc)} colleges, {len(df)} open-category branch rows")
    return out


def main():
    careers_by_branch = career_lookup()
    careers_by_branch_mhtcet = career_lookup("MHT-CET")
    careers_by_spine = {exam: career_lookup(sp["map_exam"]) for exam, sp in STATE_SPECS.items()}
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    from google.cloud import bigquery
    client = bigquery.Client(project="avantifellows", location="asia-south1")
    identity, nirf, bands, place, gender, fees, naac, prog = build_josaa(client)
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

    fees_by_aishe = {r.aishe_code: r for r in fees.itertuples()}

    gender_by_id = {}
    for iid, g in gender.groupby("institute_id"):
        gender_by_id[iid] = g.sort_values("edition_year", ascending=False).iloc[0]

    # band rows keyed by normalised NIRF-printed name
    def _nname(x):
        return re.sub(r"[^a-z0-9]", "", str(x).lower())
    bands_by_name = {}
    for r in bands.itertuples():
        bands_by_name.setdefault(_nname(r.institute_name), []).append(
            (int(r.ranking_year), r.rank_band))

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
                # rank within its NIRF category — never compare across
                # categories (Engineering #40 vs Medical #40 means nothing)
                "category": "Engineering",
                "rank": int(top.nirf_rank),
                "score": (round(float(top.overall_score), 2)
                          if top.overall_score == top.overall_score else None),
                "ranking_year": int(top.ranking_year),
                # Score as well as rank. Rank is ORDINAL — it moves when other
                # institutes move — so a falling rank can hide a rising college:
                # IIT Ropar's score went 55.95 -> 59.66 since 2020 while its rank
                # fell #25 -> #32. It improved; the field improved faster. The
                # score is a property of the institute itself, is present on
                # 100% of Engineering rows, and IS comparable across years (the
                # rank-1 score sits at 88-90 every year; the moving mean is only
                # because NIRF publishes 100 institutes some years and 200 in
                # others, which lengthens the tail).
                "rank_history": [
                    {"year": int(x.ranking_year), "rank": int(x.nirf_rank),
                     "score": (round(float(x.overall_score), 2)
                               if x.overall_score == x.overall_score else None)}
                    for x in g.head(6).itertuples()
                ],
            }
            # If the college fell out of the exact-rank list into a band in a
            # LATER year, surface that as the current position — the exact
            # rank stays as history.
            band_hits = []
            for nm in set(g.institute_name.dropna()):
                band_hits += bands_by_name.get(_nname(nm), [])
            band_hits = [b for b in band_hits if b[0] > int(top.ranking_year)]
            if band_hits:
                by, bb = max(band_hits)
                nirf_block["latest_band"] = {"year": by, "band": bb}

        placement = None
        pframes = [place_by_id[n] for n in nids if n in place_by_id]
        if pframes:
            g = (pd.concat(pframes)
                   .sort_values(["ranking_year", "academic_year"], ascending=False))
            if True:
                p = g.iloc[0]
                def num(v, cast=float):
                    return None if v != v else cast(v)
                # "Placed" counts JOBS ONLY, so a graduate who went to an MS or
                # a PhD reads as "not placed". That understates research-heavy
                # institutes badly — IIT Bombay 73.8% placed vs 99.9% with an
                # outcome. Amogh flagged the IIT numbers as implausible, and he
                # was right. Both percentages ship, on the same denominator:
                # graduated_on_time as the institute filed it with NIRF.
                placed_n = num(p.students_placed, int)
                higher_n = num(p.higher_studies_selected, int)
                grad_n = num(p.graduated_on_time, int)
                pct = outcome = None
                if grad_n:
                    if placed_n is not None:
                        pct = round(placed_n / grad_n * 100, 1)
                    if placed_n is not None and higher_n is not None:
                        outcome = round(min(100.0, (placed_n + higher_n) / grad_n * 100), 1)

                placement = {
                    "median_salary": num(p.median_salary, int),
                    "percentage_placed": pct,
                    # placed OR higher studies — what "did this degree lead
                    # somewhere" actually means for an engineering cohort.
                    "percentage_with_outcome": outcome,
                    "students_placed": num(p.students_placed, int),
                    "higher_studies_selected": num(p.higher_studies_selected, int),
                    "first_year_intake": num(p.first_year_intake, int),
                    "includes_dual_degree": bool(getattr(p, "includes_dual_degree", False)),
                    "academic_year": p.academic_year,
                    "ranking_year": int(p.ranking_year),
                    "source": "NIRF Engineering, UG 4-year",
                    # NIRF publishes one figure per institute per programme LEVEL,
                    # never per branch — a CSE and a Civil student see the same
                    # number. Stated so the UI can say so rather than let a
                    # student over-read it.
                    "is_branch_specific": False,
                }

        ug_gender = None
        grows = [gender_by_id[n] for n in nids if n in gender_by_id]
        if grows:
            gr = max(grows, key=lambda x: x.edition_year)
            m, f = int(gr.male), int(gr.female)
            if m + f > 0:
                ug_gender = {
                    "female_pct": round(f / (m + f) * 100, 1),
                    "female": f,
                    "male": m,
                    "edition_year": int(gr.edition_year),
                }

        fee_block = None
        fr = fees_by_aishe.get(r.aishe_code)
        if fr is not None and not pd.isna(fr.annual_fee_open):
            def _i(v):
                return None if pd.isna(v) else int(v)
            fee_block = {
                "annual_fee": _i(fr.annual_fee_open),
                "annual_fee_waived": _i(fr.annual_fee_waived),
                "annual_hostel_mess": _i(fr.annual_hostel_mess),
                "cycle": "2025-26",
                "source_url": fr.source_url,
                # first-year figure including one-time charges; later years
                # are usually lower. The UI says so.
                "is_entry_year": True,
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
                        if k not in best or rank > best[k][0]:
                            # opening rank travels with its own closing row so
                            # the pair is one real quota, never a mix
                            orank, oprep = parse_rank(x.opening_rank)
                            best[k] = (rank, orank if not oprep else None)
            lst = [{"branch": b, "years": y, "degree": d,
                    "indicative_closing_rank": (best.get((b, y, d)) or (None,))[0],
                    "indicative_opening_rank": (best.get((b, y, d)) or (None, None))[1],
                    "career_id": careers_by_branch.get(b)}
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
            "ownership": ownership_of(r.kind, r.management, josaa_name),
            "disciplines": disciplines_of(programs),
            "year_established": (int(r.year_of_establishment)
                                 if r.year_of_establishment == r.year_of_establishment
                                 and r.year_of_establishment is not None else None),
            "website": r.website if isinstance(r.website, str) else None,
            "entrance_exams": exams,
            "counselling": "JoSAA",
            "programs": programs,
            "nirf": nirf_block,
            "ug_gender": ug_gender,
            "fees": fee_block,
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

    # ── medical rows: NMC spine ──────────────────────────────────────────────
    nmc, xwalk, nirf_med, mplace, mgender = build_medical(client)
    print(f"  nmc {len(nmc)}  crosswalked {len(xwalk)}  nirf-medical rows {len(nirf_med)}  "
          f"placement {len(mplace)}  gender {len(mgender)}")

    # the MBBS programme links to its career page like any JoSAA branch does
    careers_file = json.load(open("public/data/careers/careers.json"))
    mbbs_career = next((c["career_id"] for c in careers_file
                        if c.get("branch_id") == "MBBS"), None)

    xwalk_by_nmc = {r.nmc_college_name: r for r in xwalk.itertuples()}
    nirf_by_nmc = {}
    for iid, cname in match_nirf_medical_to_nmc(nirf_med, nmc).items():
        nirf_by_nmc.setdefault(cname, set()).add(iid)
    med_nirf_by_id = {}
    for iid, g in nirf_med.groupby("institute_id"):
        med_nirf_by_id[iid] = g.sort_values("ranking_year", ascending=False)
    mplace_by_id = {}
    for iid, g in mplace.groupby("institute_id"):
        mplace_by_id[iid] = g.sort_values(["ranking_year", "academic_year"],
                                          ascending=False)
    mgender_by_id = {}
    for iid, g in mgender.groupby("institute_id"):
        mgender_by_id[iid] = g.sort_values("edition_year", ascending=False).iloc[0]

    used_ids = {z["college_id"] for z in rows}
    med_rows = []
    for r in nmc.itertuples():
        xr = xwalk_by_nmc.get(r.college)
        # NIRF ids: the crosswalk's where present, plus the name-matched ones
        nids = set(list(xr.nirf_institute_ids) if xr is not None
                   and xr.nirf_institute_ids is not None else [])
        nids |= nirf_by_nmc.get(r.college, set())

        nirf_block = None
        frames = [med_nirf_by_id[n] for n in nids if n in med_nirf_by_id]
        if frames:
            g = (pd.concat(frames)
                   .drop_duplicates(subset=["ranking_year"], keep="first")
                   .sort_values("ranking_year", ascending=False))
            top = g.iloc[0]
            nirf_block = {
                "category": "Medical",
                "rank": int(top.nirf_rank),
                "score": (round(float(top.overall_score), 2)
                          if top.overall_score == top.overall_score else None),
                "ranking_year": int(top.ranking_year),
                "rank_history": [
                    {"year": int(x.ranking_year), "rank": int(x.nirf_rank),
                     "score": (round(float(x.overall_score), 2)
                               if x.overall_score == x.overall_score else None)}
                    for x in g.head(6).itertuples()
                ],
            }

        placement = None
        pframes = [mplace_by_id[n] for n in nids if n in mplace_by_id]
        if pframes:
            g = pd.concat(pframes).sort_values(["ranking_year", "academic_year"],
                                               ascending=False)
            pr = g.iloc[0]
            def num(v, cast=float):
                return None if v != v else cast(v)
            placed_n = num(pr.students_placed, int)
            higher_n = num(pr.higher_studies_selected, int)
            grad_n = num(pr.graduated_on_time, int)
            pct = outcome = None
            if grad_n:
                if placed_n is not None:
                    pct = round(placed_n / grad_n * 100, 1)
                if placed_n is not None and higher_n is not None:
                    outcome = round(min(100.0, (placed_n + higher_n) / grad_n * 100), 1)
            placement = {
                "median_salary": num(pr.median_salary, int),
                "percentage_placed": pct,
                "percentage_with_outcome": outcome,
                "students_placed": num(pr.students_placed, int),
                "higher_studies_selected": num(pr.higher_studies_selected, int),
                "first_year_intake": num(pr.first_year_intake, int),
                "includes_dual_degree": bool(getattr(pr, "includes_dual_degree", False)),
                "academic_year": pr.academic_year,
                "ranking_year": int(pr.ranking_year),
                "source": "NIRF Medical, MBBS (UG 5-year)",
                "is_branch_specific": False,
            }

        ug_gender = None
        grows = [mgender_by_id[n] for n in nids if n in mgender_by_id]
        if grows:
            gr = max(grows, key=lambda x: x.edition_year)
            m, f = int(gr.male), int(gr.female)
            if m + f > 0:
                ug_gender = {
                    "female_pct": round(f / (m + f) * 100, 1),
                    "female": f,
                    "male": m,
                    "edition_year": int(gr.edition_year),
                }

        aishe_code = (xr.aishe_code if xr is not None
                      and isinstance(xr.aishe_code, str) and xr.aishe_code else None)
        nb = naac_by_aishe.get(aishe_code) if aishe_code else None
        is_aiims = "All India Institute of Medical Science" in str(r.college)
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
            naac_block = {
                "grade": None, "cgpa": None, "cycle": None,
                # AIIMS are Institutes of National Importance, same as IITs
                "not_applicable_reason": (
                    "Institutes of National Importance are exempt from NAAC accreditation"
                    if is_aiims else None),
            }

        display = clean_nmc_name(r.college)
        seats = (int(r.annual_intake_seats)
                 if r.annual_intake_seats == r.annual_intake_seats
                 and r.annual_intake_seats is not None else None)
        programs = {
            "count": 1,
            "degrees": ["MBBS"],
            "list": [{
                "branch": "MBBS",
                "years": 5.5,
                "degree": "MBBS",
                "seats": seats,
                "indicative_closing_rank": None,
                "indicative_opening_rank": None,
                "career_id": mbbs_career,
            }],
            "source": "NMC 2024-25",
            "rank_note": None,
            "seats_note": "Annual MBBS intake approved by NMC.",
        }

        mgmt = str(r.management_category or "")
        ownership = ("Public" if mgmt == "Government"
                     else "Private" if mgmt in ("Trust", "Society", "Private")
                     else None)

        full_slug = re.sub(r"[^a-z0-9]+", "-", display.lower()).strip("-")
        slug = full_slug[:60].rstrip("-")
        if len(full_slug) > 60:
            slug += "-" + hashlib.sha1(full_slug.encode()).hexdigest()[:6]
        cid = aishe_code or f"nmc:{slug}"
        if cid in used_ids:  # same AISHE row already on the tab (unlikely)
            cid = f"nmc:{slug}"
        used_ids.add(cid)

        med_rows.append({
            "college_id": cid,
            "aishe_code": aishe_code,
            "name": (xr.aishe_name if xr is not None
                     and isinstance(xr.aishe_name, str) and xr.aishe_name else display),
            "display_name": display,
            "state": r.state if isinstance(r.state, str) and r.state else None,
            "state_is_inferred": False,  # NMC states every college itself
            "district": r.district if isinstance(r.district, str) and r.district else None,
            "kind": (xr.kind if xr is not None and isinstance(xr.kind, str)
                     else "Medical College"),
            "management": mgmt or None,
            "ownership": ownership,
            # no discipline badge: the NEET-UG chip already says medicine
            "disciplines": [],
            "year_established": (int(r.year_of_inception)
                                 if r.year_of_inception == r.year_of_inception
                                 and r.year_of_inception is not None else None),
            "website": (xr.website if xr is not None
                        and isinstance(xr.website, str) and xr.website else None),
            "university": (r.university
                           if isinstance(r.university, str) and r.university else None),
            "entrance_exams": ["NEET-UG"],
            "counselling": "MCC / state NEET counselling",
            "programs": programs,
            "nirf": nirf_block,
            "ug_gender": ug_gender,
            "fees": None,
            "placement": placement,
            "naac": naac_block,
            "data_sources": {
                "identity": "NMC 2024-25" + (" / AISHE 2024-25" if aishe_code else ""),
                "programs": "NMC 2024-25",
                "ranking": f"NIRF {nirf_block['ranking_year']}" if nirf_block else None,
                "placement": (f"NIRF {placement['ranking_year']} (AY {placement['academic_year']})"
                              if placement else None),
                "accreditation": "NAAC" if naac_block["grade"] else None,
            },
        })

    # ── MHT-CET rows: State CET Cell spine ──────────────────────────────────
    mh_colleges, mh_programs, nirf_mh, mh_place = build_mhtcet(client)
    print(f"  mhtcet colleges {len(mh_colleges)}  programme rows {len(mh_programs)}  "
          f"nirf-MH rows {len(nirf_mh)}  placement {len(mh_place)}")
    nirf_code_by_id = match_nirf_to_mhtcet(nirf_mh, mh_colleges)
    nirf_ids_by_code = {}
    for iid, code in nirf_code_by_id.items():
        nirf_ids_by_code.setdefault(code, set()).add(iid)
    nirf_mh_by_id = {iid: g.sort_values("ranking_year", ascending=False)
                     for iid, g in nirf_mh.groupby("institute_id")}
    mh_place_by_id = {iid: g.sort_values(["ranking_year", "academic_year"], ascending=False)
                      for iid, g in mh_place.groupby("institute_id")}
    mh_prog_by_code = {code: g for code, g in mh_programs.groupby("college_code")}

    mh_rows = []
    for r in mh_colleges.itertuples():
        nids = nirf_ids_by_code.get(r.college_code, set())
        nirf_block = None
        frames = [nirf_mh_by_id[n] for n in nids if n in nirf_mh_by_id]
        if frames:
            # one institute may sit in two NIRF lists (Engineering AND
            # Pharmacy); _latest_nirf keeps one
            top_cat, g = _latest_nirf(frames)
            top = g.iloc[0]
            nirf_block = {
                "category": "Architecture" if top_cat.startswith("Architecture") else top_cat,
                "rank": int(top.nirf_rank),
                "score": (round(float(top.overall_score), 2)
                          if top.overall_score == top.overall_score else None),
                "ranking_year": int(top.ranking_year),
                "rank_history": [
                    {"year": int(x.ranking_year), "rank": int(x.nirf_rank),
                     "score": (round(float(x.overall_score), 2)
                               if x.overall_score == x.overall_score else None)}
                    for x in g.head(6).itertuples()
                ],
            }

        placement = None
        pframes = [mh_place_by_id[n] for n in nids if n in mh_place_by_id]
        if pframes:
            pr = pd.concat(pframes).sort_values(["ranking_year", "academic_year"],
                                                ascending=False).iloc[0]
            def num(v, cast=float):
                return None if v != v else cast(v)
            placed_n, higher_n, grad_n = (num(pr.students_placed, int),
                                          num(pr.higher_studies_selected, int),
                                          num(pr.graduated_on_time, int))
            pct = outcome = None
            if grad_n:
                if placed_n is not None:
                    pct = round(placed_n / grad_n * 100, 1)
                if placed_n is not None and higher_n is not None:
                    outcome = round(min(100.0, (placed_n + higher_n) / grad_n * 100), 1)
            placement = {
                "median_salary": num(pr.median_salary, int),
                "percentage_placed": pct,
                "percentage_with_outcome": outcome,
                "students_placed": placed_n,
                "higher_studies_selected": higher_n,
                "first_year_intake": num(pr.first_year_intake, int),
                "includes_dual_degree": bool(getattr(pr, "includes_dual_degree", False)),
                "academic_year": pr.academic_year,
                "ranking_year": int(pr.ranking_year),
                "source": f"NIRF {pr.discipline}, UG 4-year",
                "is_branch_specific": False,
            }

        # programmes: one row per branch with the open-category loosest rank
        g = mh_prog_by_code.get(r.college_code)
        lst, degrees, streams = [], set(), set()
        if g is not None:
            for x in g.itertuples():
                degree, years, discipline = STREAM_DEGREE.get(
                    str(x.stream), ("Degree", None, str(x.stream).title()))
                degrees.add(degree)
                streams.add(discipline)
                best = x.best
                closing = opening = None
                if best is not None and best.get("closing_rank") is not None:
                    closing = int(best["closing_rank"])
                    if best.get("opening_rank") is not None:
                        opening = int(best["opening_rank"])
                lst.append({
                    "branch": x.branch_name,
                    "years": years,
                    "degree": degree,
                    "indicative_closing_rank": closing,
                    "indicative_opening_rank": opening,
                    "career_id": careers_by_branch_mhtcet.get(x.branch_name),
                })
        lst.sort(key=lambda z: (z["indicative_closing_rank"] is None,
                                z["indicative_closing_rank"] or 0, z["branch"]))
        programs = {
            "count": len(lst),
            "degrees": sorted(degrees),
            "list": lst,
            "source": f"MHT-CET CAP {int(r.year)}, rounds 1-4",
            "rank_note": "Indicative open-category MHT-CET state merit rank.",
        }

        # CET Cell spacing quirks: "Institute , Andheri", double spaces
        display = re.sub(r"\s+,", ",", re.sub(r"\s{2,}", " ", str(r.college_name))).strip()
        mh_rows.append({
            "college_id": f"mhtcet:{r.college_code}",
            "aishe_code": None,
            "name": display,
            "display_name": display,
            "state": "Maharashtra",
            "state_is_inferred": False,
            "district": mh_district_of(display),
            "kind": r.status if isinstance(r.status, str) and r.status else None,
            "management": r.college_type if isinstance(r.college_type, str) else None,
            "ownership": mhtcet_ownership(r.college_type),
            "disciplines": sorted(streams)[:4],
            "year_established": None,
            "website": None,
            "university": (r.home_university
                           if isinstance(r.home_university, str)
                           and r.home_university != "Autonomous Institute" else None),
            "entrance_exams": ["MHT CET"],
            "counselling": "MHT-CET CAP (State CET Cell)",
            "programs": programs,
            "nirf": nirf_block,
            "ug_gender": None,
            "fees": None,
            "placement": placement,
            "naac": {"grade": None, "cgpa": None, "cycle": None,
                     "not_applicable_reason": None},
            "data_sources": {
                "identity": f"State CET Cell, Maharashtra {int(r.year)}",
                "programs": programs["source"],
                "ranking": f"NIRF {nirf_block['ranking_year']}" if nirf_block else None,
                "placement": (f"NIRF {placement['ranking_year']} (AY {placement['academic_year']})"
                              if placement else None),
                "accreditation": None,
            },
        })
    print(f"  mhtcet rows {len(mh_rows)}"
          f"  with NIRF {sum(1 for x in mh_rows if x['nirf'])}"
          f"  with placement {sum(1 for x in mh_rows if x['placement'])}"
          f"  with district {sum(1 for x in mh_rows if x['district'])}"
          f"  branches career-linked {sum(1 for x in mh_rows for p in x['programs']['list'] if p['career_id'])}")
    rows += mh_rows

    # ── the nine state / CLAT spines ─────────────────────────────────────────
    spines = build_state_spines(client)
    nirf_all = client.query(f"""
    SELECT institute_id, institute_name, state, ranking_category, ranking_year,
           nirf_rank, overall_score
    FROM `{D}.nirf_fact_rankings`
    WHERE nirf_rank IS NOT NULL
      AND ranking_category IN ('Engineering', 'Pharmacy', 'Architecture and Planning', 'Law')
    """).to_dataframe()
    nirf_all_by_id = {iid: g.sort_values("ranking_year", ascending=False)
                      for iid, g in nirf_all.groupby("institute_id")}
    place_all = client.query(f"""
    SELECT p.institute_id, p.edition_year AS ranking_year,
           p.graduating_academic_year AS academic_year, p.median_salary,
           {ENG_UG5_COLS},
           {ENG_UG_INTAKE_COL}, p.discipline
    FROM `{D}.nirf_fact_dcs_placements` p
    {ENG_UG_INTAKE_JOIN}
    {ENG_UG5_JOIN}
    WHERE ((p.discipline IN ('Engineering', 'Pharmacy') AND p.program_level = 'UG-4Y')
           OR (p.discipline = 'Law' AND p.program_level = 'UG-5Y'))
      AND NOT p.superseded
      AND p.median_salary IS NOT NULL AND p.median_salary > 0
      AND p.graduated_on_time IS NOT NULL AND p.graduated_on_time > 0
    """).to_dataframe()
    place_all_by_id = {iid: g.sort_values(["ranking_year", "academic_year"], ascending=False)
                       for iid, g in place_all.groupby("institute_id")}
    # Most state-counselling colleges were never in NIRF's exact-rank list,
    # only its 101-300 bands, which carry a name and city but no id. Bands
    # from the last two editions attach by name within the state (older ones
    # would be stale). Placements do NOT fall back to a name match on the
    # filings: they carry no state, and exact names repeat across states
    # (CBIT Hyderabad vs CBIT Proddatur; Centurion's Odisha vs AP campus).
    state_bands = client.query(f"""
    SELECT institute_name, state, ranking_year, rank_band
    FROM `{D}.nirf_fact_rankings`
    WHERE ranking_category = 'Engineering' AND rank_band IS NOT NULL
      AND ranking_year >= {LATEST_NIRF - 1}""").to_dataframe()

    spine_rows = []
    for exam, sp in STATE_SPECS.items():
        allc, prog = spines[exam]
        # synthetic code where the source has none, so the matcher has a key
        def cid_of(row):
            c = row.college_code
            if sp.get("key_by_name") or not (isinstance(c, str) and c and c != "None"):
                return _mnorm(row.college_name)[:60]
            return c
        allc = allc.assign(college_code=[cid_of(r) for r in allc.itertuples()])
        prog = prog.assign(college_code=[cid_of(r) for r in prog.itertuples()])
        # one code, two spellings across phases/rounds (KEAM's "TVE") — same
        # college; keep one row, the programme rows already share the code
        allc = allc.drop_duplicates(subset=["college_code"], keep="first")
        prog_by_code = {c: g for c, g in prog.groupby("college_code")}
        careers_here = careers_by_spine[exam]

        # NIRF within this state (CLAT: Law list, all states)
        if sp["state"]:
            nirf_here = nirf_all[(nirf_all.state == sp["state"])
                                 & (nirf_all.ranking_category != "Law")]
            if sp.get("nirf_cats"):
                nirf_here = nirf_here[nirf_here.ranking_category.isin(sp["nirf_cats"])]
        else:
            nirf_here = nirf_all[nirf_all.ranking_category == "Law"]
        code_by_nirf = match_nirf_to_mhtcet(nirf_here, allc)
        nirf_ids_by_code = {}
        for iid, code in code_by_nirf.items():
            nirf_ids_by_code.setdefault(code, set()).add(iid)
        bands_by_code = {}
        if sp["state"]:
            bh = state_bands[state_bands.state == sp["state"]]
            band_frame = pd.DataFrame({"institute_id": ["band:" + n for n in bh.institute_name],
                                       "institute_name": bh.institute_name}).drop_duplicates()
            for bid, code in match_nirf_to_mhtcet(band_frame, allc).items():
                g_b = bh[bh.institute_name == bid[5:]]
                bands_by_code.setdefault(code, []).extend(
                    (int(x.ranking_year), x.rank_band) for x in g_b.itertuples())

        n_nirf = n_place = 0
        for r in allc.itertuples():
            nids = nirf_ids_by_code.get(r.college_code, set())
            nirf_block = None
            frames = [nirf_all_by_id[n] for n in nids if n in nirf_all_by_id]
            if frames:
                top_cat, g = _latest_nirf(frames)
                top = g.iloc[0]
                nirf_block = {
                    "category": "Architecture" if top_cat.startswith("Architecture") else top_cat,
                    "rank": int(top.nirf_rank),
                    "score": (round(float(top.overall_score), 2)
                              if top.overall_score == top.overall_score else None),
                    "ranking_year": int(top.ranking_year),
                    "rank_history": [
                        {"year": int(x.ranking_year), "rank": int(x.nirf_rank),
                         "score": (round(float(x.overall_score), 2)
                                   if x.overall_score == x.overall_score else None)}
                        for x in g.head(6).itertuples()
                    ],
                }
                n_nirf += 1
            band_hits = bands_by_code.get(r.college_code, [])
            if band_hits:
                by, bb = max(band_hits)
                if nirf_block is None:
                    # band-only: no exact rank, no score, no history
                    nirf_block = {"category": "Engineering", "rank": None, "score": None,
                                  "ranking_year": by, "rank_history": [],
                                  "latest_band": {"year": by, "band": bb}}
                    n_nirf += 1
                elif by > nirf_block["ranking_year"]:
                    nirf_block["latest_band"] = {"year": by, "band": bb}
            placement = None
            pframes = [place_all_by_id[n] for n in nids if n in place_all_by_id]

            if pframes:
                pr = pd.concat(pframes).sort_values(["ranking_year", "academic_year"],
                                                    ascending=False).iloc[0]
                def num(v, cast=float):
                    return None if v != v else cast(v)
                placed_n, higher_n, grad_n = (num(pr.students_placed, int),
                                              num(pr.higher_studies_selected, int),
                                              num(pr.graduated_on_time, int))
                pct = outcome = None
                if grad_n:
                    if placed_n is not None:
                        pct = round(placed_n / grad_n * 100, 1)
                    if placed_n is not None and higher_n is not None:
                        outcome = round(min(100.0, (placed_n + higher_n) / grad_n * 100), 1)
                placement = {
                    "median_salary": num(pr.median_salary, int),
                    "percentage_placed": pct,
                    "percentage_with_outcome": outcome,
                    "students_placed": placed_n,
                    "higher_studies_selected": higher_n,
                    "first_year_intake": num(pr.first_year_intake, int),
                "includes_dual_degree": bool(getattr(pr, "includes_dual_degree", False)),
                    "academic_year": pr.academic_year,
                    "ranking_year": int(pr.ranking_year),
                    "source": f"NIRF {pr.discipline}, UG",
                    "is_branch_specific": False,
                }
                n_place += 1

            g = prog_by_code.get(r.college_code)
            lst, degrees, disciplines = [], set(), set()
            women_only = bool(g is not None and len(g) and g["women_only"].all())
            if g is not None:
                for x in g.itertuples():
                    disc, degree, years = discipline_of_program(x.branch, x.stream if sp["stream"] else None)
                    if exam == "CLAT":
                        degree, years, disc = str(x.branch), 5, "Law"
                    degrees.add(degree)
                    disciplines.add(disc)
                    closing = None if pd.isna(x.closing_rank) else int(x.closing_rank)
                    seats = None if pd.isna(x.seats) else int(x.seats)
                    entry = {
                        "branch": str(x.branch),
                        "years": years,
                        "degree": degree,
                        "indicative_closing_rank": closing,
                        "indicative_opening_rank": None,
                        "career_id": careers_here.get(str(x.branch)),
                    }
                    if seats is not None:
                        entry["seats"] = seats
                    lst.append(entry)
            lst.sort(key=lambda z: (z["indicative_closing_rank"] is None,
                                    z["indicative_closing_rank"] or 0, z["branch"]))
            year = None if pd.isna(r.year) else int(r.year)
            programs = {
                "count": len(lst),
                "degrees": sorted(degrees),
                "list": lst,
                "source": sp["source"].format(y=year),
                "rank_note": sp.get("rank_note") or f"Indicative open-category {sp['label']} closing rank.",
            }
            display = re.sub(r"\s+,", ",", re.sub(r"\s{2,}", " ", str(r.college_name))).strip()
            state = sp["state"]
            for part, st in sp.get("state_by_name", {}).items():
                if part in display:
                    state = st
            if exam == "CLAT":
                state = next((st for city, st in NLU_CITY_STATE.items() if city in display), None)
            spine_rows.append({
                "college_id": f"{sp['map_exam'].lower()}:{r.college_code}",
                "aishe_code": None,
                "name": display,
                "display_name": display,
                "state": state,
                # CLAT's NLU states come from a hand-checked city list, not
                # a guess — no "inferred" star
                "state_is_inferred": False,
                "district": (r.district if isinstance(r.district, str) and r.district
                             and r.district != "None" else None),
                "kind": "Women's college" if women_only else None,
                "management": (r.college_type if isinstance(r.college_type, str)
                               and r.college_type not in ("None", "Unknown") else None),
                "ownership": generic_ownership(r.college_type),
                "disciplines": sorted(disciplines)[:4] or (["Law"] if exam == "CLAT" else []),
                "year_established": None,
                "website": None,
                "university": (r.university if isinstance(r.university, str)
                               and r.university != "None" else None),
                "entrance_exams": [sp["label"]],
                "counselling": sp["counselling"],
                "programs": programs,
                "nirf": nirf_block,
                "ug_gender": None,
                "fees": None,
                "placement": placement,
                "naac": {"grade": None, "cgpa": None, "cycle": None,
                         "not_applicable_reason": None},
                "data_sources": {
                    "identity": programs["source"],
                    "programs": programs["source"],
                    "ranking": f"NIRF {nirf_block['ranking_year']}" if nirf_block else None,
                    "placement": (f"NIRF {placement['ranking_year']} (AY {placement['academic_year']})"
                                  if placement else None),
                    "accreditation": None,
                },
            })
        print(f"  {exam}: {len(allc)} rows, NIRF {n_nirf}, placement {n_place}")
    rows += spine_rows

    # ── DU (CUET-UG) and IISER (IAT) ────────────────────────────────────────
    # DU publishes minimum allocation SCORES (higher = harder), not ranks:
    # they ride `indicative_min_score`, never the rank field. IISER closing
    # ranks are IAT overall ranks (loosest across rounds, UR).
    import re as _re
    careers_file_ids = {c["career_id"] for c in json.load(open("public/data/careers/careers.json"))}
    PROGRAM_CAREER = [  # first keyword hit wins; only ids that exist are used
        (r"b\.?\s?com|commerce|accounting", "commerce"),
        (r"economic", "economics"), (r"psycholog", "psychology"),
        (r"political", "political-science"), (r"histor", "history"),
        (r"english", "english"), (r"journalism|mass comm", "journalism"),
        (r"social work", "social-work"), (r"elementary education|b\.el\.ed", "teaching"),
        (r"computer science|informatics|data science", "computer-science-information-technology"),
        (r"biomedical", "biomedical-engineering"), (r"biochem", "biochemistry"),
        (r"botany", "botany"), (r"zoology", "zoology"), (r"microbio|life science|biolog", "biology"),
        (r"physics", "physics"), (r"chemistry|chemical engineering", "chemistry"),
        (r"mathemat|statistic", "mathematics"), (r"music", "music"),
        (r"food technology", "food-engineering"),
        (r"electrical engineering", "electrical-electronics-communications-engineering"),
        (r"bs-ms|computational", "natural-science"),
    ]
    def career_of_program(name):
        n = name.lower()
        if "chemical engineering" in n:
            return "chemical-engineering" if "chemical-engineering" in careers_file_ids else None
        for pat, cid in PROGRAM_CAREER:
            if _re.search(pat, n):
                return cid if cid in careers_file_ids else None
        return None

    du = client.query(f"""
    SELECT college_name, program_name,
           MAX(IF(category = 'UR', min_allocation_score, NULL)) AS ur_score
    FROM `{D}.ducuet_fact_cutoffs` GROUP BY 1, 2""").to_dataframe()
    iiser = client.query(f"""
    SELECT institute, program_name, MAX(IF(category = 'UR', closing_rank, NULL)) AS ur_rank,
           MAX(year) AS year
    FROM `{D}.iiser_fact_cutoffs` GROUP BY 1, 2""").to_dataframe()
    nirf_extra = client.query(f"""
    SELECT institute_id, institute_name, state, ranking_category, ranking_year,
           nirf_rank, overall_score
    FROM `{D}.nirf_fact_rankings`
    WHERE nirf_rank IS NOT NULL
      AND ranking_category IN ('College', 'Research Institutions', 'Overall',
                               'Agriculture and Allied Sectors', 'University')""").to_dataframe()
    nirf_extra_by_id = {iid: g.sort_values("ranking_year", ascending=False)
                        for iid, g in nirf_extra.groupby("institute_id")}

    nirf_ids_by_name = {}

    # NIRF's College list (first-party DCS since Sep 2026): UG 3-year pools
    # BA/BSc/BCom
    college_place = client.query(f"""
    SELECT institute_id, edition_year AS ranking_year,
           graduating_academic_year AS academic_year, median_salary,
           graduated_on_time, students_placed, higher_studies_selected,
           first_year_intake
    FROM `{D}.nirf_fact_dcs_placements`
    WHERE discipline = 'College' AND program_level = 'UG-3Y'
      AND NOT superseded
      AND median_salary IS NOT NULL AND median_salary > 0
      AND graduated_on_time IS NOT NULL AND graduated_on_time > 0""").to_dataframe()
    college_place_by_id = {iid: g.sort_values(["ranking_year", "academic_year"], ascending=False)
                           for iid, g in college_place.groupby("institute_id")}

    def placement_for(name):
        frames = [college_place_by_id[i] for i in nirf_ids_by_name.get(name, ()) if i in college_place_by_id]
        if not frames:
            return None
        pr = pd.concat(frames).sort_values(["ranking_year", "academic_year"], ascending=False).iloc[0]
        num = lambda v: None if pd.isna(v) else int(v)
        placed, higher, grad = num(pr.students_placed), num(pr.higher_studies_selected), num(pr.graduated_on_time)
        pct = outcome = None
        if grad:
            if placed is not None:
                pct = round(placed / grad * 100, 1)
            if placed is not None and higher is not None:
                outcome = round(min(100.0, (placed + higher) / grad * 100), 1)
        return {
            "median_salary": num(pr.median_salary),
            "percentage_placed": pct,
            "percentage_with_outcome": outcome,
            "students_placed": placed,
            "higher_studies_selected": higher,
            "first_year_intake": num(pr.first_year_intake),
            "academic_year": pr.academic_year,
            "ranking_year": int(pr.ranking_year),
            "source": "NIRF College, UG 3-year",
            "is_branch_specific": False,
        }

    def nirf_block_for(names, cats, state=None):
        pool = nirf_extra[nirf_extra.ranking_category.isin(cats)]
        if state:
            pool = pool[pool.state == state]
        frame = pd.DataFrame({"college_code": names, "college_name": names})
        ids = match_nirf_to_mhtcet(pool, frame)
        by_name = {}
        for iid, nm in ids.items():
            by_name.setdefault(nm, set()).add(iid)
        out = {}
        nirf_ids_by_name.update(by_name)
        for nm, iids in by_name.items():
            g = pd.concat([nirf_extra_by_id[i] for i in iids if i in nirf_extra_by_id])
            g = g[g.ranking_category.isin(cats)]
            # prefer the first category in `cats` the college is ranked in
            for cat in cats:
                gc = g[g.ranking_category == cat].drop_duplicates(subset=["ranking_year"]).sort_values("ranking_year", ascending=False)
                if len(gc):
                    top = gc.iloc[0]
                    out[nm] = {
                        "category": ("Research" if cat.startswith("Research")
                                     else "Agriculture" if cat.startswith("Agriculture") else cat),
                        "rank": int(top.nirf_rank),
                        "score": round(float(top.overall_score), 2) if top.overall_score == top.overall_score else None,
                        "ranking_year": int(top.ranking_year),
                        "rank_history": [{"year": int(x.ranking_year), "rank": int(x.nirf_rank),
                                          "score": round(float(x.overall_score), 2) if x.overall_score == x.overall_score else None}
                                         for x in gc.head(6).itertuples()],
                    }
                    break
        return out

    def base_row(cid, name, state, exam, counselling, programs, nirf_block, disciplines, source):
        return {
            "college_id": cid, "aishe_code": None, "name": name, "display_name": name,
            "state": state, "state_is_inferred": False, "district": None,
            "kind": None, "management": None,
            "ownership": "Public", "disciplines": disciplines, "year_established": None,
            "website": None, "university": None, "entrance_exams": [exam],
            "counselling": counselling, "programs": programs, "nirf": nirf_block,
            "ug_gender": None, "fees": None, "placement": None,
            "naac": {"grade": None, "cgpa": None, "cycle": None, "not_applicable_reason": None},
            "data_sources": {"identity": source, "programs": source,
                             "ranking": f"NIRF {nirf_block['ranking_year']}" if nirf_block else None,
                             "placement": None, "accreditation": None},
        }

    du = du.assign(college_name=du.college_name.str.replace("Hansraj", "Hans Raj", regex=False))
    du_names = sorted(du.college_name.unique())
    du_nirf = nirf_block_for(du_names, ["College", "Overall"], state="Delhi")
    du_rows = []
    for nm, g in du.groupby("college_name"):
        lst = []
        for x in g.itertuples():
            deg = _re.match(r"^(B\.?\s?[A-Za-z.]+(?:\s*\((?:Hons|Prog)\.?\))?)", x.program_name)
            lst.append({"branch": x.program_name, "years": 3 if "B.Tech" not in x.program_name else 4,
                        "degree": deg.group(1).strip() if deg else "UG",
                        "indicative_closing_rank": None, "indicative_opening_rank": None,
                        "indicative_min_score": None if pd.isna(x.ur_score) else round(float(x.ur_score), 1),
                        "career_id": career_of_program(x.program_name)})
        lst.sort(key=lambda z: (z["indicative_min_score"] is None, -(z["indicative_min_score"] or 0), z["branch"]))
        disc = sorted({("Commerce" if "com" in p["branch"].lower() else
                        "Science" if "b.sc" in p["branch"].lower() else "Arts") for p in lst})
        programs = {"count": len(lst), "degrees": sorted({p["degree"] for p in lst}), "list": lst,
                    "source": "DU CSAS 2025, rounds 1-3",
                    "rank_note": "Lowest open-category CUET score that got a seat (out of about 1000 for most courses)."}
        # full-name slug: DU lists day and evening colleges separately
        # ("Satyawati College" / "… (Evening)"), and _mnorm drops brackets
        du_rows.append(base_row("du:" + re.sub(r"[^a-z0-9]+", "-", nm.lower()).strip("-")[:70], re.sub(r"\s+", " ", nm).strip(), "Delhi",
                                "CUET (UG)", "DU CSAS (CUET-UG)", programs, du_nirf.get(nm), disc,
                                "University of Delhi CSAS 2025"))
        du_rows[-1]["_nirf_name"] = nm

    for r in du_rows:
        pl = placement_for(r["_nirf_name"]) if r.get("_nirf_name") else None
        r.pop("_nirf_name", None)
        if pl:
            r["placement"] = pl
            r["data_sources"]["placement"] = f"NIRF {pl['ranking_year']} (AY {pl['academic_year']})"
    ii_names = sorted(iiser.institute.unique())
    long_names = {n: n.replace("IISER", "Indian Institute of Science Education and Research") for n in ii_names}
    ii_nirf_long = nirf_block_for(list(long_names.values()), ["Research Institutions", "Overall"])
    iiser_state = {"Berhampur": "Odisha", "Bhopal": "Madhya Pradesh", "Kolkata": "West Bengal",
                   "Mohali": "Punjab", "Pune": "Maharashtra", "Thiruvananthapuram": "Kerala",
                   "Tirupati": "Andhra Pradesh"}
    ii_rows = []
    for inst, g in iiser.groupby("institute"):
        lst = []
        for x in g.itertuples():
            prog = x.program_name.replace(inst, "").strip()
            deg = "B.Tech" if prog.startswith("B.Tech") else "BS-MS" if prog.startswith("BS-MS") else "BS"
            lst.append({"branch": prog, "years": 5 if deg == "BS-MS" else 4, "degree": deg,
                        "indicative_closing_rank": None if pd.isna(x.ur_rank) else int(x.ur_rank),
                        "indicative_opening_rank": None,
                        "career_id": career_of_program(prog)})
        lst.sort(key=lambda z: (z["indicative_closing_rank"] is None, z["indicative_closing_rank"] or 0))
        programs = {"count": len(lst), "degrees": sorted({p["degree"] for p in lst}), "list": lst,
                    "source": "IISER admissions 2025, rounds 1-9",
                    "rank_note": "Indicative open-category IAT overall closing rank."}
        city = inst.replace("IISER ", "")
        disc = sorted({"Engineering" if p["degree"] == "B.Tech" else "Science" for p in lst})
        ii_rows.append(base_row(f"iiser:{city.lower()}", inst.replace("IISER", "Indian Institute of Science Education and Research"),
                                iiser_state.get(city), "IAT", "IISER Joint Admissions (IAT)",
                                programs, ii_nirf_long.get(long_names[inst]), disc,
                                "IISER Admissions 2025"))
    print(f"  DU rows {len(du_rows)} (NIRF {sum(1 for r in du_rows if r['nirf'])}),"
          f" IISER rows {len(ii_rows)} (NIRF {sum(1 for r in ii_rows if r['nirf'])}),"
          f" career-linked DU programmes {sum(1 for r in du_rows for p in r['programs']['list'] if p['career_id'])}"
          f"/{sum(r['programs']['count'] for r in du_rows)}")
    # ── ICAR-UG (CUET): 72 agricultural universities ───────────────────────
    # Cutoffs are CUET MARKS (three subjects, of 750; higher = harder), so
    # they ride indicative_min_score like DU. ICAR's ranks are stream-wise
    # and not comparable, so none are shown. Open number = lowest UR marks
    # allotted, over home states and all five rounds.
    icar = client.query(f"""
    SELECT university, ANY_VALUE(university_city) AS city,
           ANY_VALUE(university_state) AS state, course, course_raw,
           MIN(IF(category = 'UR', marks_start, NULL)) AS ur_marks
    FROM `{D}.icarug_fact_cutoffs` GROUP BY university, course, course_raw""").to_dataframe()
    icar_careers = career_lookup("ICAR-UG")
    ICAR_DISC = [(r"B\.Tech", "Engineering"), (r"Fisheries", "Fisheries"),
                 (r"Community Science|Nutrition", "Science")]
    def icar_disc(course):
        return next((d for pat, d in ICAR_DISC if _re.search(pat, course)), "Agriculture")
    icar_nirf = nirf_block_for(sorted(icar.university.unique()),
                               ["Agriculture and Allied Sectors", "University", "Overall"])
    icar_rows = []
    for uni, g in icar.groupby("university"):
        lst = [{"branch": x.course, "years": 4,
                "degree": x.course.split(" ")[0] if not x.course.startswith("B.Sc. (Hons.)") else "B.Sc. (Hons.)",
                "indicative_closing_rank": None, "indicative_opening_rank": None,
                "indicative_min_score": None if pd.isna(x.ur_marks) else round(float(x.ur_marks), 1),
                "career_id": icar_careers.get(x.course_raw)}
               for x in g.itertuples()]
        lst.sort(key=lambda z: (z["indicative_min_score"] is None, -(z["indicative_min_score"] or 0), z["branch"]))
        programs = {"count": len(lst), "degrees": sorted({p["degree"] for p in lst}), "list": lst,
                    "source": "ICAR-UG counselling 2025, rounds 1-4 and mop-up",
                    "rank_note": "Lowest open-category CUET marks that got a seat (three subjects, out of 750)."}
        row = base_row("icar:" + re.sub(r"[^a-z0-9]+", "-", uni.lower()).strip("-")[:70], uni,
                       g.state.iloc[0], "CUET (UG)", "ICAR-UG counselling (CUET)", programs,
                       icar_nirf.get(uni), sorted({icar_disc(c) for c in g.course})[:4],
                       "ICAR-UG counselling 2025")
        row["district"] = g.city.iloc[0]
        icar_rows.append(row)
    print(f"  ICAR rows {len(icar_rows)} (NIRF {sum(1 for r in icar_rows if r['nirf'])}),"
          f" career-linked programmes {sum(1 for r in icar_rows for p in r['programs']['list'] if p['career_id'])}"
          f"/{sum(r['programs']['count'] for r in icar_rows)}")
    # ── BHU UG (CUET): BHU's faculties and admitted colleges ───────────────
    # Scores are BHU's CUET-based merit score, on each programme's own scale
    # (B.A. up to ~374, B.Sc. ~637): indicative_min_score, like DU. Paid /
    # special fee seats are separate pools with their own rows. Names carry
    # the university ("Faculty of Arts, Banaras Hindu University").
    bhu = client.query(f"""
    SELECT college, kind, city, program, fee_type,
           MIN(IF(category = 'UR', min_score, NULL)) AS ur_score
    FROM `{D}.bhuug_fact_cutoffs` GROUP BY 1, 2, 3, 4, 5""").to_dataframe()
    bhu_uni = nirf_block_for(["Banaras Hindu University"], ["University", "Overall"]).get("Banaras Hindu University")
    bhu_colleges = nirf_block_for(sorted(bhu[bhu.kind == "BHU admitted college"].college.str.replace(r", Varanasi \(BHU\)$", "", regex=True).unique()),
                                  ["College"], state="Uttar Pradesh")
    BHU_DEGREE = [(r"^Bachelor of Arts and Bachelor of Legislative Law", "B.A. LL.B. (Hons.)", 5, "Law"),
                  (r"^Bachelor of Technology", "B.Tech", 4, "Engineering"),
                  (r"^Bachelor of Commerce \(Honours\)", "B.Com (Hons.)", 4, "Commerce"),
                  (r"^Bachelor of Commerce", "B.Com", 3, "Commerce"),
                  (r"^Bachelor of Science \(Honours\)", "B.Sc. (Hons.)", 4, "Science"),
                  (r"^Bachelor of Science", "B.Sc.", 3, "Science"),
                  (r"^Bachelor of Vocation", "B.Voc", 3, "Vocational"),
                  (r"^Bachelor of Arts \(Honours\)", "B.A. (Hons.)", 4, "Arts"),
                  # the Sanskrit faculty's four-year honours degree
                  (r"^Shastri \(Honours\)", "Shastri (Hons.)", 4, "Arts"),
                  (r"^Bachelor of", "UG", 3, "Arts")]
    def bhu_degree(prog):
        hit = next(((d, y, disc) for pat, d, y, disc in BHU_DEGREE if _re.search(pat, prog)), None)
        if hit is None:
            raise SystemExit(f"BHU programme with no degree rule: {prog!r}")
        return hit
    FEE_LABEL = {"paid": " (paid seat)", "special": " (special fee seat)"}
    bhu_rows = []
    for col, g in bhu.groupby("college"):
        lst, discs = [], set()
        for x in g.itertuples():
            deg, yrs, disc = bhu_degree(x.program)
            discs.add(disc)
            lst.append({"branch": x.program + FEE_LABEL.get(x.fee_type, ""), "years": yrs, "degree": deg,
                        "indicative_closing_rank": None, "indicative_opening_rank": None,
                        "indicative_min_score": None if pd.isna(x.ur_score) else round(float(x.ur_score), 1),
                        "career_id": career_of_program(x.program)})
        lst.sort(key=lambda z: (z["indicative_min_score"] is None, -(z["indicative_min_score"] or 0), z["branch"]))
        programs = {"count": len(lst), "degrees": sorted({p["degree"] for p in lst}), "list": lst,
                    "source": "BHU UG admission 2025, Round 1 and Spot Round 2",
                    "rank_note": "Lowest open-category BHU merit score (from CUET) that got a seat; each programme has its own scale."}
        own = g.kind.iloc[0] == "BHU faculty"
        nirf = bhu_uni if own else bhu_colleges.get(col.replace(", Varanasi (BHU)", ""))
        row = base_row("bhu:" + re.sub(r"[^a-z0-9]+", "-", col.lower()).strip("-")[:70], col, "Uttar Pradesh",
                       "CUET (UG)", "BHU UG admission (CUET)", programs, nirf, sorted(discs)[:4],
                       "BHU UG admission 2025")
        row["district"] = g.city.iloc[0]
        row["university"] = "Banaras Hindu University"
        if not own:
            # admitted colleges are aided, not BHU itself: no ownership claim
            row["ownership"] = None
        bhu_rows.append(row)
    print(f"  BHU rows {len(bhu_rows)} (NIRF {sum(1 for r in bhu_rows if r['nirf'])}),"
          f" career-linked programmes {sum(1 for r in bhu_rows for p in r['programs']['list'] if p['career_id'])}"
          f"/{sum(r['programs']['count'] for r in bhu_rows)}")
    rows += du_rows + ii_rows + icar_rows + bhu_rows

    print(f"  medical rows {len(med_rows)}"
          f"  with NIRF {sum(1 for x in med_rows if x['nirf'])}"
          f"  with placement {sum(1 for x in med_rows if x['placement'])}"
          f"  with aishe {sum(1 for x in med_rows if x['aishe_code'])}")
    rows += med_rows

    # ── AIIMS B.Sc. (Hons.) Nursing on the 18 AIIMS cards ──────────────────
    # A second programme with its OWN rank scale (AIIMS nursing entrance
    # overall rank), so it carries rank_label and the card's column header
    # ignores it. Open number = UR seat, loosest of the rounds.
    nursing = client.query(f"""
    SELECT institute, MAX(closing_rank) AS closing, MAX(year) AS year
    FROM `{D}.aiimsnursing_fact_cutoffs` WHERE seat_category = 'UR'
    GROUP BY 1""").to_dataframe()
    aiims_city = {"DELHI": "new delhi", "BHATINDA": "bathinda",
                  "MANGLAGIRI": "mangalagiri", "RAEBARELI": "rae bareli"}
    aiims_cards = [r for r in rows if r["name"].lower().startswith("all india institute of medical")]
    for x in nursing.itertuples():
        key = x.institute.removeprefix("AIIMS ")
        city = aiims_city.get(key, key.lower())
        hits = [r for r in aiims_cards if city in r["name"].lower()]
        assert len(hits) == 1, (x.institute, [h["name"] for h in hits])
        card = hits[0]
        card["programs"]["list"].append({
            "branch": "B.Sc. (Hons.) Nursing", "years": 4, "degree": "B.Sc. (Hons.)",
            "indicative_closing_rank": int(x.closing),
            "indicative_opening_rank": None,
            "rank_label": "AIIMS nursing",
            "career_id": "nursing",
        })
        card["programs"]["count"] = len(card["programs"]["list"])
        card["programs"]["degrees"] = sorted(set(card["programs"]["degrees"]) | {"B.Sc. (Hons.)"})
        if "AIIMS-EE" not in card["entrance_exams"]:
            card["entrance_exams"] = card["entrance_exams"] + ["AIIMS-EE"]
    print(f"  AIIMS nursing programme on {len(nursing)} AIIMS cards")

    def nirf_sort(z):
        n = z["nirf"]
        if not n:
            return 0
        # band-only colleges sort at the band's top ("101-150" -> 101)
        return n["rank"] if n["rank"] is not None else int(n["latest_band"]["band"].split("-")[0])
    rows.sort(key=lambda z: (z["nirf"] is None, nirf_sort(z), z["display_name"]))

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
