import json
import urllib.request
import re
import csv
import io
import boto3
from botocore.exceptions import ClientError
import os
import sys
csv.field_size_limit(sys.maxsize)  # Set to maximum system size

s3_client = boto3.client('s3')

def create_grade_array(row, grade_columns, grade_labels):
    grades = []
    for col, label in zip(grade_columns, grade_labels):
        if row.get(col) == "Yes":
            grades.append(label)
    return grades

def extract_income(value):
    if not value:
        return None
    match = re.search(r'(\d+(\.\d+)?)', str(value))
    if match:
        return float(match.group(1))
    return value

def lambda_handler(event, context):
    try:
        # 1. Get the CSV from Google Sheets
        published_url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBCqBFvIMpaTcHz4Pl6mJ5zxazM-0EBVu_adM8KfLsUXcpclW2a4t29Jy0PH63CBSJR5z5hJxU342y/pub?gid=0&single=true&output=csv"
        response = urllib.request.urlopen(published_url)

        csv_data = response.read().decode('utf-8')

        # 2. Parse the CSV
        csv_reader = csv.DictReader(io.StringIO(csv_data))
        parsed_data = list(csv_reader)

        # 3. Process the data
        grade_columns = [
            "Class 10 or below can apply",
            "Class 11 can Apply",
            "Class 12 can Apply",
            "12th Passed Can Apply",
            "2nd/3rd Yr Eligible",
            "Diploma/ITI",
            "Eligible for PG"
        ]

        grade_labels = ["10", "11", "12", "12_pass", "UG", "Diploma", "PG"]

        processed_data = []
        for row in parsed_data:
            # Clean the row keys by removing whitespace
            clean_row = {k.strip(): v for k, v in row.items()}

            # Add grade array
            clean_row['Grade'] = create_grade_array(clean_row, grade_columns, grade_labels)

            # Process family income
            clean_row['Family Income (in INR)'] = extract_income(clean_row.get('Family Income (in INR)'))

            processed_data.append(clean_row)

        # 4. Upload to S3
        s3_client.put_object(
            Bucket="avantifellows-assets",
            Key='futures/scholarship_data.json',
            Body=json.dumps(processed_data, indent=2),
            ContentType='application/json'
        )

        print(f'Successfully uploaded {len(processed_data)} scholarship records to S3')
        print('Scholarship data updated successfully')

        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'message': 'Scholarship data updated successfully',
                'count': len(processed_data)
            })
        }

    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        print(f'S3 upload failed: {error_code} - {error_message}')
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Failed to upload scholarship data to S3',
                'details': f'{error_code}: {error_message}'
            })
        }

    except Exception as error:
        print(f'Failed to update scholarship data: {str(error)}')
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Failed to update scholarship data',
                'details': str(error)
            })
        }