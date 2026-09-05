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
    "Marine Engineering": "MARINE",
    "Mechanical Engineering": "MECHENG",
    "Medicine (MBBS)": "MBBS",
    "Ocean Engineering": "MARINE",
    "Structural Engineering": "CIVILENG",
    # deliberately unmapped: Armed Forces, CA, HCL TechBee, Japanese, Law
}

# how each mapping source shows up as a chip: label + where it leads.
# Everything links into the Exams tab pre-searched, EXCEPT TNEA — Tamil
# Nadu admits on 12th marks with no entrance exam, so it has no exams-tab
# card; its chip goes straight to the predictor with TNEA preselected.
EXAM_LINKS = {
    "JoSAA": ("JEE Main / Advanced", "/exams?q=JEE"),
    "KCET": ("KCET", "/exams?q=KCET"),
    "MHT-CET": ("MHT-CET", "/exams?q=MHT CET"),
    "TG-EAPCET": ("TG EAPCET", "/exams?q=TG EAPCET"),
    "AP-EAPCET": ("AP EAPCET", "/exams?q=AP EAPCET"),
    "GUJCET": ("GUJCET", "/exams?q=GUJCET"),
    "TNEA": ("TNEA counselling", "/?exam=TNEA"),
    "WBJEE": ("WBJEE", "/exams?q=WBJEE"),
    "KEAM": ("KEAM", "/exams?q=KEAM"),
    "OJEE": ("OJEE", "/exams?q=OJEE"),
    "CLAT": ("CLAT", "/exams?q=CLAT"),
    "NEET": ("NEET-UG", "/exams?q=NEET"),
}


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", str(s).lower()).strip()


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", str(s).lower()).strip("-")


def split_list(text, sep=","):
    if pd.isna(text):
        return []
    return [t.strip() for t in str(text).split(sep) if t.strip()]


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

    cards, branch_to_career = [], {}
    for _, r in d.iterrows():
        name = str(r["Career Name"]).strip()
        cid = slug(name)
        branch_id = CAREER_BRANCH.get(name) or pmap.get(norm(name))
        exams = []
        if branch_id is not None and branch_id in exams_by_branch.index:
            for ex in exams_by_branch[branch_id]:
                if ex in EXAM_LINKS:
                    label, href = EXAM_LINKS[ex]
                    exams.append({"label": label, "href": href})
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
