#!/usr/bin/env python3
"""
Data Validation and Cleaning Utility for College Predictor

This script validates and cleans college/cutoff data from JSON or CSV files.
It handles missing values, duplicates, inconsistent categories, and invalid ranks.

Author: Avanti Fellows College Predictor Team
"""

import json
import csv
import pandas as pd
import logging
import argparse
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional
from datetime import datetime
import sys

# Configure logging
import os
from pathlib import Path

# Create outputs directory if it doesn't exist
OUTPUTS_DIR = Path(__file__).parent.parent / 'outputs' / 'validation'
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(OUTPUTS_DIR / 'validation.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Standard category mappings
CATEGORY_MAPPING = {
    'general': 'GEN',
    'gen': 'GEN',
    'open': 'GEN',
    'obc': 'OBC',
    'obc-ncl': 'OBC',
    'sc': 'SC',
    'scheduled caste': 'SC',
    'st': 'ST',
    'scheduled tribe': 'ST',
    'ews': 'EWS',
    'economically weaker section': 'EWS'
}

# Required fields for validation
REQUIRED_FIELDS = {
    "JEE": ["College ID", "Academic Program Name", "Opening Rank", "Closing Rank"],
    "GUJCET": ["College Name", "Course", "category"],
    "NEET": ["Institute", "Academic Program Name", "Opening Rank", "Closing Rank"],
}

def detect_dataset_type(data):
    """Detect dataset type based on sample record."""
    if not data:
        return "UNKNOWN"
    
    sample = data[0]
    
    if "College ID" in sample:
        return "JEE"
    elif "College Name" in sample:
        return "GUJCET"
    elif "Institute" in sample and "Quota" in sample:
        return "NEET"
    else:
        return "UNKNOWN"

class DataValidator:
    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        self.data = []
        self.dataset_type = None
        self.validation_report = {
            'total_records': 0,
            'missing_values': {},
            'duplicates': [],
            'invalid_ranks': [],
            'inconsistent_categories': {},
            'cleaned_records': 0,
            'errors': []
        }
        self.cleaned_data = []
        
    def load_data(self) -> bool:
        """Load data from JSON or CSV file."""
        try:
            logger.info(f"Loading data from {self.file_path}")
            
            if self.file_path.suffix.lower() == '.json':
                with open(self.file_path, 'r', encoding='utf-8') as f:
                    self.data = json.load(f)
            elif self.file_path.suffix.lower() == '.csv':
                df = pd.read_csv(self.file_path)
                self.data = df.to_dict('records')
            else:
                raise ValueError(f"Unsupported file format: {self.file_path.suffix}")
            
            self.validation_report['total_records'] = len(self.data)
            # Detect dataset type after loading data
            self.dataset_type = detect_dataset_type(self.data)
            logger.info(f"Dataset type detected: {self.dataset_type}")
            logger.info(f"Successfully loaded {len(self.data)} records")
            return True
            
        except Exception as e:
            logger.error(f"Error loading data: {str(e)}")
            self.validation_report['errors'].append(f"Loading error: {str(e)}")
            return False
    
    def validate_data(self) -> Dict[str, Any]:
        """Validate data for various issues."""
        logger.info("Starting data validation")
        
        if not self.data:
            logger.warning("No data to validate")
            return self.validation_report
        
        # Check missing values
        self._check_missing_values()
        
        # Check duplicates
        self._check_duplicates()
        
        # Check invalid ranks
        self._check_invalid_ranks()
        
        # Check inconsistent categories
        self._check_inconsistent_categories()
        
        # Add field presence summary
        self._add_field_presence_summary()
        
        logger.info("Data validation completed")
        return self.validation_report
    
    def _check_missing_values(self):
        """Check for missing or null values in required fields."""
        logger.info("Checking for missing values")
        
        # Get required fields for detected dataset type
        if self.dataset_type and self.dataset_type in REQUIRED_FIELDS:
            required_fields = REQUIRED_FIELDS[self.dataset_type]
        else:
            logger.warning(f"Unknown dataset type: {self.dataset_type}, skipping missing value check")
            return
        
        for field in required_fields:
            missing_count = 0
            for i, record in enumerate(self.data):
                # Only check if field exists in dataset schema
                if field in record and record[field] in [None, '', 'null', 'NULL']:
                    missing_count += 1
                    self.validation_report['missing_values'].setdefault(field, []).append(i)
            
            if missing_count > 0:
                logger.warning(f"Found {missing_count} missing values in field: {field}")
        
        # Info-level validation message
        if not self.validation_report['missing_values']:
            logger.info("No missing values detected (based on selected schema)")
    
    def _check_duplicates(self):
        """Check for duplicate entries based on key fields."""
        logger.info("Checking for duplicate entries")
        
        seen_records = set()
        duplicates = []
        
        for i, record in enumerate(self.data):
            # Create dataset-specific key for duplicate detection
            if self.dataset_type == "JEE":
                key_parts = [
                    str(record.get('College ID', '')),
                    str(record.get('Academic Program Name', '')),
                    str(record.get('Seat Type', '')),
                    str(record.get('Gender', ''))
                ]
            elif self.dataset_type == "NEET":
                key_parts = [
                    str(record.get('Institute', '')),
                    str(record.get('Academic Program Name', '')),
                    str(record.get('Quota', '')),
                    str(record.get('Seat Type', ''))
                ]
            elif self.dataset_type == "GUJCET":
                key_parts = [
                    str(record.get('College Name', '')),
                    str(record.get('Course', '')),
                    str(record.get('category', ''))
                ]
            else:
                # Fallback for unknown datasets
                key_parts = [str(record.get(field, '')) for field in record.keys()]
            
            record_key = '|'.join(key_parts)
            
            if record_key in seen_records:
                duplicates.append(i)
                logger.warning(f"Duplicate found at index {i}: {record_key}")
            else:
                seen_records.add(record_key)
        
        self.validation_report['duplicates'] = duplicates
    
    def _add_field_presence_summary(self):
        """Add field presence summary to validation report."""
        logger.info("Analyzing field presence across dataset")
        
        if not self.data:
            return
        
        # Count presence of all fields across all records
        field_counts = {}
        for record in self.data:
            for field in record.keys():
                field_counts[field] = field_counts.get(field, 0) + 1
        
        # Add to validation report
        self.validation_report['field_presence'] = field_counts
        
        # Log summary
        logger.info("FIELD PRESENCE SUMMARY:")
        for field, count in sorted(field_counts.items()):
            logger.info(f"- {field}: present in {count} records")
    
    def _check_invalid_ranks(self):
        """Check for invalid rank values."""
        logger.info("Checking for invalid rank values")
        
        invalid_ranks = []
        
        # Skip rank validation for datasets that don't have rank fields
        if self.dataset_type == "GUJCET":
            logger.info("Skipping rank validation for GUJCET dataset (uses marks instead of ranks)")
            return
        
        for i, record in enumerate(self.data):
            # Handle different rank field names
            opening_rank = None
            closing_rank = None
            
            if 'Opening Rank' in record:
                opening_rank = record.get('Opening Rank')
                closing_rank = record.get('Closing Rank')
            elif 'opening_rank' in record:
                opening_rank = record.get('opening_rank')
                closing_rank = record.get('closing_rank')
            
            # Check rank validity only if both ranks exist
            if opening_rank is not None and closing_rank is not None:
                try:
                    opening_rank = float(opening_rank)
                    closing_rank = float(closing_rank)
                    
                    # Check for negative values
                    if opening_rank < 0 or closing_rank < 0:
                        invalid_ranks.append({
                            'index': i,
                            'issue': 'Negative rank value',
                            'opening_rank': opening_rank,
                            'closing_rank': closing_rank
                        })
                    
                    # Check if opening rank > closing rank
                    if opening_rank > closing_rank:
                        invalid_ranks.append({
                            'index': i,
                            'issue': 'Opening rank greater than closing rank',
                            'opening_rank': opening_rank,
                            'closing_rank': closing_rank
                        })
                        
                except (ValueError, TypeError):
                    invalid_ranks.append({
                        'index': i,
                        'issue': 'Invalid rank format',
                        'opening_rank': opening_rank,
                        'closing_rank': closing_rank
                    })
        
        self.validation_report['invalid_ranks'] = invalid_ranks
    
    def _check_inconsistent_categories(self):
        """Check for inconsistent category naming."""
        logger.info("Checking for inconsistent category naming")
        
        category_counts = {}
        inconsistent_categories = {}
        
        for i, record in enumerate(self.data):
            # Handle different category field names
            category = None
            if 'Seat Type' in record:
                category = record.get('Seat Type')
            elif 'category' in record:
                category = record.get('category')
            elif 'Category' in record:
                category = record.get('Category')
            
            if category:
                category_lower = str(category).lower().strip()
                category_counts[category_lower] = category_counts.get(category_lower, 0) + 1
                
                # Check if category needs normalization
                if category_lower not in CATEGORY_MAPPING and category_lower not in inconsistent_categories:
                    inconsistent_categories[category_lower] = {
                        'original': category,
                        'count': 1,
                        'indices': [i]
                    }
                elif category_lower in inconsistent_categories:
                    inconsistent_categories[category_lower]['count'] += 1
                    inconsistent_categories[category_lower]['indices'].append(i)
        
        self.validation_report['inconsistent_categories'] = inconsistent_categories
        
        if inconsistent_categories:
            logger.warning(f"Found {len(inconsistent_categories)} inconsistent categories")
            for cat, info in inconsistent_categories.items():
                logger.warning(f"  - '{info['original']}' ({info['count']} occurrences)")
    
    def clean_data(self) -> List[Dict[str, Any]]:
        """Clean the data by normalizing categories and handling issues."""
        logger.info("Starting data cleaning")
        
        if not self.data:
            logger.warning("No data to clean")
            return []
        
        cleaned_data = []
        removed_indices = set()
        
        # Add duplicate indices to removal set
        removed_indices.update(self.validation_report['duplicates'])
        
        for i, record in enumerate(self.data):
            if i in removed_indices:
                continue
            
            cleaned_record = record.copy()
            
            # Normalize category
            cleaned_record = self._normalize_category(cleaned_record)
            
            # Handle missing values (simple strategy - keep as is but log)
            cleaned_record = self._handle_missing_values(cleaned_record, i)
            
            # Fix rank issues if possible
            cleaned_record = self._fix_rank_issues(cleaned_record, i)
            
            cleaned_data.append(cleaned_record)
        
        self.cleaned_data = cleaned_data
        self.validation_report['cleaned_records'] = len(cleaned_data)
        
        logger.info(f"Data cleaning completed. {len(cleaned_data)} records remain after cleaning")
        return cleaned_data
    
    def _normalize_category(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize category values to standard format."""
        # Handle different category field names
        category_field = None
        if 'Seat Type' in record:
            category_field = 'Seat Type'
        elif 'category' in record:
            category_field = 'category'
        elif 'Category' in record:
            category_field = 'Category'
        
        if category_field and record[category_field]:
            category_lower = str(record[category_field]).lower().strip()
            if category_lower in CATEGORY_MAPPING:
                record[category_field] = CATEGORY_MAPPING[category_lower]
        
        return record
    
    def _handle_missing_values(self, record: Dict[str, Any], index: int) -> Dict[str, Any]:
        """Handle missing values in records."""
        # For now, we'll keep missing values as is but could implement filling strategies
        # This is a placeholder for more sophisticated missing value handling
        return record
    
    def _fix_rank_issues(self, record: Dict[str, Any], index: int) -> Dict[str, Any]:
        """Fix rank issues if possible."""
        # Handle different rank field names
        opening_field = None
        closing_field = None
        
        if 'Opening Rank' in record:
            opening_field = 'Opening Rank'
            closing_field = 'Closing Rank'
        elif 'opening_rank' in record:
            opening_field = 'opening_rank'
            closing_field = 'closing_rank'
        
        if opening_field and closing_field:
            try:
                opening_rank = float(record[opening_field])
                closing_rank = float(record[closing_field])
                
                # Fix swapped ranks
                if opening_rank > closing_rank:
                    record[opening_field] = closing_rank
                    record[closing_field] = opening_rank
                    logger.info(f"Fixed swapped ranks at index {index}")
                
            except (ValueError, TypeError):
                # Keep invalid ranks as is but could set to None
                pass
        
        return record
    
    def generate_report(self) -> str:
        """Generate a detailed validation report."""
        logger.info("Generating validation report")
        
        report_lines = [
            "DATA VALIDATION AND CLEANING REPORT",
            "=" * 50,
            f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"Source file: {self.file_path}",
            "",
            "SUMMARY:",
            f"- Total records processed: {self.validation_report['total_records']}",
            f"- Records after cleaning: {self.validation_report['cleaned_records']}",
            f"- Records removed: {self.validation_report['total_records'] - self.validation_report['cleaned_records']}",
            ""
        ]
        
        # Field presence summary
        if 'field_presence' in self.validation_report:
            report_lines.extend([
                "FIELDS DETECTED:",
                "-" * 20
            ])
            for field, count in sorted(self.validation_report['field_presence'].items()):
                report_lines.append(f"- {field}: present in {count} records")
            report_lines.append("")
        
        # Missing values section
        if self.validation_report['missing_values']:
            report_lines.extend([
                "MISSING VALUES:",
                "-" * 20
            ])
            for field, indices in self.validation_report['missing_values'].items():
                report_lines.append(f"- {field}: {len(indices)} records")
            report_lines.append("")
        
        # Duplicates section
        if self.validation_report['duplicates']:
            report_lines.extend([
                "DUPLICATES:",
                "-" * 15,
                f"- Removed duplicate records based on dataset-specific key",
                f"- Duplicate indices: {self.validation_report['duplicates'][:10]}{'...' if len(self.validation_report['duplicates']) > 10 else ''}",
                ""
            ])
        
        # Invalid ranks section
        if self.validation_report['invalid_ranks']:
            report_lines.extend([
                "INVALID RANKS:",
                "-" * 18,
                f"- Found {len(self.validation_report['invalid_ranks'])} records with invalid ranks"
            ])
            for rank_issue in self.validation_report['invalid_ranks'][:5]:
                report_lines.append(f"  - Index {rank_issue['index']}: {rank_issue['issue']}")
            if len(self.validation_report['invalid_ranks']) > 5:
                report_lines.append(f"  ... and {len(self.validation_report['invalid_ranks']) - 5} more")
            report_lines.append("")
        
        # Inconsistent categories section
        if self.validation_report['inconsistent_categories']:
            report_lines.extend([
                "INCONSISTENT CATEGORIES:",
                "-" * 28,
                f"- Found {len(self.validation_report['inconsistent_categories'])} inconsistent categories"
            ])
            for cat, info in list(self.validation_report['inconsistent_categories'].items())[:5]:
                report_lines.append(f"  - '{info['original']}' ({info['count']} occurrences)")
            if len(self.validation_report['inconsistent_categories']) > 5:
                report_lines.append(f"  ... and {len(self.validation_report['inconsistent_categories']) - 5} more")
            report_lines.append("")
        
        # Errors section
        if self.validation_report['errors']:
            report_lines.extend([
                "ERRORS:",
                "-" * 10
            ])
            for error in self.validation_report['errors']:
                report_lines.append(f"- {error}")
            report_lines.append("")
        
        # Standard categories used
        report_lines.extend([
            "STANDARD CATEGORIES USED:",
            "-" * 30,
            "- GEN (General/Open)",
            "- OBC (Other Backward Classes)",
            "- SC (Scheduled Castes)",
            "- ST (Scheduled Tribes)",
            "- EWS (Economically Weaker Sections)",
            "",
            "CLEANING ACTIONS PERFORMED:",
            "-" * 30,
            "- Removed duplicate records",
            "- Normalized category names",
            "- Fixed swapped rank values where possible",
            "- Preserved original data structure",
            ""
        ])
        
        return '\n'.join(report_lines)
    
    def save_cleaned_data(self, output_path: str = None):
        """Save cleaned data to JSON file."""
        if output_path is None:
            output_path = OUTPUTS_DIR / 'cleaned_data.json'
        
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(self.cleaned_data, f, indent=2, ensure_ascii=False)
            logger.info(f"Cleaned data saved to {output_path}")
        except Exception as e:
            logger.error(f"Error saving cleaned data: {str(e)}")
    
    def save_report(self, output_path: str = None):
        """Save validation report to text file."""
        if output_path is None:
            output_path = OUTPUTS_DIR / 'validation_report.txt'
        
        try:
            report_content = self.generate_report()
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(report_content)
            logger.info(f"Validation report saved to {output_path}")
        except Exception as e:
            logger.error(f"Error saving report: {str(e)}")


def main():
    """Main function to run the validation and cleaning process."""
    parser = argparse.ArgumentParser(description='Validate and clean college predictor data')
    parser.add_argument('file_path', help='Path to the input JSON or CSV file')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Only generate validation report without saving cleaned data')
    
    args = parser.parse_args()
    
    # Initialize validator
    validator = DataValidator(args.file_path)
    
    # Load data
    if not validator.load_data():
        logger.error("Failed to load data. Exiting.")
        sys.exit(1)
    
    # Validate data
    validation_results = validator.validate_data()
    
    # Clean data
    cleaned_data = validator.clean_data()
    
    # Save results
    if not args.dry_run:
        validator.save_cleaned_data()
        print(f"\nFiles created:")
        print(f"- cleaned_data.json")
    else:
        print(f"\nDry run mode: No files saved")
    
    validator.save_report()
    
    # Print summary
    print("\n" + "="*50)
    print("VALIDATION AND CLEANING COMPLETED")
    print("="*50)
    print(f"Total records: {validation_results['total_records']}")
    print(f"Cleaned records: {validation_results['cleaned_records']}")
    print(f"Duplicates removed: {len(validation_results['duplicates'])}")
    print(f"Invalid ranks found: {len(validation_results['invalid_ranks'])}")
    print(f"Inconsistent categories: {len(validation_results['inconsistent_categories'])}")
    print(f"\nFiles created:")
    print(f"- validation_report.txt")
    print(f"- validation.log")


if __name__ == "__main__":
    main()
