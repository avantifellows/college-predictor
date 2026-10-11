"""
Build public/data/careers/quiz.json, the Career Quiz, from Amogh's
riasec_quiz.xlsx, kept in data-sources as four CSVs:

  career_quiz_statements.csv   "Self Rating": 30 statements, 5 per RIASEC
                               type, rated Strongly disagree .. Strongly agree
  career_quiz_tiebreakers.csv  "Tie-breakers": one "would you rather" pair
                               per two types, asked when the top types are close
  career_quiz_subjects.csv     "Subjects": the favourite-subject choices
  career_subjects.csv          "Career Subjects": each career's subjects,
                               strongest first

Refresh the CSVs from the sheet with --from-xlsx ~/careers/riasec_quiz.xlsx.
The matching runs in the browser (utils/careerMatch.js) against each
career's RIASEC scores in careers.json.
"""
import json
import sys

import pandas as pd

DS = "data-sources"
OUT = "public/data/careers/quiz.json"
CAREERS = "public/data/careers/careers.json"
RIASEC = list("RIASEC")
SCALE = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"]


def from_xlsx(path):
    def rows(sheet, key):
        d = pd.read_excel(path, sheet_name=sheet)
        # the sheets end in notes rows with no number
        if key != "#":
            return d[d[key].notna()]
        d = d[pd.to_numeric(d["#"], errors="coerce").notna()].copy()
        d["#"] = d["#"].astype(int)
        return d
    rows("Self Rating", "#")[["#", "Statement", "RIASEC Type"]].to_csv(
        f"{DS}/career_quiz_statements.csv", index=False)
    rows("Tie-breakers", "#")[["#", "Option A", "Type A", "Option B", "Type B"]].to_csv(
        f"{DS}/career_quiz_tiebreakers.csv", index=False)
    rows("Subjects", "#")[["#", "Subject"]].to_csv(f"{DS}/career_quiz_subjects.csv", index=False)
    rows("Career Subjects", "Career Name")[["Career Name", "Subjects (strongest first)"]].to_csv(
        f"{DS}/career_subjects.csv", index=False)


def main():
    if len(sys.argv) == 3 and sys.argv[1] == "--from-xlsx":
        from_xlsx(sys.argv[2])

    st = pd.read_csv(f"{DS}/career_quiz_statements.csv")
    statements = [{"id": int(r["#"]), "text": r["Statement"].strip(), "type": r["RIASEC Type"].strip()}
                  for _, r in st.iterrows()]
    for k in RIASEC:
        n = sum(s["type"] == k for s in statements)
        # the same number per type, so no type weighs more than another
        assert n == len(statements) / 6, f"{k}: {n} statements"

    tb = pd.read_csv(f"{DS}/career_quiz_tiebreakers.csv")
    tiebreakers = [{"id": int(r["#"]),
                    "a": {"text": r["Option A"].strip(), "type": r["Type A"].strip()},
                    "b": {"text": r["Option B"].strip(), "type": r["Type B"].strip()}}
                   for _, r in tb.iterrows()]
    pairs = {frozenset((t["a"]["type"], t["b"]["type"])) for t in tiebreakers}
    assert len(pairs) == 15 and all(len(p) == 2 for p in pairs), "one pair per two types"

    subjects = [s.strip() for s in pd.read_csv(f"{DS}/career_quiz_subjects.csv")["Subject"]]
    names = {c["name"] for c in json.load(open(CAREERS))}
    cs = pd.read_csv(f"{DS}/career_subjects.csv")
    career_subjects = {}
    for _, r in cs.iterrows():
        tags = [s.strip() for s in r["Subjects (strongest first)"].split(",")]
        bad = [s for s in tags if s not in subjects]
        assert not bad, f"{r['Career Name']}: unknown subjects {bad}"
        career_subjects[r["Career Name"].strip()] = tags
    missing = names - set(career_subjects)
    assert not missing, f"careers without subjects: {sorted(missing)}"
    stale = set(career_subjects) - names
    assert not stale, f"subjects for careers that don't exist: {sorted(stale)}"

    quiz = {"scale": SCALE, "statements": statements, "tiebreakers": tiebreakers,
            "subjects": subjects, "careerSubjects": career_subjects}
    json.dump(quiz, open(OUT, "w"), indent=1, ensure_ascii=False)
    print(f"{len(statements)} statements, {len(tiebreakers)} tie-breakers, "
          f"{len(subjects)} subjects, {len(career_subjects)} careers -> {OUT}")


if __name__ == "__main__":
    main()
