#!/usr/bin/env python3
import argparse
import csv
import json
from collections import Counter
from pathlib import Path


SOURCE_COLUMNS = {
    "college_id": "College ID",
    "state": "State",
    "expected_salary": "Expected Salary",
    "Entrance Exam": "Exam",
}

OUTPUT_COLUMNS = [
    "College ID",
    "Institute",
    "Academic Program Name",
    "AF Hierarchy",
    "State",
    "Seat Type",
    "Gender",
    "Quota",
    "Closing Rank",
    "Opening Rank",
    "College Type",
    "Management Type",
    "Expected Salary",
    "Salary Tier",
    "Exam",
]

ENRICHMENT_COLUMNS = [
    "AF Hierarchy",
    "College Type",
    "Management Type",
    "Salary Tier",
]

NUMERIC_COLUMNS = ["AF Hierarchy", "Expected Salary", "Salary Tier"]

EXPECTED_SEAT_TYPES = {
    "OPEN",
    "OPEN (PwD)",
    "OBC-NCL",
    "OBC-NCL (PwD)",
    "SC",
    "SC (PwD)",
    "ST",
    "ST (PwD)",
    "EWS",
    "EWS (PwD)",
}


def clean_value(value):
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def numeric_or_none(value):
    value = clean_value(value)
    if value is None:
        return None
    try:
        number = float(value)
    except ValueError:
        return value
    return int(number) if number.is_integer() else number


def canonical_institute(value):
    return " ".join(str(value or "").lower().split())


def load_existing_enrichment(data_dir):
    by_college_id = {}
    by_institute = {}

    for path in data_dir.glob("*.json"):
        if path.name == "jac_data.json":
            continue
        with path.open(encoding="utf-8") as handle:
            rows = json.load(handle)
        for row in rows:
            college_id = clean_value(row.get("College ID"))
            institute = canonical_institute(row.get("Institute"))
            enrichment = {
                key: row.get(key)
                for key in ["State", "Expected Salary", *ENRICHMENT_COLUMNS]
                if row.get(key) is not None
            }
            if college_id and college_id not in by_college_id:
                by_college_id[college_id] = enrichment
            if institute and institute not in by_institute:
                by_institute[institute] = enrichment

    return by_college_id, by_institute


def normalize_row(raw_row, enrichment_by_id, enrichment_by_institute):
    row = {}
    for source_key, value in raw_row.items():
        target_key = SOURCE_COLUMNS.get(source_key, source_key)
        row[target_key] = clean_value(value)

    college_id = row.get("College ID")
    institute_key = canonical_institute(row.get("Institute"))
    enrichment = {}
    if college_id:
        enrichment.update(enrichment_by_id.get(college_id, {}))
    if institute_key:
        enrichment.update(enrichment_by_institute.get(institute_key, {}))

    for key in ["State", *ENRICHMENT_COLUMNS]:
        if row.get(key) is None and enrichment.get(key) is not None:
            row[key] = enrichment[key]

    if row.get("Expected Salary") is None and enrichment.get("Expected Salary") is not None:
        row["Expected Salary"] = enrichment["Expected Salary"]

    for key in OUTPUT_COLUMNS:
        row.setdefault(key, None)

    for key in NUMERIC_COLUMNS:
        row[key] = numeric_or_none(row.get(key))

    return {key: row.get(key) for key in OUTPUT_COLUMNS}


def load_normalized_rows(source_path, data_dir):
    enrichment_by_id, enrichment_by_institute = load_existing_enrichment(data_dir)

    with source_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        rows = [
            normalize_row(raw_row, enrichment_by_id, enrichment_by_institute)
            for raw_row in reader
        ]

    return rows


def validate_rows(rows):
    issues = []
    seat_types = Counter(row["Seat Type"] for row in rows)
    exams = Counter(row["Exam"] for row in rows)
    quotas = Counter(row["Quota"] for row in rows)

    unknown_seat_types = set(seat_types) - EXPECTED_SEAT_TYPES
    if unknown_seat_types:
        issues.append(f"Unknown seat types: {sorted(unknown_seat_types)}")

    for index, row in enumerate(rows, start=2):
        for key in [
            "Institute",
            "Academic Program Name",
            "Seat Type",
            "Gender",
            "Quota",
            "Closing Rank",
            "Opening Rank",
            "Exam",
        ]:
            if row.get(key) is None:
                issues.append(f"Row {index}: missing {key}")

        if row.get("Exam") not in {"JEE Main", "JEE Advanced"}:
            issues.append(f"Row {index}: invalid Exam={row.get('Exam')}")

    return issues, seat_types, exams, quotas


def write_split_files(rows, output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)
    grouped = {}
    for row in rows:
        grouped.setdefault(row["Seat Type"], []).append(row)

    for seat_type, seat_rows in grouped.items():
        with (output_dir / f"{seat_type}.json").open("w", encoding="utf-8") as handle:
            json.dump(seat_rows, handle, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(
        description="Generate public/data/JEE/*.json from JoSAA 2025 cutoffs."
    )
    parser.add_argument(
        "--source",
        default="JoSAA 2025 - cutoffs.csv",
        help="Path to the JoSAA 2025 cutoff CSV.",
    )
    parser.add_argument(
        "--output-dir",
        default="public/data/JEE",
        help="Directory where split JEE JSON files should be written.",
    )
    parser.add_argument(
        "--write",
        action="store_true",
        help="Write JSON files. Without this flag, only prints a dry-run summary.",
    )
    args = parser.parse_args()

    source_path = Path(args.source)
    output_dir = Path(args.output_dir)

    if not source_path.exists():
        raise SystemExit(f"Source CSV not found: {source_path}")

    rows = load_normalized_rows(source_path, output_dir)
    issues, seat_types, exams, quotas = validate_rows(rows)

    print(f"Source: {source_path}")
    print(f"Rows: {len(rows)}")
    print(f"Seat types: {dict(sorted(seat_types.items()))}")
    print(f"Exams: {dict(sorted(exams.items()))}")
    print(f"Quotas: {dict(sorted(quotas.items()))}")

    missing_summary = {
        key: sum(1 for row in rows if row.get(key) is None)
        for key in OUTPUT_COLUMNS
    }
    print(
        "Missing values: "
        + json.dumps({key: value for key, value in missing_summary.items() if value})
    )

    if issues:
        print("Validation issues:")
        for issue in issues[:50]:
            print(f"- {issue}")
        if len(issues) > 50:
            print(f"...and {len(issues) - 50} more")
        raise SystemExit(1)

    if args.write:
        write_split_files(rows, output_dir)
        print(f"Wrote split files to {output_dir}")
    else:
        print("Dry run only. Re-run with --write to update JSON files.")


if __name__ == "__main__":
    main()
