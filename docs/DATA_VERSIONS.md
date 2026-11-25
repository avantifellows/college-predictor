# Data versions

The CSVs in `data-sources/` (and the audit logs in `docs/audits/`) are the
master copy of Futures' exam, career and branch data. The Google sheets they
started from are copies: edits made here must be copied back to the sheet
before anything is imported from it again, or the import undoes them.

`data-sources/VERSIONS.json` records each file's version, row count and
checksum, and for files that have a sheet, the last version the sheet has.
`docs/audits/data_changelog.csv` has one row per version: rows added and
changed, rows and columns removed (by key), and why.

## Changing a CSV

1. Edit it with Python's `csv` module (`lineterminator="\n"`), not pandas, so
   rows you didn't touch stay byte-for-byte the same. Never edit
   `row_id` in `exams_cleaned.csv`: it is how a row is tracked across
   versions. New rows take the next free id (`x0444`, ...).
2. Record the version, with what changed and its source:

   ```bash
   python3 scripts/data_versions.py bump data-sources/exams_cleaned.csv -m "Add SSC CGL (ssc.gov.in notice 2026)"
   ```

3. `python3 scripts/data_versions.py status` shows what differs from main
   and which sheets are behind.

CI runs `npm run check:data-versions -- --base FETCH_HEAD` (main). It fails
when a file changed without a bump, a row key is empty or repeated, or a row
or column that main has is gone and the changelog doesn't name it.

## The Google sheets

After copying a version into its sheet:

```bash
python3 scripts/data_versions.py synced data-sources/career_streams.csv
```

`scripts/import_career_sheet.py` refuses to import while the sheet is behind
the CSV, and lists the changes the sheet is missing (`--force` overrides).
