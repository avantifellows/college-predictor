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

SRC = "data-sources/exams_cleaned.csv"
OUT = "public/data/exams/exams.json"
# careers this exam leads to: predictor key -> exam_branch_mapping family ->
# branches -> the career named after each branch (career_streams.csv), the
# biggest seat pools first. Everything reads data-sources/, so there is no
# circular dependency on careers.json.
EXAM_MAP = "data-sources/exam_branch_mapping.csv"
TAXONOMY = "data-sources/branch_taxonomy.csv"
CAREERS_SRC = "data-sources/career_streams.csv"
PREDICTOR_TO_FAMILY = {
    "JoSAA": "JoSAA", "KCET": "KCET", "MHT CET": "MHT-CET",
    "TGEAPCET": "TG-EAPCET", "AP EAPCET": "AP-EAPCET", "GUJCET": "GUJCET",
    "WBJEE": "WBJEE", "KEAM": "KEAM", "OJEE": "OJEE", "CLAT": "CLAT",
    "NEETUG": "NEET",
}


def careers_index():
    def _n(s):
        return re.sub(r"[^a-z0-9]+", " ", str(s).lower()).strip()

    car = pd.read_csv(CAREERS_SRC)
    career_by_name = {_n(c): slug(c) for c in car["Career Name"]}
    tax = pd.read_csv(TAXONOMY)
    parents = tax[tax.primary_branch_id.isna()]
    # a branch leads to the career that carries its name…
    branch_career = {}
    for bid, bname in parents[["branch_id", "branch_name"]].values:
        c = career_by_name.get(_n(bname))
        if c:
            branch_career[bid] = (c, str(bname).strip())
    # …and the pinned pairs fill the renames (MBBS -> Medicine (MBBS),
    # LLB -> Law (LLB)) — one source of truth with the careers build
    from build_careers_data import CAREER_BRANCH
    for career_name, bid in CAREER_BRANCH.items():
        branch_career.setdefault(bid, (slug(career_name), career_name))
    em = pd.read_csv(EXAM_MAP)
    by_family = {}
    for fam, g in em.groupby("exam"):
        w = {}
        for _, r in g.iterrows():
            hit = branch_career.get(r.branch_id)
            if hit:
                w[hit] = w.get(hit, 0) + int(r.n_rows)
        top = sorted(w.items(), key=lambda kv: -kv[1])[:4]
        by_family[fam] = [{"label": name, "slug": cid} for (cid, name), _ in top]
    return by_family, career_by_name


# Hand-formatted paper patterns: the sheet stores sections and question counts
# as two parallel run-on strings; scripts/pattern_formats.json aligns them into
# rows, keyed by md5(pattern + "||" + questions_marks)[:10].
PATTERNS = "scripts/pattern_formats.json"

MONTHS = ["January", "February", "March", "April", "May", "June", "July",
          "August", "September", "October", "November", "December"]

# scope buckets for the Where filter: a state name, All India, or a specific
# university/institute (everything else)
STATES = {
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
    "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana",
    "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka",
    "Kerala", "Ladakh", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal",
}
# home state of each university-run exam (null = multi-campus/national)
UNIVERSITY_STATES = "scripts/university_states.json"


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


def _k2(s):
    return re.sub(r"[^a-z0-9]+", " ", str(s).lower()).strip()


def main():
    careers_by_family, career_by_name = careers_index()
    fmt = {}
    if os.path.exists(PATTERNS):
        fmt = json.load(open(PATTERNS))
    uni_states = {k: v for k, v in json.load(open(UNIVERSITY_STATES)).items()
                  if not k.startswith("_")}
    d = pd.read_csv(SRC)
    active = d[d.status == "active"]
    dead = d[d.status != "active"]

    succ_aliases = defaultdict(set)
    for _, r in dead.iterrows():
        if pd.notna(r.replaced_by):
            succ_aliases[str(r.replaced_by)].add(str(r.exam_name))

    cards, seen = [], {}
    for name, g in active.groupby("exam_name", sort=True):
        # fold the group's rows: first NON-NULL value per column, not the
        # first row — JEE Main's fee sits on its 2nd row, NaN on its 1st
        f = {c: (g[c].dropna().iloc[0] if g[c].notna().any() else float("nan"))
             for c in g.columns}
        # pattern and its question counts must stay from the SAME row
        with_pat = g[g["paper_pattern"].notna()]
        if len(with_pat):
            f["paper_pattern"] = with_pat.iloc[0]["paper_pattern"]
            f["questions_marks"] = with_pat.iloc[0]["questions_marks"]
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
            # the university's home state, so AGRICET (ANGRAU) still reads
            # and filters as Andhra Pradesh; None for national/multi-campus
            "scope_state": (str(f["scope"]).strip()
                            if str(f["scope"]).strip() in STATES
                            else uni_states.get(sid)),
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
        card = cards[-1]
        pred = card["predictor_exam"]
        fam = PREDICTOR_TO_FAMILY.get(pred or "")
        careers = list(careers_by_family.get(fam, []))
        if not careers:
            # exams outside the cutoff mapping (UCEED, NID): a stream that
            # IS a career name links to it (Design -> the Design career)
            careers = [{"label": s, "slug": career_by_name[_k2(s)]}
                       for s in streams if _k2(s) in career_by_name][:3]
        card["careers"] = careers or None
        # only the JoSAA family has its colleges on the Colleges tab so far
        if fam == "JoSAA":
            which = ("JEE Advanced" if acro.startswith("JEE Advanced")
                     else "JEE Main")
            card["colleges_link"] = f"/colleges?exam={which}"
        else:
            card["colleges_link"] = None

    # exam_id is the React key and the expand toggle — a duplicate breaks both
    ids = [c["exam_id"] for c in cards]
    dupes = {i for i in ids if ids.count(i) > 1}
    assert not dupes, f"duplicate exam_ids: {dupes}"

    unmapped = [c["exam_id"] for c in cards
                if c["scope_type"] == "University" and c["exam_id"] not in
                json.load(open(UNIVERSITY_STATES))]
    if unmapped:
        print(f"WARNING: university exams missing from {UNIVERSITY_STATES}: {unmapped}")

    os.makedirs("public/data/exams", exist_ok=True)
    import datetime
    json.dump({"date": datetime.date.today().strftime("%-d %B %Y")},
              open("public/data/last_updated.json", "w"))
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
