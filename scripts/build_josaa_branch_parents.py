#!/usr/bin/env python3
"""
JoSAA programme -> parent branch, for the college choice builder's
"preferred branch" question (pages/college_predictor -> ChoiceBuilder).

Reads the branch mapping the Colleges and Careers tabs already use:
  data-sources/exam_branch_mapping.csv  (exam = JoSAA: programme -> branch_id)
  data-sources/branch_taxonomy.csv      (branch_id -> primary_branch_id)
and writes public/data/JEE/josaa_branch_parents.json:
  { "<Academic Program Name>": {"id": "CSIT", "name": "Computer Science / ..."} }

Programmes JoSAA added after the mapping was built get a parent in
MISSING_FROM_MAPPING below; they belong upstream in exam_branch_mapping
(branches/evidence -> build_and_load.py), after which these lines can go.

Usage: python3 scripts/build_josaa_branch_parents.py
"""
import csv
import glob
import json
from pathlib import Path

MISSING_FROM_MAPPING = {
    "Computer Science and Engineering with specialization in Cyber Security "
    "(4 Years, Bachelor of Technology)": "CYBERSEC",
    "Computer Science and Engineering (with Specialization of Data Science and "
    "Artificial Intelligence) (4 Years, B. Tech / B. Tech (Hons.))": "AIML",
    "Electronics and Communication Engineering (with Specialization of Embedded "
    "Systems and Internet of Things) (4 Years, B. Tech / B. Tech (Hons.))": "ELEC",
}

ROOT = Path(__file__).resolve().parent.parent


def main():
    taxonomy = {
        r["branch_id"]: r
        for r in csv.DictReader(open(ROOT / "data-sources/branch_taxonomy.csv"))
    }
    mapping = {
        r["branch_raw"]: r["branch_id"]
        for r in csv.DictReader(open(ROOT / "data-sources/exam_branch_mapping.csv"))
        if r["exam"] == "JoSAA"
    }
    mapping.update(MISSING_FROM_MAPPING)

    def parent(branch_id):
        row = taxonomy.get(branch_id)
        if not row:
            return None
        pid = row["primary_branch_id"] or branch_id
        return {"id": pid, "name": taxonomy[pid]["branch_name"].strip()}

    programmes = set()
    for path in glob.glob(str(ROOT / "public/data/JEE/*.json")):
        name = Path(path).name
        if name in {"jac_data.json", "jee_adv_marks_at_rank.json",
                    "josaa_2025_all_rounds.json", "josaa_branch_parents.json"}:
            continue
        for row in json.load(open(path)):
            programmes.add(row["Academic Program Name"])

    out, unmapped = {}, []
    for programme in sorted(programmes):
        p = parent(mapping.get(programme))
        if p:
            out[programme] = p
        else:
            unmapped.append(programme)

    dest = ROOT / "public/data/JEE/josaa_branch_parents.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, sort_keys=True))
    parents = {p["id"] for p in out.values()}
    print(f"{len(out)} programmes -> {len(parents)} parent branches; wrote {dest}")
    if unmapped:
        print(f"UNMAPPED ({len(unmapped)}):")
        for u in unmapped:
            print("  ", u)


if __name__ == "__main__":
    main()
