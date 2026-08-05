"""Daily sync: Scholarship Finder sheet -> s3://avantifellows-assets/futures/

Triggered by the EventBridge rule `futures-run-midnight`
(cron(0 0 * * ? *) = 05:30 IST daily).

The transform lives in scholarship_transform.py, shared verbatim with
scripts/build_scholarship_data.py so the daily sync and the local rebuild
cannot drift. Deploy with lambda/update_scholarship_data/deploy.sh, which
vendors that module into the zip.

Reads the sheet's published-CSV URL (no credentials needed, so the lambda
needs no Google service account). The published CSV tracks the live "Data"
tab, so team edits appear in the next run.

Safety: the new payload is only written to S3 when it parses to a plausible
number of rows. A published-CSV URL that breaks tends to return an HTML error
page or an empty sheet, and silently overwriting good data with 0 rows would
take the Scholarship Finder down until someone noticed.
"""

import csv
import datetime
import io
import json
import os
import urllib.request

import boto3

from scholarship_transform import transform_rows

PUBLISHED_CSV_URL = os.environ.get(
    "SCHOLARSHIP_CSV_URL",
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBCqBFvIMpaTcHz4Pl6mJ5"
    "zxazM-0EBVu_adM8KfLsUXcpclW2a4t29Jy0PH63CBSJR5z5hJxU342y/pub?output=csv",
)

BUCKET = os.environ.get("SCHOLARSHIP_BUCKET", "avantifellows-assets")
KEY = os.environ.get("SCHOLARSHIP_KEY", "futures/scholarship_data.json")

# The sheet has held ~200 scholarships for years. A run yielding far fewer is
# far more likely a broken fetch than a real mass deletion, so refuse to
# publish it and leave yesterday's good file in place.
MIN_EXPECTED_ROWS = int(os.environ.get("MIN_EXPECTED_ROWS", "100"))

s3_client = boto3.client("s3")


def fetch_rows(url):
    with urllib.request.urlopen(url, timeout=30) as response:
        payload = response.read().decode("utf-8-sig")

    stripped = payload.lstrip().lower()
    if stripped.startswith("<!doctype") or stripped.startswith("<html"):
        raise RuntimeError(
            "published CSV URL returned HTML, not CSV -- the sheet's "
            "File > Share > Publish to web setting was probably revoked"
        )

    return list(csv.DictReader(io.StringIO(payload)))


def lambda_handler(event, context):
    try:
        rows = fetch_rows(PUBLISHED_CSV_URL)

        now = datetime.datetime.now(datetime.timezone.utc)
        # The audience is Indian students; roll dates against the IST calendar
        # day so a deadline does not read as "past" for the last 5.5 hours.
        today_ist = (now + datetime.timedelta(hours=5, minutes=30)).date()
        today = (today_ist.year, today_ist.month, today_ist.day)

        records, stats = transform_rows(rows, today)

        if len(records) < MIN_EXPECTED_ROWS:
            raise RuntimeError(
                "refusing to publish {} scholarships (expected >= {}); "
                "leaving the existing S3 object untouched".format(
                    len(records), MIN_EXPECTED_ROWS
                )
            )

        s3_client.put_object(
            Bucket=BUCKET,
            Key=KEY,
            Body=json.dumps(records, ensure_ascii=False, indent=2),
            ContentType="application/json",
            CacheControl="public, max-age=300",
        )

        print(
            "Wrote {} scholarships to s3://{}/{}".format(len(records), BUCKET, KEY)
        )
        print(
            "  tentative (+1) dates : {}".format(stats["tentative_dates"])
        )
        print(
            "  dropped (perm closed): {} {}".format(
                len(stats["dropped_permanently_closed"]),
                stats["dropped_permanently_closed"][:5] or "",
            )
        )
        if stats["unparsed_dates"]:
            print(
                "  ! unparsed dates: {}".format(stats["unparsed_dates"][:5])
            )
        if stats["other_remarks"]:
            # Surfaces new Remark vocabulary the team starts using, so a value
            # meant to hide rows is not silently ignored.
            print(
                "  ! unrecognised Remark values: {}".format(
                    stats["other_remarks"][:10]
                )
            )

        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "success": True,
                    "count": len(records),
                    "tentative": stats["tentative_dates"],
                    "dropped": len(stats["dropped_permanently_closed"]),
                }
            ),
        }
    except Exception as error:
        print("Failed to update scholarship data: {}".format(error))
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(error)}),
        }
