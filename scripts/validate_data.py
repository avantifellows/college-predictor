#!/usr/bin/env python3
"""Validate scholarship and college cutoff data before database migration."""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import sys
import urllib.request
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


SCHOLARSHIP_SHEET_CSV_URL = (
    "https://docs.google.com/spreadsheets/d/e/"
    "2PACX-1vRBCqBFvIMpaTcHz4Pl6mJ5zxazM-0EBVu_adM8KfLsUXcpclW2a4t29Jy0PH63CBSJR5z5hJxU342y/"
    "pub?output=csv"
)

REPORT_COLUMNS = [
    "dataset",
    "source",
    "row_number",
    "issue_type",
    "field",
    "value",
    "message",
]

SCHOLARSHIP_REQUIRED_FIELDS = [
    "Scholarship Name",
    "Status",
    "Family Income (in INR)",
]

COLLEGE_FIELDS = ["Institute", "College Name", "institute_name"]
BRANCH_FIELDS = ["Academic Program Name", "Course", "branch_name"]
CATEGORY_FIELDS = ["Category", "category", "Seat Type"]
YEAR_FIELDS = ["Year", "year", "Counselling Year", "Academic Year"]
RANK_FIELDS = ["Opening Rank", "Closing Rank", "closing_rank"]
CUTOFF_FIELDS = ["Cutoff Marks", "closing_marks"]

DUPLICATE_DIMENSION_FIELDS = [
    "College ID",
    "Institute ID",
    "Institute Code",
    "AISHE Code",
    "inst_code",
    "Category_Key",
    "branch_code",
    "Round",
    "round",
    "Gender",
    "gender",
    "Quota",
    "quota",
    "Seat Type",
    "State",
    "region",
    "Defense",
    "PWD",
    "is_PWD",
    "Course Type",
    "College Type",
    "District",
    "dist_code",
    "Program",
    "Language",
    "Rural/Urban",
]

NUMBER_RE = re.compile(r"^-?\d+(?:\.\d+)?$")


@dataclass(frozen=True)
class ValidationIssue:
    dataset: str
    source: str
    row_number: int
    issue_type: str
    field: str
    value: str
    message: str

    def as_report_row(self) -> Dict[str, Any]:
        return {
            "dataset": self.dataset,
            "source": self.source,
            "row_number": self.row_number,
            "issue_type": self.issue_type,
            "field": self.field,
            "value": self.value,
            "message": self.message,
        }


def is_blank(value: Any) -> bool:
    return value is None or str(value).strip() == ""


def display_value(value: Any) -> str:
    if value is None:
        return ""
    return str(value)


def normalize_key_value(value: Any) -> str:
    return " ".join(str(value).strip().lower().split())


def get_first_present_value(
    row: Dict[str, Any], candidate_fields: Sequence[str]
) -> Tuple[Optional[str], Optional[Any]]:
    for field in candidate_fields:
        if field in row and not is_blank(row[field]):
            return field, row[field]
    return None, None


def source_label(path: Path, root: Path) -> str:
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def read_text_source(source: str) -> str:
    if source.startswith(("http://", "https://")):
        with urllib.request.urlopen(source, timeout=30) as response:
            return response.read().decode("utf-8-sig")

    return Path(source).read_text(encoding="utf-8-sig")


def clean_csv_row(row: Dict[Optional[str], Any]) -> Dict[str, Any]:
    return {
        str(key).strip(): value.strip() if isinstance(value, str) else value
        for key, value in row.items()
        if key is not None
    }


def load_scholarship_rows(source: str) -> List[Dict[str, Any]]:
    csv_text = read_text_source(source)
    reader = csv.DictReader(io.StringIO(csv_text))
    return [clean_csv_row(row) for row in reader]


def load_json_rows(path: Path) -> List[Dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("expected top-level JSON array")
    if any(not isinstance(row, dict) for row in data):
        raise ValueError("expected every JSON array item to be an object")
    return data


def parse_number(value: Any) -> Optional[float]:
    if is_blank(value):
        return None

    text = str(value).strip().replace(",", "")
    if text.upper().endswith("P"):
        text = text[:-1]

    if not NUMBER_RE.fullmatch(text):
        return None

    return float(text)


def add_missing_required_issue(
    issues: List[ValidationIssue],
    dataset: str,
    source: str,
    row_number: int,
    field: str,
) -> None:
    issues.append(
        ValidationIssue(
            dataset=dataset,
            source=source,
            row_number=row_number,
            issue_type="missing_required_field",
            field=field,
            value="",
            message=f"Required field '{field}' is blank or missing.",
        )
    )


def validate_scholarships(
    rows: Sequence[Dict[str, Any]], source: str
) -> List[ValidationIssue]:
    issues: List[ValidationIssue] = []
    duplicate_names: Dict[str, List[int]] = defaultdict(list)

    for row_number, row in enumerate(rows, start=2):
        for field in SCHOLARSHIP_REQUIRED_FIELDS:
            if is_blank(row.get(field)):
                add_missing_required_issue(
                    issues, "scholarships", source, row_number, field
                )

        income_value = row.get("Family Income (in INR)")
        if not is_blank(income_value):
            normalized_income = str(income_value).strip().replace(",", "")
            income_number = parse_number(normalized_income)
            if income_number is None:
                issues.append(
                    ValidationIssue(
                        dataset="scholarships",
                        source=source,
                        row_number=row_number,
                        issue_type="invalid_income_format",
                        field="Family Income (in INR)",
                        value=display_value(income_value),
                        message=(
                            "Expected a numeric income value. Text such as "
                            "'2 lakhs', 'N/A', or 'above 3' should be normalized "
                            "before migration."
                        ),
                    )
                )
            elif income_number < 0:
                issues.append(
                    ValidationIssue(
                        dataset="scholarships",
                        source=source,
                        row_number=row_number,
                        issue_type="invalid_income_value",
                        field="Family Income (in INR)",
                        value=display_value(income_value),
                        message="Family income cannot be negative.",
                    )
                )

        name = row.get("Scholarship Name")
        if not is_blank(name):
            duplicate_names[normalize_key_value(name)].append(row_number)

    for name, row_numbers in duplicate_names.items():
        if len(row_numbers) <= 1:
            continue
        joined_rows = ", ".join(str(row_number) for row_number in row_numbers)
        for row_number in row_numbers:
            issues.append(
                ValidationIssue(
                    dataset="scholarships",
                    source=source,
                    row_number=row_number,
                    issue_type="duplicate_scholarship_name",
                    field="Scholarship Name",
                    value=name,
                    message=f"Scholarship name is repeated on rows {joined_rows}.",
                )
            )

    return issues


def validate_numeric_field(
    issues: List[ValidationIssue],
    source: str,
    row_number: int,
    row: Dict[str, Any],
    field: str,
    issue_prefix: str,
) -> Optional[float]:
    value = row.get(field)
    if is_blank(value):
        add_missing_required_issue(issues, "college_cutoffs", source, row_number, field)
        return None

    number = parse_number(value)
    if number is None:
        issues.append(
            ValidationIssue(
                dataset="college_cutoffs",
                source=source,
                row_number=row_number,
                issue_type=f"invalid_{issue_prefix}_format",
                field=field,
                value=display_value(value),
                message=f"Expected '{field}' to contain a numeric value.",
            )
        )
        return None

    if number <= 0:
        issues.append(
            ValidationIssue(
                dataset="college_cutoffs",
                source=source,
                row_number=row_number,
                issue_type=f"invalid_{issue_prefix}_value",
                field=field,
                value=display_value(value),
                message=f"Expected '{field}' to be greater than zero.",
            )
        )

    return number


def build_duplicate_key(row: Dict[str, Any], source: str) -> Optional[Tuple[str, ...]]:
    _, college = get_first_present_value(row, COLLEGE_FIELDS)
    _, branch = get_first_present_value(row, BRANCH_FIELDS)
    _, category = get_first_present_value(row, CATEGORY_FIELDS)

    if is_blank(college) or is_blank(branch) or is_blank(category):
        return None

    key_parts = [
        f"source={source}",
        f"college={normalize_key_value(college)}",
        f"branch={normalize_key_value(branch)}",
        f"category={normalize_key_value(category)}",
    ]

    _, year = get_first_present_value(row, YEAR_FIELDS)
    if not is_blank(year):
        key_parts.append(f"year={normalize_key_value(year)}")

    for field in DUPLICATE_DIMENSION_FIELDS:
        if field in row and not is_blank(row[field]):
            key_parts.append(f"{field}={normalize_key_value(row[field])}")

    return tuple(key_parts)


def validate_college_rows(
    rows: Sequence[Dict[str, Any]], source: str
) -> List[ValidationIssue]:
    issues: List[ValidationIssue] = []
    duplicate_keys: Dict[Tuple[str, ...], List[int]] = defaultdict(list)

    for row_number, row in enumerate(rows, start=1):
        college_field, _ = get_first_present_value(row, COLLEGE_FIELDS)
        branch_field, _ = get_first_present_value(row, BRANCH_FIELDS)
        category_field, _ = get_first_present_value(row, CATEGORY_FIELDS)

        if college_field is None:
            add_missing_required_issue(
                issues, "college_cutoffs", source, row_number, "college"
            )
        if branch_field is None:
            add_missing_required_issue(
                issues, "college_cutoffs", source, row_number, "branch"
            )
        if category_field is None:
            add_missing_required_issue(
                issues, "college_cutoffs", source, row_number, "category"
            )

        parsed_ranks: Dict[str, Optional[float]] = {}
        for field in RANK_FIELDS:
            if field in row:
                parsed_ranks[field] = validate_numeric_field(
                    issues, source, row_number, row, field, "rank"
                )

        for field in CUTOFF_FIELDS:
            if field in row:
                validate_numeric_field(issues, source, row_number, row, field, "cutoff")

        opening_rank = parsed_ranks.get("Opening Rank")
        closing_rank = parsed_ranks.get("Closing Rank")
        if opening_rank is not None and closing_rank is not None:
            if opening_rank > closing_rank:
                issues.append(
                    ValidationIssue(
                        dataset="college_cutoffs",
                        source=source,
                        row_number=row_number,
                        issue_type="opening_rank_after_closing_rank",
                        field="Opening Rank, Closing Rank",
                        value=(
                            f"Opening Rank={row.get('Opening Rank')}; "
                            f"Closing Rank={row.get('Closing Rank')}"
                        ),
                        message="Opening rank should not be greater than closing rank.",
                    )
                )

        duplicate_key = build_duplicate_key(row, source)
        if duplicate_key is not None:
            duplicate_keys[duplicate_key].append(row_number)

    for duplicate_key, row_numbers in duplicate_keys.items():
        if len(row_numbers) <= 1:
            continue
        joined_rows = ", ".join(str(row_number) for row_number in row_numbers)
        for row_number in row_numbers:
            issues.append(
                ValidationIssue(
                    dataset="college_cutoffs",
                    source=source,
                    row_number=row_number,
                    issue_type="duplicate_college_cutoff_row",
                    field="college, branch, category",
                    value="; ".join(duplicate_key),
                    message=f"Duplicate cutoff identity appears on rows {joined_rows}.",
                )
            )

    return issues


def iter_college_json_files(data_root: Path) -> Iterable[Path]:
    for path in sorted(data_root.rglob("*.json")):
        if "scholarships" in path.parts:
            continue
        yield path


def write_report(issues: Sequence[ValidationIssue], report_path: Path) -> None:
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", encoding="utf-8", newline="") as report_file:
        writer = csv.DictWriter(report_file, fieldnames=REPORT_COLUMNS)
        writer.writeheader()
        for issue in issues:
            writer.writerow(issue.as_report_row())


def print_summary(
    issues: Sequence[ValidationIssue],
    report_path: Path,
    scholarship_count: int,
    college_file_count: int,
    college_row_count: int,
) -> None:
    print("Data validation summary")
    print(f"- Scholarship rows checked: {scholarship_count}")
    print(f"- College data files checked: {college_file_count}")
    print(f"- College cutoff rows checked: {college_row_count}")
    print(f"- Issues found: {len(issues)}")

    if issues:
        print("\nIssues by type:")
        issue_counts = Counter(issue.issue_type for issue in issues)
        for issue_type, count in issue_counts.most_common():
            print(f"- {issue_type}: {count}")

        print("\nTop affected sources:")
        for source, count in Counter(issue.source for issue in issues).most_common(10):
            print(f"- {source}: {count}")

    print(f"\nDetailed report written to: {report_path}")


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Validate the published scholarship sheet and local college cutoff "
            "JSON files before migrating data to a database."
        )
    )
    parser.add_argument(
        "--scholarship-source",
        default=SCHOLARSHIP_SHEET_CSV_URL,
        help=(
            "Scholarship CSV source. Defaults to the published Google Sheets CSV "
            "used by lambda_sync_sheet_to_s3.py."
        ),
    )
    parser.add_argument(
        "--data-root",
        default="public/data",
        help="Root directory containing college/cutoff JSON files.",
    )
    parser.add_argument(
        "--report",
        default="validate_report.csv",
        help="CSV path for detailed validation issues.",
    )
    parser.add_argument(
        "--fail-on-issues",
        action="store_true",
        help="Exit with status 1 when validation issues are found.",
    )
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    repo_root = Path(__file__).resolve().parents[1]
    data_root = Path(args.data_root)
    if not data_root.is_absolute():
        data_root = repo_root / data_root
    report_path = Path(args.report)

    if not data_root.exists():
        print(f"Data root does not exist: {data_root}", file=sys.stderr)
        return 2

    issues: List[ValidationIssue] = []
    college_file_count = 0
    college_row_count = 0

    try:
        scholarship_rows = load_scholarship_rows(args.scholarship_source)
        issues.extend(validate_scholarships(scholarship_rows, args.scholarship_source))

        for json_path in iter_college_json_files(data_root):
            source = source_label(json_path, repo_root)
            college_file_count += 1
            rows = load_json_rows(json_path)
            college_row_count += len(rows)
            issues.extend(validate_college_rows(rows, source))

        write_report(issues, report_path)
        print_summary(
            issues,
            report_path,
            scholarship_count=len(scholarship_rows),
            college_file_count=college_file_count,
            college_row_count=college_row_count,
        )
    except (OSError, json.JSONDecodeError, csv.Error, ValueError) as error:
        print(f"Data validation failed: {error}", file=sys.stderr)
        return 2

    if issues and args.fail_on_issues:
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
