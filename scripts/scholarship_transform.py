"""Shared scholarship sheet -> UI JSON transform.

This is the single source of truth for the transform, used by BOTH:

  * scripts/build_scholarship_data.py -- local/manual rebuild from a CSV dump
  * lambda/update_scholarship_data/lambda_function.py -- the daily S3 sync

Keeping one module means the daily sync and the local rebuild cannot drift.
The lambda deploy zip vendors this file next to its handler.

Sheet: "Scholarship Finder Data" -> "Data" tab (the live tab the scholarship
team edits). 26 columns as of Aug 2026.

Rules encoded here (all grounded in the live sheet, see docs/SCHOLARSHIP_SYNC.md):

  * Dates ship as "DD-Mon-YYYY" but the UI parses M/D/YYYY via
    String(v).split("/"), so every date is converted or the Open/Closed filter
    and status pill silently break.
  * A past deadline on a row the team has NOT retired is treated as a stale
    leftover from last cycle and rolled forward to the next occurrence -- the
    "+1" rule. Such rows are marked tentative so the UI never presents a
    projection as a confirmed deadline.
  * "Permanently closed" in Remark means the team has retired the scholarship;
    those rows are dropped from the output entirely.
  * "Family Income (in INR)" must be a bare number in lakhs -- the UI does
    Number(...) on it and compares against its lakh dropdown.
  * "Grade" is a derived array built from the seven Yes/No eligibility columns;
    the grade filter reads only this field.
"""

import re

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

MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

# Values that mean "no data" rather than a real answer.
BLANK_VALUES = {"", "na", "n/a", "none", "not mentioned", "not specified", "-"}

# Statuses meaning "not open yet" -- the team uses "Yet To Open" in the Data
# tab even though the Dropdowns tab only lists Open/Closed/Both.
NOT_YET_OPEN = {"yet to open", "yet to be opened", "not yet open", "upcoming"}

# The Dropdowns tab allows "Both" (multiple windows, one open one closed).
# Unused today but legal, so treat it as open rather than dropping the row.
OPEN_STATUSES = {"open", "both"}

# NIRF criteria vocabulary from the sheet's own column (added by the team
# Aug 2026). "Not ranked" is INVERTED -- it means the scholarship requires a
# college absent from the NIRF list, so it must never be treated as a rank cap.
NIRF_RANK_CAPS = {
    "top 50": 50,
    "top 100": 100,
    "top 300": 300,
}
NIRF_NOT_RANKED = "not ranked"


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


def is_permanently_closed(remark):
    """True when the team has retired this scholarship for good.

    Matched loosely on purpose: the column is free text and the exact spelling
    is not yet settled, so "Permanently Closed", "permanently closed" and
    "Closed permanently" all count.
    """
    text = (clean(remark) or "").lower()
    return "permanent" in text and "clos" in text


def days_in_month(year, month):
    if month == 2:
        leap = year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)
        return 29 if leap else 28
    return DAYS_IN_MONTH[month - 1]


def parse_sheet_date(value):
    """Parse the sheet's date spellings into (year, month, day), or None.

    Handles "30-Nov-2025" (the sheet's uniform format), "1-June-2026",
    "Sep-2026" (month+year only -> last day of month) and an already-converted
    "M/D/YYYY". Returns None for "Always Open" and friends so the caller falls
    back to the Status column.
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
            return (int(year), month, int(day))

    if len(parts) == 2:
        month_token, year = parts
        month = month_number(month_token)
        if month and year.isdigit():
            # Month/year only -> assume the deadline runs to end of month.
            return (int(year), month, days_in_month(int(year), month))

    slash = text.split("/")
    if len(slash) == 3 and all(part.strip().isdigit() for part in slash):
        month, day, year = (int(part) for part in slash)
        return (year, month, day)

    return None


def format_ui_date(ymd):
    """(2026, 11, 30) -> '11/30/2026' -- the only format the UI can parse."""
    year, month, day = ymd
    return "{}/{}/{}".format(month, day, year)


def roll_forward(ymd, today):
    """Advance a stale date to its next future occurrence (the "+1" rule).

    The team leaves last cycle's deadline in the sheet, so a past date on a
    live row is a leftover rather than a real closure. Bumping the year gives
    students a usable estimate of when the next cycle closes.

    Feb 29 in a non-leap target year clamps to Feb 28.
    """
    year, month, day = ymd
    while (year, month, day) < today:
        year += 1
    day = min(day, days_in_month(year, month))
    return (year, month, day)


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
        # The dropdown's "Above 10 Lakh" bucket tests limit >= 10; an unbounded
        # "more than 8 lakhs" qualifies for every bucket.
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
        return "https://{}".format(text)
    return text


def build_grades(row):
    return [token for column, token in GRADE_COLUMNS if is_yes(row.get(column))]


def parse_nirf(value):
    """Read the sheet's "NIRF criteria" column into a filterable shape.

    Returns (label, rank_cap, requires_unranked):
      "Top 50"     -> ("Top 50", 50, False)
      "Not ranked" -> ("Not ranked", None, True)
      blank        -> (None, None, False)

    rank_cap stays None for "Not ranked" so a rank-based filter can never
    mistake an inverted requirement for a top-N one.
    """
    text = clean(value)
    if not text:
        return (None, None, False)
    lowered = text.lower()
    if lowered == NIRF_NOT_RANKED:
        return (text, None, True)
    cap = NIRF_RANK_CAPS.get(lowered)
    if cap:
        return (text, cap, False)
    match = re.search(r"top\s*-?\s*(\d+)", lowered)
    if match:
        return (text, int(match.group(1)), False)
    # Unrecognised vocabulary: keep the label for display, no filtering claim.
    return (text, None, False)


def resolve_status(row, today):
    """Work out the status, deadline and tentativeness for one row.

    Returns a dict of the UI-facing status fields. The date is rolled forward
    only when the row is still live and its deadline has passed -- a row the
    team explicitly marked Closed keeps its real (past) date.
    """
    raw_status = clean(row.get("Status")) or ""
    lowered = raw_status.lower()
    parsed = parse_sheet_date(row.get("Last Date"))

    yet_to_open = lowered in NOT_YET_OPEN

    # The "+1" rule. Almost every row in the sheet sits at Closed with last
    # cycle's deadline -- the team marks a scholarship Closed when its window
    # ends and updates the date when the next cycle opens. So a past deadline
    # means "this annual scholarship is between cycles", NOT "gone forever";
    # genuinely dead scholarships are retired via Remark = permanently closed
    # (handled in convert(), which drops the row before we get here).
    #
    # Rolling the date forward therefore turns a wall of stale Closed rows into
    # usable estimates of when each scholarship next closes. Every rolled date
    # is flagged tentative so the UI never shows a projection as confirmed.
    stale = bool(parsed) and parsed < today
    tentative = stale

    effective = roll_forward(parsed, today) if tentative else parsed

    if yet_to_open:
        status = "Yet To Open"
    elif tentative:
        # Between cycles: not open yet, but expected to reopen.
        status = "Expected"
    elif lowered == "closed":
        status = "Closed"
    elif lowered in OPEN_STATUSES:
        status = "Open"
    else:
        status = raw_status or "Unknown"

    return {
        "Status": status,
        "Last Date": format_ui_date(effective) if effective else None,
        "Is Tentative Date": tentative,
        # Kept for display/debugging: what the sheet actually said.
        "Sheet Last Date": clean(row.get("Last Date")),
    }


def convert(row, today):
    """Transform one sheet row into a UI record, or None to drop it."""
    name = clean(row.get("Scholarship Name"))
    if not name:
        return None
    if is_permanently_closed(row.get("Remark")):
        return None

    nirf_label, nirf_cap, nirf_unranked = parse_nirf(row.get("NIRF criteria"))

    record = {
        "Scholarship Name": name,
        "No. of awards": clean(row.get("No. of awards")),
        "Scholarship Amount": clean(row.get("Scholarship Amount")),
        "Scholarship Frequency": clean(row.get("Scholarship Frequency")),
    }
    record.update(resolve_status(row, today))

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
            "Stream": normalize_list_field(row.get("Stream"), "Any"),
            "Eligibility": clean_multiline(row.get("Eligibility")),
            "Benefits": clean_multiline(row.get("Benefits")),
            "Doc Required": clean_multiline(row.get("Doc Required")),
            "Application Link": normalize_link(row.get("Application Link")),
            "NIRF criteria": nirf_label,
            "NIRF Rank Cap": nirf_cap,
            "NIRF Requires Unranked": nirf_unranked,
            "Grade": build_grades(row),
        }
    )
    return record


def transform_rows(rows, today):
    """Transform every sheet row, returning (records, stats).

    `today` is a (year, month, day) tuple -- passed in rather than read from the
    clock so callers stay deterministic and testable.
    """
    records, dropped, tentative = [], [], 0
    unparsed_dates, unknown_remarks = [], set()

    for row in rows:
        name = clean(row.get("Scholarship Name"))
        if not name:
            continue

        remark = clean(row.get("Remark"))
        if is_permanently_closed(row.get("Remark")):
            dropped.append(name)
            continue
        if remark:
            unknown_remarks.add(remark)

        raw_date = clean(row.get("Last Date"))
        if raw_date and not parse_sheet_date(raw_date):
            unparsed_dates.append((name, raw_date))

        record = convert(row, today)
        if record:
            records.append(record)
            if record["Is Tentative Date"]:
                tentative += 1

    stats = {
        "total_rows": len(rows),
        "written": len(records),
        "dropped_permanently_closed": dropped,
        "tentative_dates": tentative,
        "unparsed_dates": unparsed_dates,
        "other_remarks": sorted(unknown_remarks),
    }
    return records, stats
