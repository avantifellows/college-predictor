# Scholarship Finder — data pipeline

How the Scholarship Finder gets its data, and the rules applied on the way.

## The flow

```
"Scholarship Finder Data" sheet, "Data" tab   (scholarship team edits this daily)
                 |
                 |  published-CSV URL (File > Share > Publish to web)
                 v
   lambda: update-scholarship-data  (ap-south-1)
   EventBridge rule futures-run-midnight, cron(0 0 * * ? *) = 05:30 IST daily
                 |
                 v
   s3://avantifellows-assets/futures/scholarship_data.json   (public read)
                 |
                 v
   /api/scholarship-data   (5-min in-process cache, falls back to the repo copy)
                 |
                 v
   components/ScholarshipReferenceBrowser.js -> ScholarshipTable.js
```

The sheet is the source of truth. Team edits appear on the site within a day
(next lambda run + the API's 5-minute cache).

## Files

| File | Role |
| --- | --- |
| `scripts/scholarship_transform.py` | **The transform. Single source of truth.** |
| `lambda/update_scholarship_data/lambda_function.py` | Daily sync handler |
| `lambda/update_scholarship_data/deploy.sh` | Deploy (vendors the transform into the zip) |
| `scripts/build_scholarship_data.py` | Manual rebuild from a local CSV dump |
| `scripts/test_scholarship_transform.py` | Tests for the rules below |
| `public/data/scholarships/scholarship_data.json` | Committed fallback if S3 is down |

The lambda and the local script import the same transform module, so they
cannot drift. Change a rule in one place only.

## The rules

### Dates: `DD-Mon-YYYY` → `M/D/YYYY`

The sheet writes `30-Nov-2025`. The UI parses deadlines with
`String(value).split("/")`, so an unconverted date parses to `null` and
silently breaks both the Open/Closed filter and the status pill. Every date is
converted.

### The "+1" rule (tentative dates)

Most rows sit at `Status = Closed` carrying **last cycle's** deadline: the team
marks a scholarship Closed when its window ends and updates the date when the
next cycle opens. A past deadline therefore means *"this annual scholarship is
between cycles"*, not *"gone forever"*.

So any row whose deadline has passed gets its date rolled forward to the next
future occurrence, `Status = "Expected"`, and `Is Tentative Date = true`.
As of Aug 2026 that is 176 of 204 rows — without this the site is a wall of
"Closed" and close to useless between cycles.

Tentative rows:

- render as `Expected ~Nov 2026` with a `Tentative` sublabel (month-level only —
  a projected day-of-month implies precision we do not have)
- keep the sheet's original date in `Sheet Last Date` (shown on hover)
- are **excluded** from the "Open now" filter and counter, so a projection is
  never presented as a confirmed deadline

### Permanently closed → dropped

`Remark` containing both "permanent" and "clos" (case-insensitive) means the
team has retired the scholarship; the row is dropped from the output.

This is the counterpart to the "+1" rule: `+1` assumes a stale row is between
cycles, and this is how the team says otherwise. Matched loosely because the
exact wording is not yet settled. Any *other* non-empty `Remark` is logged as
unrecognised, so a new value meant to hide rows is never silently ignored.

### NIRF criteria

Read from the sheet's own `NIRF criteria` column (added by the team Aug 2026)
into three fields: `NIRF criteria` (label), `NIRF Rank Cap` (number), and
`NIRF Requires Unranked` (bool).

Vocabulary: `Top 50`, `Top 100`, `Top 300`, `Not ranked`.

> **`Not ranked` is inverted** — it means the scholarship requires a college
> *absent* from the NIRF list (L'Oréal BOOST). It yields `rank_cap = None` so a
> top-N filter can never match it. Two rows also say NIRF is only a
> *preference* (Disha); those are deliberately left blank in the column rather
> than treated as requirements.

**Shown as a badge, deliberately not a filter.** Only 9 of ~204 scholarships
state a NIRF requirement, so it is a property of those scholarships rather than
a dimension of the student — nobody thinks of themselves as "NIRF top 50", they
think "I got into NIT Warangal". A dropdown was tried and removed: as an
eligibility filter it matched 203 of 204 rows (every unrestricted scholarship
qualifies a top-50 student), and as a requirement filter it returned 2. Both
read as broken.

So the row shows a plain-language note instead — *"Only for colleges ranked top
50 in NIRF"*, or *"Only for colleges outside the NIRF rankings"* for the
inverted case — and no note at all on the other 195 rows.

A real "which college are you in?" lookup would be the genuinely useful version,
but the repo's only NIRF data (`JoSAA 2025 - cutoffs - nirf.csv`) covers just 51
JoSAA engineering institutes topping out at rank 99 — nothing in 100–300, no
medical/law/commerce. It would mislabel most applicants as unranked, which
matters because "unranked" is an inverted requirement. Needs a real NIRF
dataset per discipline before attempting.

### Family income → number in lakhs

`matchesFamilyIncome` does `Number(...)` and compares against the lakh
dropdown. `"Up to 6 lakhs per annum"` → `6.0`. Unbounded `"More than 8 lakhs"`
floors at `10.0` so it satisfies the "Above 10 Lakh" bucket.

## Operations

```sh
# deploy the lambda after changing the transform
./lambda/update_scholarship_data/deploy.sh

# run it now instead of waiting for midnight UTC
aws lambda invoke --function-name update-scholarship-data --region ap-south-1 /dev/stdout

# rebuild the committed fallback from a fresh CSV dump
python scripts/build_scholarship_data.py --today 2026-08-05

# tests
python scripts/test_scholarship_transform.py
```

The lambda **refuses to publish** fewer than `MIN_EXPECTED_ROWS` (100)
scholarships and leaves the previous S3 object in place. A broken published-CSV
URL returns an HTML error page or an empty sheet, and overwriting good data
with 0 rows would take the finder down until someone noticed. It also raises
explicitly if the URL starts returning HTML, which is what happens when the
sheet's "Publish to web" setting is revoked.

## Reading the sheet directly

The published CSV needs no credentials. For the live sheet via the API (e.g. to
dump a fresh `scholarship_data_og.csv`), use the service account
`google-sheets-api@avantifellows.iam.gserviceaccount.com` — the same one
`etl-data-flow` uses; its key is at
`etl-data-flow/flows/sessionCreator/google_secret.json`.

Sheet ID: `1YFAcxqHJ7LpBxvUj6hrQHDgpWJNQ8BQeRKY1Z9Fylgk`

Other tabs (`Ram Working`, `Pivot Table 1`, `Dropdowns`) are the team's
workspace; only `Data` is consumed. `Dropdowns` holds the allowed filter
values and is worth checking when a new value appears — note it lists Status as
`Open`/`Closed`/`Both` while the `Data` tab also uses `Yet To Open`, so the
transform handles all four.
