"""Tests for the scholarship sheet transform.

Run: python scripts/test_scholarship_transform.py

Covers the rules that are easy to break silently -- the "+1" date roll, the
permanently-closed drop, and the inverted "Not ranked" NIRF case -- because the
source sheet is live and edited daily by the scholarship team.
"""

import sys

from scholarship_transform import (
    convert,
    is_permanently_closed,
    parse_family_income,
    parse_nirf,
    parse_sheet_date,
    roll_forward,
    transform_rows,
)

TODAY = (2026, 8, 5)

failures = []


def check(label, actual, expected):
    if actual != expected:
        failures.append("{}\n     expected: {!r}\n     actual:   {!r}".format(
            label, expected, actual
        ))


def row(**overrides):
    base = {
        "Scholarship Name": "Test Scholarship",
        "Status": "Closed",
        "Last Date": "30-Nov-2025",
        "Remark": "",
        "NIRF criteria": "",
        "Family Income (in INR)": "Up to 6 lakhs per annum",
        "Class 12 can Apply": "Yes",
    }
    base.update(overrides)
    return base


# --- date parsing ---------------------------------------------------------
check("parse DD-Mon-YYYY", parse_sheet_date("30-Nov-2025"), (2025, 11, 30))
check("parse full month name", parse_sheet_date("1-June-2026"), (2026, 6, 1))
check("parse month+year -> end of month", parse_sheet_date("Sep-2026"), (2026, 9, 30))
check("parse already-M/D/YYYY", parse_sheet_date("11/30/2025"), (2025, 11, 30))
check("parse 'Always Open' -> None", parse_sheet_date("Always Open"), None)
check("parse blank -> None", parse_sheet_date(""), None)
check("parse junk -> None", parse_sheet_date("sometime next year"), None)

# --- the +1 roll ----------------------------------------------------------
check("roll one year", roll_forward((2025, 11, 30), TODAY), (2026, 11, 30))
check("roll multiple years", roll_forward((2023, 3, 15), TODAY), (2027, 3, 15))
# A date later this same year is already in the future -- must not move.
check("future date untouched", roll_forward((2026, 12, 1), TODAY), (2026, 12, 1))
# Feb 29 rolled into a non-leap year must clamp rather than produce Feb 30.
check("leap day clamps", roll_forward((2024, 2, 29), TODAY), (2027, 2, 28))

# --- income --------------------------------------------------------------
check("income in lakhs", parse_family_income("Up to 6 lakhs per annum"), 6.0)
check("income 'Any' -> None", parse_family_income("Any"), None)
# "more than 8" is unbounded, so it must satisfy the UI's "Above 10 Lakh" bucket.
check("unbounded income floors at 10", parse_family_income("More than 8 lakhs per annum"), 10.0)

# --- NIRF ----------------------------------------------------------------
check("NIRF top 50", parse_nirf("Top 50"), ("Top 50", 50, False))
check("NIRF top 300", parse_nirf("Top 300"), ("Top 300", 300, False))
# The inverted case: must NOT yield a rank cap, or a top-N filter would match it.
check("NIRF not ranked", parse_nirf("Not ranked"), ("Not ranked", None, True))
check("NIRF blank", parse_nirf(""), (None, None, False))
check("NIRF unknown vocabulary kept as label", parse_nirf("Top tier")[1], None)

# --- permanently closed --------------------------------------------------
check("perm closed lowercase", is_permanently_closed("permanently closed"), True)
check("perm closed titlecase", is_permanently_closed("Permanently Closed"), True)
check("perm closed reversed wording", is_permanently_closed("Closed permanently"), True)
check("plain closed is NOT permanent", is_permanently_closed("Closed"), False)
check("blank remark", is_permanently_closed(""), False)

# --- row conversion ------------------------------------------------------
stale = convert(row(Status="Closed", **{"Last Date": "05-Dec-2025"}), TODAY)
check("stale Closed -> Expected", stale["Status"], "Expected")
check("stale Closed -> rolled date", stale["Last Date"], "12/5/2026")
check("stale Closed -> tentative", stale["Is Tentative Date"], True)
check("original date preserved", stale["Sheet Last Date"], "05-Dec-2025")

live = convert(row(Status="Open", **{"Last Date": "20-Aug-2026"}), TODAY)
check("future Open stays Open", live["Status"], "Open")
check("future Open keeps real date", live["Last Date"], "8/20/2026")
check("future Open not tentative", live["Is Tentative Date"], False)

no_date = convert(row(Status="Closed", **{"Last Date": ""}), TODAY)
check("Closed with no date stays Closed", no_date["Status"], "Closed")
check("Closed with no date has no deadline", no_date["Last Date"], None)
check("Closed with no date not tentative", no_date["Is Tentative Date"], False)

yto = convert(row(Status="Yet To Open", **{"Last Date": ""}), TODAY)
check("Yet To Open preserved", yto["Status"], "Yet To Open")

check("permanently closed row dropped", convert(row(Remark="Permanently Closed"), TODAY), None)
check("nameless row dropped", convert(row(**{"Scholarship Name": ""}), TODAY), None)

check("grade array derived", convert(row(), TODAY)["Grade"], ["12"])

# --- whole-sheet stats ---------------------------------------------------
records, stats = transform_rows(
    [
        row(**{"Scholarship Name": "A", "Last Date": "30-Nov-2025"}),
        row(**{"Scholarship Name": "B", "Last Date": "20-Aug-2026", "Status": "Open"}),
        row(**{"Scholarship Name": "C", "Remark": "Permanently closed"}),
        row(**{"Scholarship Name": "D", "Remark": "Under review"}),
    ],
    TODAY,
)
check("dropped one row", stats["written"], 3)
check("dropped name recorded", stats["dropped_permanently_closed"], ["C"])
check("tentative counted", stats["tentative_dates"], 2)
# Unrecognised Remark text must be surfaced, not silently treated as a hide rule.
check("other remarks surfaced", stats["other_remarks"], ["Under review"])


if failures:
    print("FAILED ({} of many)\n".format(len(failures)))
    for failure in failures:
        print("  " + failure)
    sys.exit(1)
print("All scholarship transform tests passed.")
