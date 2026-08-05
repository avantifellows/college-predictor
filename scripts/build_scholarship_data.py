"""Rebuild the Scholarship Finder JSON from a local CSV dump of the sheet.

This is the manual/offline path; the daily production sync is the lambda in
lambda/update_scholarship_data/. Both share the transform in
scholarship_transform.py, so output from either is identical.

Source : scholarship_data_og.csv (repo root) -- a dump of the "Data" tab of
         the "Scholarship Finder Data" sheet.
         "Pre-filled Form Link" is intentionally dropped.
Target : public/data/scholarships/scholarship_data.json
         (the committed fallback the UI uses when S3 is unreachable)

Usage:
    python scripts/build_scholarship_data.py
    python scripts/build_scholarship_data.py --today 2026-08-05   # pin dates
"""

import argparse
import csv
import datetime
import json
import os

from scholarship_transform import transform_rows

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE_DIR, "scholarship_data_og.csv")
JSON_PATH = os.path.join(
    BASE_DIR, "public", "data", "scholarships", "scholarship_data.json"
)


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--today",
        help=(
            "YYYY-MM-DD to evaluate deadlines against (default: today in IST). "
            "Pin this for reproducible output."
        ),
    )
    parser.add_argument("--csv", default=CSV_PATH, help="input CSV path")
    parser.add_argument("--out", default=JSON_PATH, help="output JSON path")
    return parser.parse_args()


def resolve_today(value):
    if value:
        parsed = datetime.datetime.strptime(value, "%Y-%m-%d").date()
    else:
        now = datetime.datetime.now(datetime.timezone.utc)
        parsed = (now + datetime.timedelta(hours=5, minutes=30)).date()
    return (parsed.year, parsed.month, parsed.day)


def main():
    args = parse_args()
    today = resolve_today(args.today)

    with open(args.csv, newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))

    records, stats = transform_rows(rows, today)

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(records, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(
        "Wrote {} scholarships -> {}".format(len(records), args.out)
    )
    print("  evaluated against  : {:04d}-{:02d}-{:02d}".format(*today))
    print("  tentative (+1)     : {}".format(stats["tentative_dates"]))
    dropped = stats["dropped_permanently_closed"]
    print(
        "  dropped (perm clos): {}{}".format(
            len(dropped), " " + str(dropped[:5]) if dropped else ""
        )
    )
    if stats["unparsed_dates"]:
        print("  ! unparsed dates   : {}".format(stats["unparsed_dates"][:5]))
    if stats["other_remarks"]:
        print("  ! other Remarks    : {}".format(stats["other_remarks"][:10]))
    no_grade = [r["Scholarship Name"] for r in records if not r["Grade"]]
    if no_grade:
        print(
            "  ! {} with no grade flags: {}".format(len(no_grade), no_grade[:5])
        )


if __name__ == "__main__":
    main()
