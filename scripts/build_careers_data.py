"""
Build public/data/careers/careers.json from Amogh's career sheet
(data-sources/career_streams.csv, 107 careers).

Each career carries the sheet's narrative fields plus a REAL exams join:
career name -> parent branch in the taxonomy (89/107 match by name; the
rest are pinned in CAREER_BRANCH below; non-academic careers like CA or
HCL TechBee map to nothing and simply show no exam chips) -> the exams
whose cutoff tables offer that branch, via data-sources/exam_branch_mapping.csv.

branch_to_career.json is the reverse map (parent branch_id -> career slug)
so the colleges tab can link a branch chip to its career page.
"""
import json
import os
import re

import pandas as pd

SRC = "data-sources/career_streams.csv"
TAXONOMY = "data-sources/branch_taxonomy.csv"
EXAM_MAP = "data-sources/exam_branch_mapping.csv"
EXAMS_TAB = "public/data/exams/exams.json"
OUT_DIR = "public/data/careers"

# careers whose names don't normalise onto a taxonomy parent
# ICAR's agriculture-faculty degrees that have their own taxonomy branch
# but no career page yet: send them to Agriculture
BRANCH_CAREER_FALLBACK = {
    "AGRIBUSMGT": "agriculture",
    "COMMUNITYSCI": "agriculture",
    "NUTRITION": "agriculture",
}
CAREER_BRANCH = {
    "Artificial Intelligence and Data Science": "AIML",
    "Business Administration (MBA)": "ADMIN",
    "Computer Application (BCA/MCA)": "BCA",
    "Computer Science And Engineering": "CSIT",
    "Data Engineering": "AIML",
    "Electrical And Electronics Engineering": "ELEC",
    "Electrical Engineering": "ELEC",
    "Electronics And Communications Engineering": "ELEC",
    "Law (LLB)": "LLB",
    "Marine Engineering": "MARINE",
    "Mechanical Engineering": "MECHENG",
    "Medicine (MBBS)": "MBBS",
    "Dentistry": "DENTAL",
    "Ocean Engineering": "MARINE",
    "Structural Engineering": "CIVILENG",
    # deliberately unmapped: Armed Forces, CA, HCL TechBee, Japanese
}

# how each mapping source shows up as a chip: label + where it leads.
# Everything links into the Exams tab pre-searched, EXCEPT TNEA — Tamil
# Nadu admits on 12th marks with no entrance exam, so it has no exams-tab
# card; its chip goes straight to the predictor with TNEA preselected.
# queries must be SPECIFIC enough to hit only the intended cards — bare
# "JEE" also matches WBJEE, OJEE, SRMJEE and the hotel-management JEE
EXAM_LINKS = {
    "JoSAA": [("JEE Main", "/exams?q=JEE Main"),
              ("JEE Advanced", "/exams?q=JEE Advanced")],
    "KCET": [("KCET", "/exams?q=KCET")],
    "MHT-CET": [("MHT-CET", "/exams?q=MHT CET")],
    "TG-EAPCET": [("TG EAPCET", "/exams?q=TG-EAPCET")],
    "AP-EAPCET": [("AP EAPCET", "/exams?q=AP-EAPCET")],
    "GUJCET": [("GUJCET", "/exams?q=GUJCET")],
    "TNEA": [("TNEA counselling", "/predictor?exam=TNEA")],
    "WBJEE": [("WBJEE", "/exams?q=WBJEE")],
    "KEAM": [("KEAM", "/exams?q=KEAM")],
    "OJEE": [("OJEE", "/exams?q=OJEE")],
    # counselling on the JEE Main rank with no exam card of its own
    "JAC-Chandigarh": [("JAC Chandigarh", "/predictor?exam=JAC Chandigarh")],
    "CLAT": [("CLAT", "/exams?q=CLAT")],
    "AIIMS-Nursing": [("AIIMS-EE", "/exams?q=AIIMS-EE")],
    # ICAR counselling runs on CUET, whose card is all of CUET: straight to
    # the ICAR predictor instead
    "ICAR-UG": [("ICAR-UG (CUET)", "/predictor?exam=ICAR-UG")],
    "UPTAC": [("UPTAC", "/predictor?exam=UPTAC")],
    "NEET": [("NEET-UG", "/exams?q=NEET")],
}


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", str(s).lower()).strip()


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", str(s).lower()).strip("-")


def split_list(text, sep=","):
    """Split a sheet cell into items on `sep` (and ';' / newlines), but never
    inside brackets: "Narayana Murthy (Infosys co-founder, is a CA)" is ONE
    person, and "ICAI (offices in Delhi, Mumbai, Chennai)" is one college.
    Numbered prefixes ("1. IIT Bombay") are dropped."""
    if text is None or (isinstance(text, float) and text != text):
        return []
    # the sheet pre-numbers some cells one item per line, and that numbering
    # was itself split blind to brackets ("1. ICAI (…exams\n2. with offices
    # in Delhi\n3. Mumbai…)") — turn those line breaks back into plain commas
    # so the bracket-aware pass below re-joins what belongs together
    text = re.sub(r"\s*\n\s*\d+[.)]\s*", ", ", str(text))
    text = re.sub(r"^\s*\d+[.)]\s*", "", text)
    out, buf, depth = [], [], 0
    for ch in str(text):
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth = max(0, depth - 1)
        if depth == 0 and (ch == sep or ch in ";\n"):
            out.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
    out.append("".join(buf))
    items = []
    for t in out:
        t = re.sub(r"^\s*\d+[.)]\s*", "", t).strip().strip("•-–").strip()
        # "…, and independent CA practice" -> the item, not the conjunction
        t = re.sub(r"^(and|plus|or|as well as)\s+", "", t, flags=re.I).strip()
        if t:
            items.append(t)
    return items


def exam_mentions(text, exam_cards):
    """Exams NAMED in the sheet's Entry Exams prose, validated against the
    exams tab so a chip can never dead-end. Catches the routes our cutoff
    tables don't cover (Ayurveda -> NEET, Law -> CLAT/CUET): the sheet
    names them even when we hold no cutoff data for that branch."""
    out = []
    if pd.isna(text):
        return out
    # first-appearance order: a set's order changes run to run (hash
    # randomisation), which reshuffled chips on every rebuild
    tokens = dict.fromkeys(re.findall(r"\b[A-Z][A-Z-]{2,}[A-Za-z]*\b", str(text)))
    for tok in tokens:
        k = norm(tok)
        for card in exam_cards:
            hay = [card["acronym"]] + (card.get("aliases") or [])
            if any(norm(h).startswith(k) or k == norm(h) for h in hay):
                # search by the matched card's ACRONYM, not the raw token —
                # "JEE" as a query also matches WBJEE/OJEE/SRMJEE
                out.append({"label": card["acronym"],
                            "href": f"/exams?q={card['acronym']}"})
                break
    return out


# ── college options across every exam we hold cutoffs for ───────────────
# The survey finding this serves: students underestimate cutoffs by ~25%
# and tunnel on one exam. So each career shows a FEW real colleges per
# exam route with the MOST COMPETITIVE closing number we hold (min rank /
# max marks across categories ≈ the General cutoff) — a sense of where
# this leads and how hard the door really is, not a ranking product.

def _num(v):
    try:
        return float(str(v).replace(",", ""))
    except (TypeError, ValueError):
        return None

# per exam: (data file, programme field, row filter, metric field,
#            higher_is_harder, display suffix)
OPTION_SOURCES = {
    "JoSAA": ("public/data/JEE/OPEN.json", "Academic Program Name",
              lambda r: r.get("Gender") == "Gender-Neutral",
              "Closing Rank", False, ""),
    "KCET": ("public/data/KCET/kcet_data.json", "Academic Program Name",
             lambda r: r.get("Language") == "Any" and r.get("Rural/Urban") == "All",
             "Closing Rank", False, ""),
    "WBJEE": ("public/data/WBJEE/wbjee_data.json", "Academic Program Name",
              lambda r: True, "Closing Rank", False, ""),
    "MHT-CET": ("public/data/MHTCET/mhtcet_data.json", "Academic Program Name",
                lambda r: str(r.get("PWD")) in ("", "None", "False", "No")
                and str(r.get("Defense")) in ("", "None", "False", "No"),
                "Closing Rank", False, ""),
    "OJEE": ("public/data/OJEE/ojee_data.json", "Academic Program Name",
             lambda r: True, "Closing Rank", False, " (JEE Main rank)"),
    "NEET": ("public/data/NEETUG/NEETUG.json", "Academic Program Name",
             lambda r: r.get("Seat Type") == "All India"
             and r.get("Gender") in (None, "", "Gender-Neutral"),
             "Closing Rank", False, " (AIQ)"),
    "CLAT": ("public/data/CLAT/clat_data.json", "Academic Program Name",
             lambda r: not r.get("Women Row") and not r.get("PwD Row")
             and not r.get("Domicile State"),
             "Closing Rank", False, ""),
    "TNEA": ("public/data/TNEA/tnea_data.json", "Branch",
             lambda r: True, "Cutoff Marks", True, "/200 marks"),
    "AIIMS-Nursing": ("public/data/AIIMSNURSING/aiimsnursing_data.json", "Academic Program Name",
                      lambda r: r.get("Seat Category") == "UR",
                      "Closing Rank", False, " (AIIMS nursing rank)"),
    "ICAR-UG": ("public/data/ICARUG/icarug_data.json", "Course Raw",
                lambda r: r.get("Category") == "UR",
                "Cutoff Marks", True, " CUET marks (of 750)"),
    "UPTAC": ("public/data/UPTAC/uptac_data.json", "Branch",
              lambda r: r.get("Category") == "GEN" and r.get("Sub Category") == "None"
              and r.get("Domicile") == "UP" and r.get("Seat Gender") != "WOMEN",
              "Closing Rank", False, " (JEE Main rank)"),
    # last: five colleges in one city only fill spare slots
    "JAC-Chandigarh": ("public/data/JACCHD/jacchd_data.json", "Academic Program Name",
                       lambda r: r.get("Category") == "General",
                       "Closing Rank", False, " (JEE Main rank)"),
}

EXAM_LABEL = {"JAC-Chandigarh": "JAC Chandigarh", "AIIMS-Nursing": "AIIMS-EE",
              "ICAR-UG": "ICAR-UG (CUET)"}

_option_cache = {}


def _load_options_file(path):
    if path not in _option_cache:
        with open(path) as fh:
            _option_cache[path] = json.load(fh)
    return _option_cache[path]


def college_options(branch_id, em, tab_link, per_exam=1, total=6):
    """A few real (college, branch, exam, closing number) rows per exam
    route for this career's branch. JoSAA splits into JEE Advanced (IITs)
    vs JEE Main; each row keeps its own rank basis — never compare the
    numbers across exams."""
    if branch_id is None:
        return []
    out = []
    for exam, (path, prog_field, keep, metric, higher, suffix) in OPTION_SOURCES.items():
        raws = set(em[(em.exam == exam) & (em.branch_id == branch_id)].branch_raw)
        if not raws or not os.path.exists(path):
            continue
        best = {}  # college -> (value, row): one line per college per exam
        for r in _load_options_file(path):
            if r.get(prog_field) not in raws or not keep(r):
                continue
            v = _num(r.get(metric))
            if v is None or v <= 0:
                continue
            # KCET prints its college code into the name ("E005  R. V. ...")
            key = re.sub(r"^[A-Z]\d+\s+", "", str(r.get("Institute") or "")).strip()
            if key not in best or (v > best[key][0]) == higher:
                best[key] = (v, r)
        # which college represents this route: the best NIRF-ranked one we
        # can link, then the toughest cutoff. Toughest-number-only surfaced
        # colleges students had never heard of (Amogh: "random colleges"),
        # and OJEE's JEE-Main ranks in the lakhs read as noise.
        # only a NIRF list that matches the branch counts: a Pharmacy #56
        # must not outrank an Engineering #75 for aerospace engineering
        lists = NIRF_LISTS_BY_BRANCH.get(branch_id, {"Engineering"})
        def nirf_of(college):
            q = tab_link(college)
            cat, rank = NIRF_BY_DISPLAY.get(q, (None, None)) if q else (None, None)
            return rank if cat in lists else 10**6
        rows = [kv for kv in best.items() if higher or kv[1][0] <= 300000]
        rows.sort(key=lambda kv: (nirf_of(kv[0]),
                                  -kv[1][0] if higher else kv[1][0]))
        for college, (v, r) in rows[:per_exam]:
            prog = r.get(prog_field)
            if exam == "JoSAA":
                ct = str(r.get("College Type") or "")
                label = ("JEE Advanced" if ("IIT" in ct and "IIIT" not in ct)
                         else "JEE Main")
            else:
                label = EXAM_LABEL.get(exam, exam)
            display = (f"{v:g}{suffix}" if higher
                       else f"{int(v):,}{suffix}")
            out.append({"college": college,
                        "branch": re.split(r" \((?!Hons)", str(prog))[0],
                        "exam": label, "closing": display,
                        "q": tab_link(college)})
    return out[:total]


COLLEGES_TAB = "public/data/colleges/colleges.json"
NIRF_LISTS_BY_BRANCH = {
    "ARCH": {"Architecture"}, "PLAN": {"Architecture"},
    "PHARMA": {"Pharmacy"}, "MBBS": {"Medical"}, "DENTAL": {"Medical", "Dental"},
    "LLB": {"Law"}, "NURSING": {"Medical"},
    "AGRI": {"Agriculture"}, "HORTI": {"Agriculture"}, "FOREST": {"Agriculture"},
    "FISH": {"Agriculture"}, "SERI": {"Agriculture"},
    "AGRIENG": {"Engineering", "Agriculture"}, "DAIRYENG": {"Engineering", "Agriculture"},
    "FOODENG": {"Engineering", "Agriculture"},
}
# a band-only college ranks at its band's top ("101-150" -> 101)
NIRF_BY_DISPLAY = {c["display_name"]: (c["nirf"]["category"],
                                       c["nirf"]["rank"] if c["nirf"]["rank"] is not None
                                       else int(c["nirf"]["latest_band"]["band"].split("-")[0]))
                   for c in json.load(open(COLLEGES_TAB)) if c.get("nirf")}
ACRONYMS = {
    "iit": "indian institute of technology",
    "nit": "national institute of technology",
    "iiit": "indian institute of information technology",
    "iiest": "indian institute of engineering science and technology",
    "spa": "school of planning and architecture",
    "ict": "institute of chemical technology",
    "aiims": "all india institute of medical sciences",
}


SUBUNIT = re.compile(r"^(Faculty of Agricultural|Institute of Agricultural Sciences|Palli Siksha)", re.I)


def college_linker():
    """Match a sheet name like 'IIT Delhi' to the Colleges tab's display
    name so the link's ?q= is guaranteed to find it. Conservative: only a
    unique all-tokens match links; names not on the tab (BITS, Jadavpur)
    stay plain text."""
    displays = [c["display_name"] for c in json.load(open(COLLEGES_TAB))]
    dtokens = [(d, set(norm(d).split())) for d in displays]

    def link(name):
        base = re.sub(r"\(.*?\)", " ", str(name))  # drop parentheticals
        toks = [ACRONYMS.get(t, t) for t in norm(base).split()]
        toks = set(" ".join(toks).split())
        toks.discard("s")  # possessive left by norm: "King George's"
        if not toks:
            return None
        # a faculty / institute card (ICAR's "Faculty of Agricultural
        # Sciences, Aligarh Muslim University") is not its whole university:
        # "Aligarh Muslim University" on an EEE page must not land there
        hits = [d for d, dt in dtokens if toks <= dt
                and not (SUBUNIT.match(d) and not toks & {"faculty", "institute", "palli"})]
        return hits[0] if len(hits) == 1 else None

    return link


def specializations(text):
    out = []
    if pd.isna(text):
        return out
    for part in str(text).split("|"):
        name, _, blurb = part.partition(":")
        if name.strip():
            out.append({"name": name.strip(), "blurb": blurb.strip()})
    return out


def main():
    d = pd.read_csv(SRC)
    tax = pd.read_csv(TAXONOMY)
    parents = tax[tax.primary_branch_id.isna()]
    pmap = {norm(n): i for i, n in parents[["branch_id", "branch_name"]].values}

    tax = pd.read_csv(TAXONOMY)
    tax_vertical = {
        r.branch_id: (str(r.vertical).strip() if pd.notna(r.vertical) and str(r.vertical).strip() else None)
        for r in tax.itertuples()
    }
    em = pd.read_csv(EXAM_MAP)
    exams_by_branch = em.groupby("branch_id")["exam"].agg(lambda s: sorted(set(s)))
    exam_cards = json.load(open(EXAMS_TAB))
    tab_link = college_linker()

    cards, branch_to_career = [], {}
    for _, r in d.iterrows():
        name = str(r["Career Name"]).strip()
        cid = slug(name)
        branch_id = CAREER_BRANCH.get(name) or pmap.get(norm(name))
        exams = []
        if branch_id is not None and branch_id in exams_by_branch.index:
            for ex in exams_by_branch[branch_id]:
                for label, href in EXAM_LINKS.get(ex, []):
                    # a chip into the predictor must land on rows: JAC
                    # Chandigarh's B.Arch is a Paper 2 rank, kept out of
                    # its predictor, so Architecture gets no JAC chip
                    if href.startswith("/predictor") and ex in OPTION_SOURCES:
                        path, field = OPTION_SOURCES[ex][:2]
                        raws = set(em[(em.exam == ex) & (em.branch_id == branch_id)].branch_raw)
                        if not any(x.get(field) in raws for x in _load_options_file(path)):
                            continue
                    exams.append({"label": label, "href": href})
        # exams the sheet names that our cutoff tables don't carry
        for m in exam_mentions(r["Entry Exams"], exam_cards):
            if not any(e["label"] == m["label"] for e in exams):
                exams.append(m)
        # still nothing? offer the ALL-INDIA exams whose streams include
        # this field (Arts -> CUET (UG)) — national routes only, so a
        # humanities career doesn't drown in university-specific tests
        if not exams:
            for card in exam_cards:
                if card["scope_type"] == "All India" and name in card["streams"]:
                    exams.append({"label": card["acronym"],
                                  "href": f"/exams?q={card['acronym']}"})
                if len(exams) >= 3:
                    break
        # exact-name careers own the reverse link (branch chip -> career);
        # a PINNED rename (Dentistry -> DENTAL) keeps its link too, but never
        # steals a branch an exact-name career already claimed
        if branch_id and norm(name) in pmap:
            branch_to_career[branch_id] = cid
        elif branch_id and CAREER_BRANCH.get(name) == branch_id:
            branch_to_career.setdefault(branch_id, cid)
        # Amogh's derived eligibility: which 11th-12th stream can reach this
        # career. Controlled values; "All" means any stream qualifies.
        streams_raw = (str(r["Eligible Streams (After Class 12)"]).strip()
                       if pd.notna(r["Eligible Streams (After Class 12)"]) else "")
        eligible = sorted({t.strip() for t in streams_raw.split(",") if t.strip()})
        # career domain = the branch taxonomy's vertical (Engineering, Medical
        # Allied…); careers with no branch fall back to their exams / name
        vertical = tax_vertical.get(branch_id) if branch_id else None
        if not vertical:
            joined = " ".join(e["label"] for e in exams).lower() + " " + name.lower()
            if "neet" in joined or re.search(r"medic|nurs|pharm|dent|ayur|homeo|physio|radiol|audiol|lab tech|paramed|veterin|naturopath", joined):
                vertical = "Medical Allied"
            elif "clat" in joined or "law" in joined:
                vertical = "Law"
            elif re.search(r"engineer|technolog|josaa|jee|cet|eapcet|tnea|wbjee|keam|ojee", joined):
                vertical = "Engineering"
            elif re.search(r"commerce|account|finance|business|admin|economics|management", joined):
                vertical = "Commerce & Management"
            elif re.search(r"physics|chemistry|math|biolog|botany|zoolog|geolog|science|forensic", joined):
                vertical = "Science"
            elif re.search(r"arts|english|history|political|psycholog|journal|music|japanese|social|teaching", joined):
                vertical = "Arts & Humanities"
            else:
                vertical = "Other"
        # ~9 filterable domains: the taxonomy's finer verticals fold in
        DOMAIN_FOLD = {
            "Medical Allied": "Medicine & Health", "Medicine": "Medicine & Health",
            "Ayurveda": "Medicine & Health", "Homeopathy": "Medicine & Health",
            "Naturopathy": "Medicine & Health",
            "Commerce": "Commerce & Management", "Management": "Commerce & Management",
            "Humanities": "Arts & Humanities", "Education": "Arts & Humanities",
            "Architecture": "Architecture & Design", "Design": "Architecture & Design",
        }
        vertical = DOMAIN_FOLD.get(vertical, vertical)
        if vertical == "Other":
            vertical = "Defence & Others"
        cards.append({
            "career_id": cid,
            "name": name,
            "branch_id": branch_id,
            "domain": vertical,
            "eligible_streams": eligible or None,
            "day_in_life": str(r["A Day in the Life"]).strip() if pd.notna(r["A Day in the Life"]) else None,
            "impact": str(r["Real-World Impact"]).strip() if pd.notna(r["Real-World Impact"]) else None,
            "entry_exams_text": str(r["Entry Exams"]).strip() if pd.notna(r["Entry Exams"]) else None,
            "exams": exams or None,
            # each college carries the tab's display name as q when it
            # exists there, so 'IIT Delhi' becomes a working link
            "top_colleges": [{"name": n, "q": tab_link(n)}
                             for n in split_list(r["Top Colleges"])],
            "pay": {
                "start": str(r["Starting Pay (0-5 yrs, LPA)"]).strip() if pd.notna(r["Starting Pay (0-5 yrs, LPA)"]) else None,
                "mid": str(r["Mid-Career Pay (5-15 yrs, LPA)"]).strip() if pd.notna(r["Mid-Career Pay (5-15 yrs, LPA)"]) else None,
                "senior": str(r["Senior-Level Pay (15+ yrs, LPA)"]).strip() if pd.notna(r["Senior-Level Pay (15+ yrs, LPA)"]) else None,
            },
            "recruiters": split_list(r["Top Recruiters"]),
            "stability": str(r["Stability Outlook"]).strip() if pd.notna(r["Stability Outlook"]) else None,
            "automation_risk": str(r["Automation Risk"]).strip() if pd.notna(r["Automation Risk"]) else None,
            "where_work": str(r["Where You Can Work"]).strip() if pd.notna(r["Where You Can Work"]) else None,
            "college_options": college_options(branch_id, em, tab_link),
            "notable_people": split_list(r["Notable People"]),
            "sources": str(r["Sources"]).strip() if pd.notna(r["Sources"]) else None,
            "specializations": specializations(r["Common Specializations (Optional)"]),
        })

    ids = [c["career_id"] for c in cards]
    dupes = {i for i in ids if ids.count(i) > 1}
    assert not dupes, f"duplicate career ids: {dupes}"

    os.makedirs(OUT_DIR, exist_ok=True)
    json.dump(cards, open(f"{OUT_DIR}/careers.json", "w"), indent=1)
    # branches with no career page of their own link to the nearest one
    # (never overriding a branch that has its own)
    for bid, cid in BRANCH_CAREER_FALLBACK.items():
        branch_to_career.setdefault(bid, cid)
    json.dump(branch_to_career, open(f"{OUT_DIR}/branch_to_career.json", "w"), indent=1)
    with_exams = sum(1 for c in cards if c["exams"])
    print(f"{len(cards)} careers -> {OUT_DIR}/careers.json "
          f"({with_exams} with exam chips, {len(branch_to_career)} branch links)")


if __name__ == "__main__":
    main()
