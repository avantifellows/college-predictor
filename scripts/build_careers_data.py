"""
Build public/data/careers/careers.json from Amogh's career sheet
(~/jan2023/Career_Streams_Engineering_Populated - Sheet1.csv, 107 careers).

Each career carries the sheet's narrative fields plus a REAL exams join:
career name -> parent branch in the taxonomy (89/107 match by name; the
rest are pinned in CAREER_BRANCH below; non-academic careers like CA or
HCL TechBee map to nothing and simply show no exam chips) -> the exams
whose cutoff tables offer that branch, via ~/jan2023/exam_branch_mapping.csv.

branch_to_career.json is the reverse map (parent branch_id -> career slug)
so the colleges tab can link a branch chip to its career page.
"""
import json
import os
import re

import pandas as pd

SRC = "/Users/surya/jan2023/Career_Streams_Engineering_Populated - Sheet1.csv"
TAXONOMY = "/Users/surya/jan2023/branch - Branch.csv"
EXAM_MAP = "/Users/surya/jan2023/exam_branch_mapping.csv"
EXAMS_TAB = "public/data/exams/exams.json"
OUT_DIR = "public/data/careers"

# careers whose names don't normalise onto a taxonomy parent
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
    "TNEA": [("TNEA counselling", "/?exam=TNEA")],
    "WBJEE": [("WBJEE", "/exams?q=WBJEE")],
    "KEAM": [("KEAM", "/exams?q=KEAM")],
    "OJEE": [("OJEE", "/exams?q=OJEE")],
    "CLAT": [("CLAT", "/exams?q=CLAT")],
    "NEET": [("NEET-UG", "/exams?q=NEET")],
}


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", str(s).lower()).strip()


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", str(s).lower()).strip("-")


def split_list(text, sep=","):
    if pd.isna(text):
        return []
    return [t.strip() for t in str(text).split(sep) if t.strip()]


def exam_mentions(text, exam_cards):
    """Exams NAMED in the sheet's Entry Exams prose, validated against the
    exams tab so a chip can never dead-end. Catches the routes our cutoff
    tables don't cover (Ayurveda -> NEET, Law -> CLAT/CUET): the sheet
    names them even when we hold no cutoff data for that branch."""
    out = []
    if pd.isna(text):
        return out
    tokens = set(re.findall(r"\b[A-Z][A-Z-]{2,}[A-Za-z]*\b", str(text)))
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
}

_option_cache = {}


def _load_options_file(path):
    if path not in _option_cache:
        with open(path) as fh:
            _option_cache[path] = json.load(fh)
    return _option_cache[path]


def college_options(branch_id, em, per_exam=2, total=6):
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
        rows = sorted(best.items(), key=lambda kv: kv[1][0], reverse=higher)
        for college, (v, r) in rows[:per_exam]:
            prog = r.get(prog_field)
            if exam == "JoSAA":
                ct = str(r.get("College Type") or "")
                label = ("JEE Advanced" if ("IIT" in ct and "IIIT" not in ct)
                         else "JEE Main")
            else:
                label = exam
            display = (f"{v:g}{suffix}" if higher
                       else f"{int(v):,}{suffix}")
            out.append({"college": college,
                        "branch": str(prog).split(" (")[0],
                        "exam": label, "closing": display})
    return out[:total]


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

    em = pd.read_csv(EXAM_MAP)
    exams_by_branch = em.groupby("branch_id")["exam"].agg(lambda s: sorted(set(s)))
    exam_cards = json.load(open(EXAMS_TAB))

    cards, branch_to_career = [], {}
    for _, r in d.iterrows():
        name = str(r["Career Name"]).strip()
        cid = slug(name)
        branch_id = CAREER_BRANCH.get(name) or pmap.get(norm(name))
        exams = []
        if branch_id is not None and branch_id in exams_by_branch.index:
            for ex in exams_by_branch[branch_id]:
                for label, href in EXAM_LINKS.get(ex, []):
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
        # exact-name careers own the reverse link (branch chip -> career)
        if branch_id and norm(name) in pmap:
            branch_to_career[branch_id] = cid
        cards.append({
            "career_id": cid,
            "name": name,
            "branch_id": branch_id,
            "day_in_life": str(r["A Day in the Life"]).strip() if pd.notna(r["A Day in the Life"]) else None,
            "impact": str(r["Real-World Impact"]).strip() if pd.notna(r["Real-World Impact"]) else None,
            "entry_exams_text": str(r["Entry Exams"]).strip() if pd.notna(r["Entry Exams"]) else None,
            "exams": exams or None,
            "top_colleges": split_list(r["Top Colleges"]),
            "pay": {
                "start": str(r["Starting Pay (LPA)"]).strip() if pd.notna(r["Starting Pay (LPA)"]) else None,
                "mid": str(r["Mid-Career Pay (LPA)"]).strip() if pd.notna(r["Mid-Career Pay (LPA)"]) else None,
                "senior": str(r["Senior-Level Pay (LPA)"]).strip() if pd.notna(r["Senior-Level Pay (LPA)"]) else None,
            },
            "recruiters": split_list(r["Top Recruiters"]),
            "stability": str(r["Stability Outlook"]).strip() if pd.notna(r["Stability Outlook"]) else None,
            "automation_risk": str(r["Automation Risk"]).strip() if pd.notna(r["Automation Risk"]) else None,
            "where_work": str(r["Where You Can Work"]).strip() if pd.notna(r["Where You Can Work"]) else None,
            "college_options": college_options(branch_id, em),
            "notable_people": split_list(r["Notable People"]),
            "sources": str(r["Sources"]).strip() if pd.notna(r["Sources"]) else None,
            "specializations": specializations(r["Common Specializations (Optional)"]),
        })

    ids = [c["career_id"] for c in cards]
    dupes = {i for i in ids if ids.count(i) > 1}
    assert not dupes, f"duplicate career ids: {dupes}"

    os.makedirs(OUT_DIR, exist_ok=True)
    json.dump(cards, open(f"{OUT_DIR}/careers.json", "w"), indent=1)
    json.dump(branch_to_career, open(f"{OUT_DIR}/branch_to_career.json", "w"), indent=1)
    with_exams = sum(1 for c in cards if c["exams"])
    print(f"{len(cards)} careers -> {OUT_DIR}/careers.json "
          f"({with_exams} with exam chips, {len(branch_to_career)} branch links)")


if __name__ == "__main__":
    main()
