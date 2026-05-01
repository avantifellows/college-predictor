# Scripts

This folder contains utility scripts for data management, validation,
and migration support for the AF Futures project.

---

## validate_data.py

A standalone Python script that validates scholarship data for quality
issues **before** migrating to Postgres.

### Why this exists

As part of the DMP 2026 goal of migrating from JSON/S3 to Postgres,
data must be clean before ingestion. Running this script first ensures
that missing values, duplicate entries, and malformed fields are caught
and documented before they silently corrupt the database.

### How to run

```bash
# 1. Create and activate a virtual environment (first time only)
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies (first time only)
pip install pandas

# 3. Run from the repo root
python scripts/validate_data.py
```

### What it checks

| Check | Field | Description |
|-------|-------|-------------|
| Missing values | Scholarship Name | Flags rows with no scholarship name |
| Missing values | Family Income (in INR) | Flags rows with no income value |
| Duplicate rows | Scholarship Name | Flags scholarships appearing more than once |
| Missing/null income | Family Income (in INR) | Flags rows where income is null, "NA", or completely empty — intentional string formats like "Up to 4 lakhs per annum" are valid and expected |

### Note on income format

The `Family Income (in INR)` column intentionally stores human-readable
strings like "Up to 4 lakhs per annum" or "Any",this is by design.
`lambda_sync_sheet_to_s3.py` already handles conversion via its
`extract_income()` function.

This script only flags income values that are genuinely missing (null,
empty, or "NA") since those cannot be parsed at all. Valid string formats
are not flagged as errors.