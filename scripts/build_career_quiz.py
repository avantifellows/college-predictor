"""
Build public/data/careers/quiz.json, the Career Quiz's questions, from
data-sources/riasec_quiz.csv (Amogh's riasec_quiz.xlsx, "Quiz" sheet: 20
questions, six options each, every option tagged with one RIASEC letter).

Refresh from the sheet with --from-xlsx ~/careers/riasec_quiz.xlsx.
The matching runs in the browser (utils/riasec.js) against each career's
RIASEC scores in careers.json; this file only carries the questions.
"""
import json
import sys

import pandas as pd

SRC = "data-sources/riasec_quiz.csv"
OUT = "public/data/careers/quiz.json"
RIASEC = set("RIASEC")


def main():
    # --from-xlsx <path>: refresh the CSV from Amogh's sheet first
    if len(sys.argv) == 3 and sys.argv[1] == "--from-xlsx":
        sheet = pd.read_excel(sys.argv[2], sheet_name="Quiz")
        sheet[sheet["Question"].notna()].to_csv(SRC, index=False)
    q = pd.read_csv(SRC)
    questions = []
    for _, r in q.iterrows():
        options = []
        for i in range(1, 7):
            text, letter = r[f"Option {i}"], str(r[f"Option {i} RIASEC Type"]).strip()
            assert letter in RIASEC, f"Q{r['Q#']} option {i}: bad type {letter!r}"
            options.append({"text": str(text).strip(), "type": letter})
        # one option per type, so no answer weighs more than another
        assert sorted(o["type"] for o in options) == sorted(RIASEC), f"Q{r['Q#']}"
        questions.append({"id": int(r["Q#"]), "question": str(r["Question"]).strip(),
                          "options": options})
    json.dump(questions, open(OUT, "w"), indent=1, ensure_ascii=False)
    print(f"{len(questions)} questions -> {OUT}")


if __name__ == "__main__":
    main()
