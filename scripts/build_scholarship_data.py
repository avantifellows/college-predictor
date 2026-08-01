"""Convert scholarship_data.csv into the JSON the Scholarship Finder reads.

Source : scholarship_data.csv (repo root)
Target : public/data/scholarships/scholarship_data.json

The UI (components/ScholarshipReferenceBrowser.js + ScholarshipTable.js) has a few
hard requirements the raw CSV does not satisfy, so this script normalises them:

  * "Last Date" must be M/D/YYYY -- both components parse deadlines with
    String(value).split("/"). The CSV ships "1-Nov-2026", which would parse to
    null and silently break the Open/Closed filter and the status pill.
  * "Grade" is a derived array (10/11/12/12_pass/UG/PG/Diploma) built from the
    seven Yes/No eligibility columns. The grade filter reads only this field.
  * "Family Income (in INR)" must be a number in lakhs -- matchesFamilyIncome
    does Number(...) on it and compares against the lakh dropdown values.
"""

import csv
import json
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE_DIR, "scholarship_data.csv")
JSON_PATH = os.path.join(
    BASE_DIR, "public", "data", "scholarships", "scholarship_data.json"
)

MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

# Yes/No column -> grade token used by the UI's grade dropdown.
GRADE_COLUMNS = [
    ("Class 10 or below can apply", "10"),
    ("Class 11 can Apply", "11"),
    ("Class 12 can Apply", "12"),
    ("12th Passed Can Apply", "12_pass"),
    ("2nd/3rd Yr Eligible", "UG"),
    ("Diploma/ITI", "Diploma"),
    ("Eligible for PG", "PG"),
]

# Values that mean "no data" rather than a real answer.
BLANK_VALUES = {"", "na", "n/a", "none", "not mentioned", "not specified", "-"}


def clean(value):
    """Trim, collapse inner whitespace, and map placeholder text to None."""
    if value is None:
        return None
    text = re.sub(r"\s+", " ", str(value).replace("​", "")).strip()
    if text.lower() in BLANK_VALUES:
        return None
    return text or None


def clean_multiline(value):
    """Like clean() but preserves newlines -- the UI bullets these fields."""
    if value is None:
        return None
    text = str(value).replace("​", "").replace("\r\n", "\n").strip()
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    text = "\n".join(line for line in lines if line)
    if text.lower() in BLANK_VALUES:
        return None
    return text or None


def is_yes(value):
    return str(value or "").strip().lower() == "yes"


def parse_last_date(value):
    """Normalise the CSV's date spellings to the M/D/YYYY the UI parses.

    Handles "1-Nov-2026", "1-June-2026", "Sep- 2026" (month+year only, treated
    as the last day of that month), and returns None for "Always Open" /
    "Not Mentioned" so the UI falls back to the Status column.
    """
    text = clean(value)
    if not text:
        return None
    if text.lower() in {"always open", "open", "rolling", "ongoing"}:
        return None

    normalized = text.replace("–", "-").replace("—", "-")
    parts = [part.strip() for part in normalized.split("-") if part.strip()]

    def month_number(token):
        return MONTHS.get(token[:3].lower())

    if len(parts) == 3:
        day, month_token, year = parts
        month = month_number(month_token)
        if month and day.isdigit() and year.isdigit():
            return f"{month}/{int(day)}/{int(year)}"

    if len(parts) == 2:
        month_token, year = parts
        month = month_number(month_token)
        if month and year.isdigit():
            # Month/year only -> assume the deadline runs to end of month.
            last_day = [31, 29 if int(year) % 4 == 0 else 28, 31, 30, 31, 30,
                        31, 31, 30, 31, 30, 31][month - 1]
            return f"{month}/{last_day}/{int(year)}"

    # Already M/D/YYYY?
    slash = text.split("/")
    if len(slash) == 3 and all(p.strip().isdigit() for p in slash):
        m, d, y = (int(p) for p in slash)
        return f"{m}/{d}/{y}"

    print(f"  ! unparsed date kept as-is: {text!r}")
    return text


def parse_family_income(value):
    """'Up to 6 lakhs per annum' -> 6.0 (the UI compares numbers in lakhs)."""
    text = clean(value)
    if not text or text.lower() == "any":
        return None
    match = re.search(r"(\d+(?:\.\d+)?)", text)
    if not match:
        return None
    amount = float(match.group(1))
    if "more than" in text.lower():
        # Dropdown's "Above 10 Lakh" bucket tests limit >= 10; an
        # unbounded "more than 8 lakhs" qualifies for every bucket.
        return max(amount, 10.0)
    return amount


def normalize_yes_no(value):
    """Fix the stray lowercase 'yes'/'no' in the sheet."""
    text = clean(value)
    if text is None:
        return None
    lowered = text.lower()
    if lowered == "yes":
        return "Yes"
    if lowered == "no":
        return "No"
    return text


def normalize_list_field(value, default=None):
    """Dedupe comma-separated filter values while preserving order."""
    text = clean(value)
    if not text:
        return default
    seen, items = set(), []
    for item in text.split(","):
        item = item.strip()
        if item and item.lower() not in seen:
            seen.add(item.lower())
            items.append(item)
    return ", ".join(items) if items else default


def normalize_link(value):
    text = clean(value)
    if not text:
        return None
    if not re.match(r"^https?://", text, re.I):
        return f"https://{text}"
    return text


def build_grades(row):
    return [token for column, token in GRADE_COLUMNS if is_yes(row.get(column))]


def convert(row):
    record = {
        "Scholarship Name": clean(row.get("Scholarship Name")),
        "No. of awards": clean(row.get("No. of awards")),
        "Scholarship Amount": clean(row.get("Scholarship Amount")),
        "Scholarship Frequency": clean(row.get("Scholarship Frequency")),
        "Status": clean(row.get("Status")) or "Unknown",
    }

    for column, _ in GRADE_COLUMNS:
        record[column] = normalize_yes_no(row.get(column)) or "No"

    record.update(
        {
            "Gender": normalize_list_field(row.get("Gender"), "Any"),
            "Category": normalize_list_field(row.get("Category"), "Any"),
            "Family Income (in INR)": parse_family_income(
                row.get("Family Income (in INR)")
            ),
            "State": normalize_list_field(row.get("State"), "All India"),
            "City": normalize_list_field(row.get("City"), "Any"),
            "Last Date": parse_last_date(row.get("Last Date")),
            "Stream": normalize_list_field(row.get("Stream"), "Any"),
            "Eligibility": clean_multiline(row.get("Eligibility")),
            "Benefits": clean_multiline(row.get("Benefits")),
            "Doc Required": clean_multiline(row.get("Doc Required")),
            "Application Link": normalize_link(row.get("Application Link")),
            "Remarks": clean(row.get("Remarks")),
            "Grade": build_grades(row),
        }
    )
    return record


def main():
    with open(CSV_PATH, newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))

    records = [convert(row) for row in rows if clean(row.get("Scholarship Name"))]

    os.makedirs(os.path.dirname(JSON_PATH), exist_ok=True)
    with open(JSON_PATH, "w", encoding="utf-8") as handle:
        json.dump(records, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(f"Wrote {len(records)} scholarships -> {JSON_PATH}")
    no_grade = [r["Scholarship Name"] for r in records if not r["Grade"]]
    if no_grade:
        print(f"  ! {len(no_grade)} with no grade flags: {no_grade[:5]}")


if __name__ == "__main__":
    main()
