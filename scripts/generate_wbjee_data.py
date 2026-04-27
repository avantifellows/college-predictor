#!/usr/bin/env python3
"""
Script to generate WBJEE college data.
This script creates a template with sample West Bengal engineering colleges.

Data Source: Official WBJEE Board website (wbjeeb.nic.in)
Instructions to populate with real data:
1. Download cutoff data from https://wbjeeb.nic.in/
2. Extract college names, cutoff ranks, and other details
3. Update the colleges list below with real data
"""

import json
from pathlib import Path

# Sample WBJEE colleges with typical cutoff data
# Based on major engineering institutions in West Bengal
WBJEE_COLLEGES = [
    # Jadavpur University
    {
        "College ID": "WBJEE-001",
        "Institute": "Jadavpur University",
        "Academic Program Name": "Computer Science and Engineering",
        "State": "West Bengal",
        "Category": "General",
        "Domicile": "WB Domicile",
        "Gender": "Gender-Neutral",
        "Closing Rank": "500",
        "Opening Rank": "1",
        "Course Type": "Engineering",
        "Exam": "WBJEE",
        "Management Type": "Government"
    },
    {
        "College ID": "WBJEE-002",
        "Institute": "Jadavpur University",
        "Academic Program Name": "Electronics and Telecommunication Engineering",
        "State": "West Bengal",
        "Category": "General",
        "Domicile": "WB Domicile",
        "Gender": "Gender-Neutral",
        "Closing Rank": "1200",
        "Opening Rank": "501",
        "Course Type": "Engineering",
        "Exam": "WBJEE",
        "Management Type": "Government"
    },
    # Techno Main Salt Lake
    {
        "College ID": "WBJEE-003",
        "Institute": "Techno Main Salt Lake",
        "Academic Program Name": "Computer Science and Engineering",
        "State": "West Bengal",
        "Category": "General",
        "Domicile": "WB Domicile",
        "Gender": "Gender-Neutral",
        "Closing Rank": "800",
        "Opening Rank": "100",
        "Course Type": "Engineering",
        "Exam": "WBJEE",
        "Management Type": "Private"
    },
    {
        "College ID": "WBJEE-004",
        "Institute": "Techno Main Salt Lake",
        "Academic Program Name": "Information Technology",
        "State": "West Bengal",
        "Category": "General",
        "Domicile": "WB Domicile",
        "Gender": "Gender-Neutral",
        "Closing Rank": "1000",
        "Opening Rank": "300",
        "Course Type": "Engineering",
        "Exam": "WBJEE",
        "Management Type": "Private"
    },
    # Bengal Engineering and Science University
    {
        "College ID": "WBJEE-005",
        "Institute": "IIEST Shibpur",
        "Academic Program Name": "Computer Science and Engineering",
        "State": "West Bengal",
        "Category": "General",
        "Domicile": "WB Domicile",
        "Gender": "Gender-Neutral",
        "Closing Rank": "400",
        "Opening Rank": "1",
        "Course Type": "Engineering",
        "Exam": "WBJEE",
        "Management Type": "Government"
    },
    # OBC Category Examples
    {
        "College ID": "WBJEE-006",
        "Institute": "Jadavpur University",
        "Academic Program Name": "Computer Science and Engineering",
        "State": "West Bengal",
        "Category": "OBC-A",
        "Domicile": "WB Domicile",
        "Gender": "Gender-Neutral",
        "Closing Rank": "250",
        "Opening Rank": "1",
        "Course Type": "Engineering",
        "Exam": "WBJEE",
        "Management Type": "Government"
    },
    # SC Category
    {
        "College ID": "WBJEE-007",
        "Institute": "Jadavpur University",
        "Academic Program Name": "Computer Science and Engineering",
        "State": "West Bengal",
        "Category": "SC",
        "Domicile": "WB Domicile",
        "Gender": "Gender-Neutral",
        "Closing Rank": "150",
        "Opening Rank": "1",
        "Course Type": "Engineering",
        "Exam": "WBJEE",
        "Management Type": "Government"
    },
    # Non-WB Domicile
    {
        "College ID": "WBJEE-008",
        "Institute": "Techno Main Salt Lake",
        "Academic Program Name": "Computer Science and Engineering",
        "State": "West Bengal",
        "Category": "General",
        "Domicile": "Non-WB Domicile",
        "Gender": "Gender-Neutral",
        "Closing Rank": "1500",
        "Opening Rank": "800",
        "Course Type": "Engineering",
        "Exam": "WBJEE",
        "Management Type": "Private"
    },
    # Female Category
    {
        "College ID": "WBJEE-009",
        "Institute": "Jadavpur University",
        "Academic Program Name": "Computer Science and Engineering",
        "State": "West Bengal",
        "Category": "General",
        "Domicile": "WB Domicile",
        "Gender": "Female",
        "Closing Rank": "600",
        "Opening Rank": "50",
        "Course Type": "Engineering",
        "Exam": "WBJEE",
        "Management Type": "Government"
    },
    # Pharmacy Course
    {
        "College ID": "WBJEE-010",
        "Institute": "Jadavpur University",
        "Academic Program Name": "Pharmacy",
        "State": "West Bengal",
        "Category": "General",
        "Domicile": "WB Domicile",
        "Gender": "Gender-Neutral",
        "Closing Rank": "2000",
        "Opening Rank": "1500",
        "Course Type": "Pharmacy",
        "Exam": "WBJEE",
        "Management Type": "Government"
    },
]

def generate_wbjee_data():
    """Generate WBJEE data JSON file"""
    output_file = Path(__file__).parent.parent / "public" / "data" / "WBJEE" / "wbjee_data.json"

    # Create directory if it doesn't exist
    output_file.parent.mkdir(parents=True, exist_ok=True)

    # Write the data
    with open(output_file, 'w') as f:
        json.dump(WBJEE_COLLEGES, f, indent=2)

    print(f"✅ Generated WBJEE data file at: {output_file}")
    print(f"📊 Total colleges/programs: {len(WBJEE_COLLEGES)}")

def print_instructions():
    """Print instructions for populating real data"""
    print("\n" + "="*60)
    print("📋 INSTRUCTIONS TO POPULATE REAL WBJEE DATA")
    print("="*60)
    print("""
1. Visit official WBJEE Board website:
   https://wbjeeb.nic.in/

2. Download the counselling cutoff reports (usually available as PDF/Excel)
   - Look for "Cutoff Data" or "Merit List" sections
   - Download for latest academic year

3. Extract data for each college including:
   - College name
   - Engineering/Pharmacy programs offered
   - Opening and closing ranks by category
   - Category information (General, OBC-A, OBC-B, SC, ST, PwD)
   - Domicile status (WB/Non-WB)
   - Gender-wise quotas (if applicable)

4. Update the WBJEE_COLLEGES list in this script with real data

5. Run: python scripts/generate_wbjee_data.py

6. Test the implementation by selecting WBJEE from the dropdown
   and verifying colleges and cutoffs appear correctly

Other useful resources:
- https://collegedunia.com/exams/wbjee/cutoff
- https://www.getmyuni.com/exams/wbjee-cut-off
- https://www.kollegeapply.com/exams/wbjee/cut-off
""")

if __name__ == "__main__":
    generate_wbjee_data()
    print_instructions()
