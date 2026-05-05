# Data Validation and Cleaning Utility

## Overview

The `validate_and_clean_data.py` script provides comprehensive data validation and cleaning functionality for college predictor datasets. It handles JSON and CSV files with various data formats used across different entrance exams (JEE, GUJCET, etc.).

## Features

- **Multi-format support**: Handles both JSON and CSV input files
- **Flexible data structure**: Adapts to different exam data formats
- **Comprehensive validation**: Checks for missing values, duplicates, invalid ranks, and inconsistent categories
- **Automatic cleaning**: Normalizes categories, removes duplicates, fixes rank issues
- **Dry-run mode**: Validation without modifying data files
- **Detailed reporting**: Generates comprehensive validation reports
- **Production-ready**: Includes logging, error handling, and modular design
- **Easy integration**: Integrated into project workflow with npm scripts

## Installation

Install the required dependencies:

```bash
pip install pandas
```

## Usage

### Repository Structure

The validation script is located in the `scripts/` folder:
```
college-predictor/
├── scripts/
│   └── validate_and_clean_data.py
├── public/data/
│   ├── JEE/
│   ├── GUJCET/
│   └── ...
└── ...
```

### Command Line Usage

#### Basic Usage
```bash
python scripts/validate_and_clean_data.py <input_file_path>
```

#### Dry Run Mode (Validation Only)
```bash
python scripts/validate_and_clean_data.py <input_file_path> --dry-run
```

#### Examples
```bash
# Validate JEE data (normal mode)
python scripts/validate_and_clean_data.py public/data/JEE/OPEN.json

# Validate GUJCET data (dry run)
python scripts/validate_and_clean_data.py public/data/GUJCET/GUJCET.json --dry-run

# Validate CSV file
python scripts/validate_and_clean_data.py data/college_data.csv
```

### NPM Script Integration

The script is integrated into the project workflow via npm scripts:

```bash
# Run validation using npm (validates JEE OPEN data)
npm run validate:data
```

To validate different files, run the script directly:
```bash
python scripts/validate_and_clean_data.py path/to/your/data.json
```

### Suggested Workflow

Run validation before using datasets for predictions:

```bash
npm run validate:data -- public/data/JEE/OPEN.json --dry-run
```

This helps identify inconsistencies early and prevents unreliable prediction outputs.

## Expected Input Format

The script supports multiple data formats:

### JEE Format
```json
[
  {
    "College ID": "U-0306",
    "Institute": "Indian Institute Of Technology Bombay",
    "Academic Program Name": "Computer Science and Engineering",
    "Opening Rank": "1",
    "Closing Rank": "68",
    "Seat Type": "OPEN",
    "Gender": "Gender-Neutral",
    "Quota": "AI"
  }
]
```

### GUJCET Format
```json
[
  {
    "College Name": "DR. S. & S. S. GHANDHY GOVERNMENT ENGINEERING COLLEGE",
    "Course": "Civil Engineering",
    "category": "general",
    "closing_marks": 13.51
  }
]
```

### CSV Format
CSV files should have headers corresponding to the fields above.

## Validation Checks

### 1. Missing Values
- Detects null/empty values in required fields
- Reports count and locations of missing data

### 2. Duplicate Detection
- Identifies duplicate records based on:
  - JEE: College ID + Program Name + Seat Type + Gender
  - Others: College Name + Course + Category

### 3. Rank Validation
- Checks for negative rank values
- Validates opening rank ≤ closing rank
- Detects invalid rank formats

### 4. Category Normalization
Standardizes categories to:
- `GEN` (General/Open)
- `OBC` (Other Backward Classes)
- `SC` (Scheduled Castes)
- `ST` (Scheduled Tribes)
- `EWS` (Economically Weaker Sections)

## Output Files

The script generates different output files based on the mode:

### Normal Mode
1. **`cleaned_data.json`** - Validated and cleaned dataset
2. **`validation_report.txt`** - Detailed validation report
3. **`validation.log`** - Process log with timestamps

### Dry Run Mode
1. **`validation_report.txt`** - Detailed validation report only
2. **`validation.log`** - Process log with timestamps

No `cleaned_data.json` file is created in dry-run mode.

### Sample Validation Report Structure

```
DATA VALIDATION AND CLEANING REPORT
==================================================
Generated on: 2024-01-15 10:30:00
Source file: public/data/JEE/OPEN.json

SUMMARY:
- Total records processed: 1500
- Records after cleaning: 1450
- Records removed: 50

MISSING VALUES:
--------------------
- Institute: 5 records
- Opening Rank: 2 records

DUPLICATES:
---------------
- Removed duplicate records based on dataset-specific key
- Duplicate indices: [45, 67, 89, 123, 156...]

INVALID RANKS:
------------------
- Found 10 records with invalid ranks
  - Index 234: Opening rank greater than closing rank
  - Index 456: Negative rank value

INCONSISTENT CATEGORIES:
----------------------------
- Found 8 inconsistent categories
  - 'general' (15 occurrences)
  - 'open' (8 occurrences)
```

## Command Line Options

| Option | Description |
|--------|-------------|
| `<input_file_path>` | Path to the JSON or CSV file to validate (required) |
| `--dry-run` | Only generate validation report without saving cleaned data (optional) |

### Dry Run Mode

When `--dry-run` flag is used:
- ✅ Validation checks are performed
- ✅ Validation report is generated
- ✅ Issues are logged
- ❌ No cleaned data file is saved
- ❌ No modifications to original data

This is useful for:
- Previewing data quality issues
- Planning data cleaning strategies
- Validating large datasets without storage overhead

## Integration with Data Pipeline

The script is designed for easy integration:

```python
from validate_and_clean_data import DataValidator

# Initialize validator
validator = DataValidator('path/to/data.json')

# Load and validate
validator.load_data()
validation_results = validator.validate_data()

# Clean data
cleaned_data = validator.clean_data()

# Use cleaned data in your pipeline
process_cleaned_data(cleaned_data)
```

## Error Handling

The script includes comprehensive error handling:
- File format validation
- Data structure validation
- Graceful handling of malformed records
- Detailed error logging

## Logging

All operations are logged to:
- Console output (real-time progress)
- `validation.log` file (persistent logs)

Log levels:
- `INFO`: Normal operation progress
- `WARNING`: Data quality issues found
- `ERROR`: Critical errors preventing operation

## Customization

### Adding New Category Mappings

Edit the `CATEGORY_MAPPING` dictionary in the script:

```python
CATEGORY_MAPPING = {
    'your_new_category': 'STANDARD_CODE',
    # ... existing mappings
}
```

### Modifying Required Fields

Update the `REQUIRED_FIELDS` dictionary for new data formats:

```python
REQUIRED_FIELDS = {
    'your_exam_type': ['field1', 'field2', 'field3'],
    # ... existing formats
}
```

## Performance Considerations

- Memory usage scales with dataset size
- Large files (>100MB) may require additional RAM
- Processing time: ~1-2 seconds per 10,000 records

## Troubleshooting

### Common Issues

1. **"Unsupported file format"**: Ensure file is .json or .csv
2. **"No data to validate"**: Check if file is empty or malformed
3. **Memory errors**: Process large files in chunks or use streaming

### Debug Mode

Enable debug logging by modifying the logging level:

```python
logging.basicConfig(level=logging.DEBUG)
```

## Contributing

When adding new validation rules:
1. Update the appropriate `_check_*` method
2. Add the issue to the validation report structure
3. Update the report generation method
4. Test with sample data

## License

This utility is part of the Avanti Fellows College Predictor project.
