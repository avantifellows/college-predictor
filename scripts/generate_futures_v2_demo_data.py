#!/usr/bin/env python3
import csv
import json
import re
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "public" / "data" / "futures-v2"
DOCS_DIR = ROOT / "docs"

CAREER_SOURCE = ROOT / "Career_Streams_Engineering_Populated - Sheet1.csv"
BRANCH_SOURCE = ROOT / "amogh-csv" / "branch.csv"
COLLEGE_SOURCE = ROOT / "amogh-csv" / "college.csv"
CUTOFF_SOURCE = ROOT / "amogh-csv" / "cutoffs.csv"
PRIYANKA_VERTICALS = Path("/Users/surya/Downloads/data_jsons/verticals.json")


MANUAL_TERMS = {
    "Automobile Engineering": ["mechanical", "production", "manufacturing"],
    "Earth Science And Engineering": ["earth sciences", "geological", "geophysical", "mining"],
    "Electrical / Electronics / Communications Engineering": [
        "electrical",
        "electronics",
        "communication",
        "telecommunication",
        "instrumentation",
    ],
    "Electronics And Communications Engineering": [
        "electronics and communication",
        "electronics",
        "communication",
        "telecommunication",
    ],
    "Industrial / Manufacturing / Production Engineering": [
        "industrial",
        "manufacturing",
        "production",
    ],
    "Marine / Ocean Engineering": ["marine", "ocean", "naval"],
    "Marine Engineering": ["marine", "naval"],
    "Mechanical / Mechatronics Engineering": ["mechanical", "mechatronics", "robotics"],
    "Metallurgy Engineering And Material Science": [
        "metallurgical",
        "metallurgy",
        "materials",
        "material science",
    ],
    "Paper And Printing Engineering": ["paper", "pulp", "printing"],
    "Printing Engineering": ["printing", "paper"],
    "Robotics Engineering": ["robotics", "mechatronics", "mechanical"],
    "Safety Engineering": ["safety", "fire", "industrial"],
}


def read_csv(path):
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def clean(value):
    value = "" if value is None else str(value).strip()
    return value or None


def slug(value):
    value = clean(value) or ""
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def compact_key(value):
    value = clean(value) or ""
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def number_or_none(value, cast=float):
    value = clean(value)
    if value is None:
        return None
    try:
        number = cast(value)
    except ValueError:
        return None
    return number


def int_or_none(value):
    """Parse ints that may arrive as float strings like "39.0"."""
    number = number_or_none(value, float)
    return None if number is None else int(number)


def split_list(value):
    value = clean(value)
    if not value:
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def degree_key(label):
    label = clean(label) or "degree"
    key = label.lower()
    key = key.replace("4yr", "4-year").replace("5yr", "5-year")
    return slug(key)


def degree_name(label):
    label = clean(label) or "Engineering Degree"
    replacements = {
        "4yr BTech": "B.Tech / B.E.",
        "5yr BTech-MTech": "Integrated B.Tech + M.Tech",
        "5yr BTech-MBA": "Integrated B.Tech + MBA",
        "5yr BArch": "B.Arch",
        "4yr BPlan": "B.Plan",
        "4yr BS": "B.S.",
        "5yr BS-MS": "Integrated B.S. + M.S.",
    }
    return replacements.get(label, label)


def institute_type(name, fallback=None):
    name = name or ""
    if "Indian Institute of Technology" in name:
        return "IIT"
    if "National Institute of Technology" in name:
        return "NIT"
    if "Indian Institute of Information Technology" in name:
        return "IIIT"
    if "School of Planning" in name:
        return "SPA"
    return fallback or "GFTI"


def load_vertical():
    fallback = {
        "id": "engineering",
        "source_id": 10,
        "name": "Engineering and Technology",
        "description": "Engineering and Technology careers connected to JoSAA programs.",
        "stream_required": "PCM",
        "maths_compulsory": True,
    }
    if not PRIYANKA_VERTICALS.exists():
        return fallback
    rows = json.loads(PRIYANKA_VERTICALS.read_text(encoding="utf-8"))
    match = next(
        (
            row
            for row in rows
            if (row.get("name") or "").lower() == "engineering and technology"
        ),
        None,
    )
    if not match:
        return fallback
    return {
        "id": "engineering",
        "source_id": match.get("vertical_id"),
        "name": match.get("name"),
        "description": match.get("description"),
        "stream_required": match.get("stream_required"),
        "maths_compulsory": bool(match.get("maths_compulsory")),
    }


def branch_search_text(branch):
    return compact_key(
        " ".join(
            [
                branch.get("branch_id") or "",
                branch.get("parent_branch_name") or "",
                branch.get("specialization") or "",
                branch.get("degree") or "",
            ]
        )
    )


def match_branches_for_career(career, branches, cutoff_counts):
    career_name = clean(career.get("career_name")) or ""
    parent = clean(career.get("parent_branch")) or ""
    terms = [career_name, parent]
    terms.extend(MANUAL_TERMS.get(career_name, []))
    terms.extend(MANUAL_TERMS.get(parent, []))
    normalized_terms = [compact_key(term) for term in terms if compact_key(term)]

    matches = []
    for branch in branches:
        text = branch["_search_text"]
        score = 0
        for term in normalized_terms:
            if not term:
                continue
            if term == text:
                score = max(score, 120)
            elif term in text:
                score = max(score, 90)
            elif text in term and len(text) > 8:
                score = max(score, 70)
            elif all(token in text for token in term.split() if len(token) > 2):
                score = max(score, 55)
        if score:
            if "4yr_btech" in (branch.get("branch_id") or ""):
                score += 15
            if "mba" in (branch.get("branch_id") or "").lower():
                score -= 12
            score += min(cutoff_counts.get(branch["id"], 0), 200) / 100
            matches.append((score, branch))

    deduped = {}
    for score, branch in sorted(matches, key=lambda item: item[0], reverse=True):
        deduped.setdefault(branch["id"], (score, branch))

    return [branch for _, branch in list(deduped.values())[:8]]


def best_cutoffs_for_branch(cutoffs):
    preferred = [
        row
        for row in cutoffs
        if row["seat_type"] == "OPEN" and row["gender_pool"] == "Gender-Neutral"
    ]
    rows = preferred or cutoffs
    return sorted(rows, key=lambda row: row["closing_rank"] or 10**9)[:8]


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_DIR.mkdir(parents=True, exist_ok=True)

    raw_branches = read_csv(BRANCH_SOURCE)
    raw_colleges = read_csv(COLLEGE_SOURCE)
    raw_cutoffs = read_csv(CUTOFF_SOURCE)
    raw_careers = read_csv(CAREER_SOURCE)
    vertical = load_vertical()

    cutoff_counts = Counter(row["branch_id"] for row in raw_cutoffs)

    branches = []
    seen_branch_ids = set()
    duplicate_branch_ids = []
    for row in raw_branches:
        branch_id = row["branch_id"]
        if branch_id in seen_branch_ids:
            duplicate_branch_ids.append(branch_id)
            continue
        seen_branch_ids.add(branch_id)
        branch = {
            "id": branch_id,
            "name": clean(row.get("specialization"))
            or clean(row.get("parent_branch_name"))
            or branch_id,
            "branch_group": clean(row.get("branch_group")),
            "parent_branch_name": clean(row.get("parent_branch_name")),
            "specialization": clean(row.get("specialization")),
            "degree_label": clean(row.get("degree")),
            "degree_id": degree_key(row.get("degree")),
            "cutoff_count": cutoff_counts.get(branch_id, 0),
        }
        branch["_search_text"] = branch_search_text(row)
        branches.append(branch)

    degrees_by_id = {}
    for branch in branches:
        degrees_by_id.setdefault(
            branch["degree_id"],
            {
                "id": branch["degree_id"],
                "name": degree_name(branch["degree_label"]),
                "label": branch["degree_label"],
            },
        )

    colleges = []
    for row in raw_colleges:
        colleges.append(
            {
                "id": row["college_id"],
                "name": clean(row.get("college_name")),
                "state": clean(row.get("state")),
                "type": institute_type(row.get("college_name"), row.get("college_type")),
                "nirf_rank": int_or_none(row.get("nirf_rank")),
                "placement_rate": number_or_none(row.get("placement_rate"), float),
                "median_salary": number_or_none(row.get("median_salary"), float),
                "naac_grade": clean(row.get("naac_grade")),
            }
        )

    college_by_id = {college["id"]: college for college in colleges}
    branch_by_id = {branch["id"]: branch for branch in branches}

    cutoffs = []
    missing_colleges = Counter()
    missing_branches = Counter()
    for index, row in enumerate(raw_cutoffs, start=1):
        college_id = row["college_id"]
        branch_id = row["branch_id"]
        if college_id not in college_by_id:
            missing_colleges[college_id] += 1
            continue
        if branch_id not in branch_by_id:
            missing_branches[branch_id] += 1
            continue
        exam_id = row["exam_id"]
        cutoffs.append(
            {
                "id": f"josaa-2025-r5-{index}",
                "college_id": college_id,
                "college_name": college_by_id[college_id]["name"],
                "branch_id": branch_id,
                "branch_name": branch_by_id[branch_id]["name"],
                "year": 2025,
                "round": 5,
                "quota": clean(row.get("quota")),
                "seat_type": clean(row.get("seat_type")),
                "gender_pool": clean(row.get("gender")),
                "rank_space": "JEE_ADVANCED"
                if exam_id == "EX_jee_advanced"
                else "JEE_MAIN",
                "exam": "JEE Advanced" if exam_id == "EX_jee_advanced" else "JEE Main",
                "opening_rank": number_or_none(row.get("opening_rank"), int),
                "closing_rank": number_or_none(row.get("closing_rank"), int),
                "source": "amogh-csv/cutoffs.csv",
            }
        )

    cutoffs_by_branch = defaultdict(list)
    for cutoff in cutoffs:
        cutoffs_by_branch[cutoff["branch_id"]].append(cutoff)

    careers = []
    career_branches = []
    unmatched_careers = []
    for row in raw_careers:
        career_id = slug(row["career_name"])
        matched = match_branches_for_career(row, branches, cutoff_counts)
        if not matched:
            unmatched_careers.append(row["career_name"])
        careers.append(
            {
                "id": career_id,
                "name": clean(row.get("career_name")),
                "parent_branch": clean(row.get("parent_branch")),
                "day_in_the_life": clean(row.get("day_in_the_life")),
                "real_world_impact": clean(row.get("real_world_impact")),
                "entry_exams": split_list(row.get("entry_exams")),
                "top_colleges_text": split_list(row.get("top_colleges")),
                "pay_entry_lpa": clean(row.get("pay_entry_lpa")),
                "pay_mid_lpa": clean(row.get("pay_mid_lpa")),
                "pay_senior_lpa": clean(row.get("pay_senior_lpa")),
                "top_recruiters": split_list(row.get("top_recruiters")),
                "stability_outlook": clean(row.get("stability_outlook")),
                "automation_risk": clean(row.get("automation_risk")),
                "geo_flexibility": clean(row.get("geo_flexibility")),
                "notable_practitioners": split_list(row.get("notable_practitioners")),
                "sources": clean(row.get("sources")),
                "vertical_id": vertical["id"],
            }
        )
        for rank, branch in enumerate(matched, start=1):
            career_branches.append(
                {
                    "career_id": career_id,
                    "branch_id": branch["id"],
                    "relevance_weight": round(max(0.35, 1.05 - (rank * 0.1)), 2),
                    "is_primary": rank == 1,
                    "match_method": "demo heuristic",
                }
            )

    related_branch_ids = {row["branch_id"] for row in career_branches}
    related_college_ids = {
        cutoff["college_id"]
        for cutoff in cutoffs
        if cutoff["branch_id"] in related_branch_ids
    }

    demo_branches = [
        {key: value for key, value in branch.items() if key != "_search_text"}
        for branch in branches
        if branch["id"] in related_branch_ids
    ]
    demo_colleges = [college for college in colleges if college["id"] in related_college_ids]
    demo_cutoffs = [
        cutoff for cutoff in cutoffs if cutoff["branch_id"] in related_branch_ids
    ]

    branch_degree = [
        {"branch_id": branch["id"], "degree_id": branch["degree_id"]}
        for branch in demo_branches
    ]
    vertical_branch = [
        {"vertical_id": vertical["id"], "branch_id": branch["id"]}
        for branch in demo_branches
    ]

    recommended_by_branch = {}
    for branch_id in related_branch_ids:
        recommended_by_branch[branch_id] = best_cutoffs_for_branch(cutoffs_by_branch[branch_id])

    data = {
        "metadata": {
            "generated_on": date.today().isoformat(),
            "scope": "Futures v2 Engineering + JoSAA demo",
            "source_files": [
                str(CAREER_SOURCE.relative_to(ROOT)),
                str(BRANCH_SOURCE.relative_to(ROOT)),
                str(COLLEGE_SOURCE.relative_to(ROOT)),
                str(CUTOFF_SOURCE.relative_to(ROOT)),
                str(PRIYANKA_VERTICALS),
            ],
            "counts": {
                "verticals": 1,
                "careers": len(careers),
                "branches": len(demo_branches),
                "career_branches": len(career_branches),
                "colleges": len(demo_colleges),
                "cutoffs": len(demo_cutoffs),
                "degrees": len(degrees_by_id),
            },
        },
        "verticals": [vertical],
        "vertical_branch": vertical_branch,
        "degrees": sorted(degrees_by_id.values(), key=lambda item: item["name"]),
        "branch_degree": branch_degree,
        "branches": sorted(demo_branches, key=lambda item: item["name"]),
        "careers": sorted(careers, key=lambda item: item["name"]),
        "career_branch": career_branches,
        "colleges": sorted(
            demo_colleges,
            key=lambda item: (
                item["nirf_rank"] is None,
                item["nirf_rank"] or 9999,
                item["name"] or "",
            ),
        ),
        "cutoffs": demo_cutoffs,
        "recommended_cutoffs_by_branch": recommended_by_branch,
        "exams": [
            {
                "id": "jee-main",
                "name": "JEE Main",
                "rank_space": "JEE_MAIN",
                "counselling_process": "JoSAA",
            },
            {
                "id": "jee-advanced",
                "name": "JEE Advanced",
                "rank_space": "JEE_ADVANCED",
                "counselling_process": "JoSAA",
            },
        ],
    }

    (OUTPUT_DIR / "demo-data.json").write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    assumptions = [
        "# Futures V2 Demo Data Assumptions",
        "",
        f"Generated on: {date.today().isoformat()}",
        "",
        "## Source Files",
        "",
        f"- Careers: `{CAREER_SOURCE.name}`",
        f"- Branches: `{BRANCH_SOURCE}`",
        f"- Colleges: `{COLLEGE_SOURCE}`",
        f"- Cutoffs: `{CUTOFF_SOURCE}`",
        f"- Vertical metadata: `{PRIYANKA_VERTICALS}`",
        "",
        "## Key Assumptions",
        "",
        "- No AFDB tables are created for this demo. The generated JSON is shaped like the target table contract.",
        "- `amogh-csv/cutoffs.csv` is treated as the already-joined JoSAA demo cutoff input. It is not overwritten.",
        "- The demo uses JoSAA 2025 Round 5 because the source cutoff file is named/treated as 2025 R5.",
        "- JoSAA is treated as the counselling process. `EX_jee_main` maps to JEE Main / `JEE_MAIN`; `EX_jee_advanced` maps to JEE Advanced / `JEE_ADVANCED`.",
        "- JoSAA `quota`, `seat_type`, and `gender` remain directly on cutoff rows for the demo. We do not force them into `demographic_profile` yet.",
        "- The populated career sheet uses `career_name` and `parent_branch`; several rows have blank `parent_branch`, so career-to-branch joins use a documented heuristic.",
        "- Career-to-branch mappings are generated by matching career/parent-branch terms against Amogh's parsed branch names, with manual term aliases for broad labels.",
        "- `branch.degree_label` is only a parsed helper. The generated data also includes `degrees` and `branch_degree` for the eventual normalized shape.",
        "- College enrichment fields are sparse. UI should hide missing NIRF, placement, salary, NAAC, hostel, or fee values rather than inventing them.",
        "- `college_external_id` is not generated as a separate file yet because Amogh's cutoff/college CSVs already share `college_id`. Product-grade source mapping still belongs there later.",
        "",
        "## Generated Coverage",
        "",
        f"- Careers: {len(careers)}",
        f"- Career-branch mappings: {len(career_branches)}",
        f"- Demo branches with at least one career mapping: {len(demo_branches)}",
        f"- Demo colleges with at least one related cutoff: {len(demo_colleges)}",
        f"- Demo cutoff rows: {len(demo_cutoffs)}",
        f"- Duplicate branch IDs skipped from raw branch CSV: {len(set(duplicate_branch_ids))}",
        f"- Cutoff rows skipped for missing college IDs: {sum(missing_colleges.values())}",
        f"- Cutoff rows skipped for missing branch IDs: {sum(missing_branches.values())}",
        "",
        "## Career Rows With No Branch Match",
        "",
    ]
    if unmatched_careers:
        assumptions.extend([f"- {name}" for name in unmatched_careers])
    else:
        assumptions.append("- None")
    assumptions.extend(
        [
            "",
            "## Manual Alias Terms Used For Career-Branch Matching",
            "",
        ]
    )
    for key, values in sorted(MANUAL_TERMS.items()):
        assumptions.append(f"- {key}: {', '.join(values)}")

    (DOCS_DIR / "FUTURES_V2_DEMO_DATA_ASSUMPTIONS.md").write_text(
        "\n".join(assumptions) + "\n", encoding="utf-8"
    )

    print(json.dumps(data["metadata"]["counts"], indent=2))
    print(f"Wrote {OUTPUT_DIR / 'demo-data.json'}")
    print(f"Wrote {DOCS_DIR / 'FUTURES_V2_DEMO_DATA_ASSUMPTIONS.md'}")


if __name__ == "__main__":
    main()
