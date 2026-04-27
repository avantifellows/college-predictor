# WBJEE Integration Guide

## Overview
This document describes the WBJEE (West Bengal Joint Entrance Examination) integration into the College Predictor application.

## What's Been Implemented

### 1. ✅ WBJEE Configuration (`examConfig.js`)
- Added `wbjeeConfig` object with support for:
  - **6 Categories**: General, OBC-A, OBC-B, SC, ST, PwD
  - **Domicile Status**: WB Domicile, Non-WB Domicile
  - **Gender Options**: Male, Female, Gender-Neutral
  - **Filtering Logic**: Rank-based college selection
  - **Data Path**: `/public/data/WBJEE/wbjee_data.json`

### 2. ✅ WBJEE Registration
- Added WBJEE to the `examConfigs` object
- WBJEE now appears in the exam selection dropdown

### 3. ✅ Sample Data Population
- Created `/public/data/WBJEE/wbjee_data.json` with 10 sample colleges:
  - **Jadavpur University** (Engineering & Pharmacy)
  - **Techno Main Salt Lake** (Multiple programs)
  - **IIEST Shibpur** (Engineering)
  - Multiple category and gender variants

### 4. ✅ Data Generation Script
- Created `scripts/generate_wbjee_data.py`
- Easily update sample data or populate with real WBJEE cutoff data
- Includes instructions for sourcing official data

## How to Use

### Testing the Integration

1. **Start the dev server** (already running on port 3000):
   ```bash
   npm run dev
   ```

2. **Open the app**:
   - Navigate to `http://localhost:3000`
   - Look for "WBJEE" in the exam selection dropdown

3. **Test the Predictor**:
   - Select "WBJEE"
   - Choose:
     - **Category**: General / OBC-A / OBC-B / SC / ST / PwD
     - **Domicile**: WB Domicile / Non-WB Domicile
     - **Gender**: Male / Female / Gender-Neutral
   - Enter your WBJEE Rank (e.g., 500)
   - Submit to see matching colleges

### Populating Real Data

To use actual WBJEE cutoff data:

1. **Download official cutoff data**:
   - Visit: https://wbjeeb.nic.in/
   - Download the latest counselling cutoff reports

2. **Extract the data** with:
   - College names
   - Programs offered
   - Opening/Closing ranks by category
   - Gender-wise information
   - Domicile status

3. **Update the script**:
   ```python
   # Edit scripts/generate_wbjee_data.py
   # Update the WBJEE_COLLEGES list with real data
   ```

4. **Regenerate the data file**:
   ```bash
   python3 scripts/generate_wbjee_data.py
   ```

5. **Restart the dev server** to load the updated data

## Data Format

Each college entry in `wbjee_data.json` should include:

```json
{
  "College ID": "WBJEE-001",
  "Institute": "College Name",
  "Academic Program Name": "Program (e.g., Computer Science)",
  "State": "West Bengal",
  "Category": "General|OBC-A|OBC-B|SC|ST|PwD",
  "Domicile": "WB Domicile|Non-WB Domicile",
  "Gender": "Male|Female|Gender-Neutral",
  "Closing Rank": "Rank Number",
  "Opening Rank": "Rank Number",
  "Course Type": "Engineering|Pharmacy|Architecture",
  "Exam": "WBJEE",
  "Management Type": "Government|Private|Aided"
}
```

## File Structure

```
college-predictor-dmp-2026/
├── examConfig.js                           # WBJEE config added
├── pages/
│   └── college_predictor.js               # Uses examConfigs
├── public/data/WBJEE/
│   └── wbjee_data.json                    # WBJEE college data (10 samples)
└── scripts/
    └── generate_wbjee_data.py             # Data generation script
```

## Data Sources

**Official Sources**:
- WBJEE Board: https://wbjeeb.nic.in/
- e-WBJEE Portal: https://wbjeeb.nic.in/ewbjee/

**Reference Portals**:
- CollegeDunia: https://collegedunia.com/exams/wbjee/cutoff
- GetMyUni: https://www.getmyuni.com/exams/wbjee-cut-off
- KollegeApply: https://www.kollegeapply.com/exams/wbjee/cut-off

## Next Steps

1. **Collect Real Data**: Download official WBJEE cutoff reports from wbjeeb.nic.in
2. **Populate Data**: Update `scripts/generate_wbjee_data.py` with real college data
3. **Regenerate**: Run the script to create the final data file
4. **Test Thoroughly**: Verify all categories, domicile statuses, and rank filtering work
5. **Document Sources**: Add metadata about data source and collection date

## Contributing

If you're contributing this as part of a C4GT DMP 2026 proposal:

1. Focus on data collection from official WBJEE sources
2. Ensure all major West Bengal engineering/pharmacy colleges are included
3. Validate rank ranges match official counselling cutoffs
4. Test thoroughly with actual user scenarios
5. Document any assumptions or data limitations

## Support

For issues or questions:
- Check official WBJEE website: https://wbjeeb.nic.in/
- Review the data generation script comments
- Ensure JSON data format matches the schema above
