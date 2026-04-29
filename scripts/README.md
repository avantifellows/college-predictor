# Scripts

## Data validation

Run the data validator before migrating scholarship and college cutoff data:

```bash
python3 scripts/validate_data.py
```

The script checks the published scholarship Google Sheet used by
`lambda_sync_sheet_to_s3.py` and the college/cutoff JSON files under
`public/data`. It prints a summary and writes row-level findings to
`validate_report.csv`.

Useful options:

```bash
python3 scripts/validate_data.py --report /tmp/validate_report.csv
python3 scripts/validate_data.py --fail-on-issues
python3 scripts/validate_data.py --scholarship-source /tmp/scholarship_export.csv
```

`--fail-on-issues` is intended for CI or migration gates. Without that flag, the
script exits successfully after writing the report so the findings can be
reviewed manually.
