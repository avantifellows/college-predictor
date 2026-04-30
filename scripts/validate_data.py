import pandas as pd
import json
import os
import csv
import sys
import urllib.request

SCHOLARSHIP_URL = (
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBCqBFvIMpaTcHz4Pl6mJ5zxazM-0EBVu_adM8KfLsUXcpclW2a4t29Jy0PH63CBSJR5z5hJxU342y/pub?output=csv"
)

PUBLIC_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "public")

SCHOLARSHIP_REQUIRED_FIELDS = [
    "Scholarship Name",
    "Family Income (in INR)",
]
CUTOFF_REQUIRED_FIELDS = [
    "college_name",  
    "closing_rank",
    "opening_rank",
]

all_issues=[]

def log_issue(file_name, row_number, field, issue_type, value=""):
    all_issues.append({
        "file": file_name,
        "row": row_number,
        "field": field,
        "issue": issue_type,
        "value": str(value)
    })
# CHECK 1 — SCHOLARSHIP DATA

def validate_scholarship_data():
    print("\n Validating scholarship data...")

    try:
        request = urllib.request.Request(
            SCHOLARSHIP_URL,
        headers={"User-Agent": "Mozilla/5.0"}
        )

        response = urllib.request.urlopen(request)
        csv_data = response.read().decode("utf-8")

        from io import StringIO
        df = pd.read_csv(StringIO(csv_data))

        # Strip whitespace from column names (common issue in Sheets)
        df.columns = df.columns.str.strip()

        total_rows = len(df)
        print(f"   Loaded {total_rows} scholarship rows")

        # ── Check 1a: Missing required fields ──
        for field in SCHOLARSHIP_REQUIRED_FIELDS:
            if field not in df.columns:
                print(f" Column '{field}' not found in sheet — skipping check")
                continue
            # Find rows where this field is empty/null
            missing_mask = df[field].isnull() | (df[field].astype(str).str.strip() == "")
            missing_rows = df[missing_mask]
            for idx in missing_rows.index:
                # idx+2 because: +1 for 0-based index, +1 for header row
                log_issue("scholarship_data", idx + 2, field, "MISSING_VALUE", "")

        # ── Check 1b: Duplicate rows ──
        # A duplicate = same Scholarship Name + Stream + State + Eligibility combination appearing more than once
        # (same scholarship can appear for different categories/streams/states/eligibility)
        if "Scholarship Name" in df.columns:
            duplicate_keys = ["Scholarship Name"]
            for field in ["Stream", "State", "Eligibility"]:
                if field in df.columns:
                    duplicate_keys.append(field)
            
            dupes = df[df.duplicated(subset=duplicate_keys, keep=False)]
            for idx in dupes.index:
                dup_combo = {k: df.loc[idx, k] for k in duplicate_keys}
                log_issue(
                    "scholarship_data", idx + 2,
                    str(duplicate_keys), "DUPLICATE_ROW",
                    str(dup_combo)
                )
        # ── Check 1c: Invalid family income format ──
        # Income should be descriptive text (e.g., "Up to 4 lakhs per annum", "Any")
        # Flag only if it's empty or contains invalid values
        if "Family Income (in INR)" in df.columns:
            invalid_values = ["N/A", "NA", "null", "None", "-"]
            for idx, val in df["Family Income (in INR)"].items():
                str_val = str(val).strip().lower()
                # Check if value is empty or is one of the explicitly invalid values
                if not str_val or str_val in invalid_values:
                    log_issue(
                        "scholarship_data", idx + 2,
                        "Family Income (in INR)", "INVALID_INCOME_VALUE",
                        df.loc[idx, "Family Income (in INR)"]
                    )

        scholarship_issues = [i for i in all_issues if i["file"] == "scholarship_data"]
        print(f" Found {len(scholarship_issues)} issues in scholarship data")

    except Exception as e:
        print(f"Could not load scholarship data: {e}")        

def validate_cutoff_files():
    print("\n Validating college/cutoff JSON files...")

    # Find all .json files in the public folder
    if not os.path.exists(PUBLIC_DATA_DIR):
        print(f"Public data directory not found at: {PUBLIC_DATA_DIR}")
        print(f"Skipping cutoff validation.")
        return

    json_files = [f for f in os.listdir(PUBLIC_DATA_DIR) if f.endswith(".json")]

    if not json_files:
        print(" No JSON files found in public/ folder")
        return

    print(f"Found {len(json_files)} JSON files: {json_files}")

    for filename in json_files:
        filepath = os.path.join(PUBLIC_DATA_DIR, filename)
        print(f"\n Checking {filename}...")
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)

            # Handle both list of dicts and nested structures
            if isinstance(data, dict):
                # Some files might be {exam: [rows]} format
                rows = []
                for key, val in data.items():
                    if isinstance(val, list):
                        rows.extend(val)
            elif isinstance(data, list):
                rows = data
            else:
                print(f"Unexpected data format in {filename}")
                continue

            print(f"Loaded {len(rows)} rows")

            for row_num, row in enumerate(rows, start=2):

                # ── Check 2a: Missing required fields ──
                for field in CUTOFF_REQUIRED_FIELDS:
                    if field not in row:
                        continue  # field doesn't exist in this file — skip
                    val = row[field]
                    if val is None or str(val).strip() == "":
                        log_issue(filename, row_num, field, "MISSING_VALUE", "")

                # ── Check 2b: Invalid closing rank ──
                closing = row.get("closing_rank")
                if closing is not None:
                    try:
                        closing_num = float(closing)
                        if closing_num <= 0:
                            log_issue(
                                filename, row_num,
                                "closing_rank", "INVALID_RANK_ZERO_OR_NEGATIVE",
                                closing
                            )
                    except (ValueError, TypeError):
                        log_issue(
                            filename, row_num,
                            "closing_rank", "NON_NUMERIC_RANK", closing
                        )
                # ── Check 2c: Opening rank > closing rank (impossible) ──
                # In JEE/NEET: lower rank number = better rank
                # So opening_rank should ALWAYS be < closing_rank
                opening = row.get("opening_rank")
                if opening is not None and closing is not None:
                    try:
                        if float(opening) > float(closing):
                            log_issue(
                                filename, row_num,
                                "opening_rank",
                                "OPENING_RANK_EXCEEDS_CLOSING_RANK",
                                f"opening={opening}, closing={closing}"
                            )
                    except (ValueError, TypeError):
                        pass  # already caught above

                # ── Check 2d: Duplicate entries ──
                # Will check after loop using pandas for efficiency

            # Duplicate check using pandas
            try:
                df = pd.DataFrame(rows)
                duplicate_keys = [
                    c for c in
                    ["college_name", "branch", "year", "category", "round"]
                    if c in df.columns
                ]
                if duplicate_keys:
                    dupes = df[df.duplicated(subset=duplicate_keys, keep=False)]
                    for idx in dupes.index:
                        log_issue(
                            filename, idx + 2,
                            str(duplicate_keys), "DUPLICATE_ENTRY",
                            str({k: df.loc[idx, k] for k in duplicate_keys})
                        )
            except Exception:
                pass  # If pandas can't process it, skip duplicate check

            file_issues = [i for i in all_issues if i["file"] == filename]
            print(f"   Found {len(file_issues)} issues in {filename}")

        except json.JSONDecodeError as e:
            print(f"Could not parse {filename}: {e}")
        except Exception as e:
            print(f"Error reading {filename}: {e}")

# FINAL REPORT

def print_summary():
    print("\n" + "="*50)
    print("VALIDATION COMPLETE")
    print("="*50)

    if not all_issues:
        print("No issues found! Data looks clean.")
        return

    # Group by issue type for a clean summary
    from collections import Counter
    issue_counts = Counter(i["issue"] for i in all_issues)

    print(f"\n Total issues found: {len(all_issues)}\n")
    for issue_type, count in issue_counts.most_common():
        print(f"  {count:4d}x  {issue_type}")

    # Save detailed report to CSV
    report_path = os.path.join(os.path.dirname(__file__), "validate_report.csv")
    with open(report_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["file", "row", "field", "issue", "value"]
        )
        writer.writeheader()
        writer.writerows(all_issues)

    print(f"\n Detailed report saved to: scripts/validate_report.csv")
    print("   Open this in Excel/Sheets to review every issue with its row number.")


if __name__ == "__main__":
    print("Starting data validation for AF Futures...")
    validate_scholarship_data()
    validate_cutoff_files()
    print_summary()