import os
import json
import sqlite3

# Directory containing the JSON files
data_dir = r'<path_to_your_data_directory>'  # Replace with your actual path

# SQLite database file
db_file = os.path.join(data_dir, 'college_data.db')

# Connect to SQLite database (or create it if it doesn't exist)
conn = sqlite3.connect(db_file)
cursor = conn.cursor()

# Create the CollegeDetails table
cursor.execute('''
    CREATE TABLE IF NOT EXISTS CollegeDetails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        State TEXT,
        Exam TEXT,
        Institute TEXT,
        AcademicProgramName TEXT,
        Quota TEXT,
        SpecialQuota TEXT,
        SeatType TEXT,
        Gender TEXT
    )
''')

# Create the CollegeRankInteractions table
cursor.execute('''
    CREATE TABLE IF NOT EXISTS CollegeRankInteractions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        CollegeDetailsId INTEGER,
        Round INTEGER,
        OpeningRank TEXT,
        ClosingRank TEXT,
        InputRankComparisonToClosingRank INTEGER,
        CategoryMatch INTEGER,
        FOREIGN KEY (CollegeDetailsId) REFERENCES CollegeDetails (id)
    )
''')

# Function to process a single JSON file
def process_json_file(json_file_path):
    with open(json_file_path, 'r') as file:
        data = json.load(file)
        for item in data:
            # Insert into CollegeDetails table
            cursor.execute('''
                INSERT INTO CollegeDetails (
                    State, Exam, Institute, AcademicProgramName, Quota,
                    SpecialQuota, SeatType, Gender
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                item.get('State'),
                item.get('Exam'),
                item.get('Institute'),
                item.get('Academic Program Name'),
                item.get('Quota'),
                item.get('Special Quota'),
                item.get('Seat Type'),
                item.get('Gender')
            ))
            college_details_id = cursor.lastrowid  # Get the ID of the inserted row

            # Insert into CollegeRankInteractions table
            cursor.execute('''
                INSERT INTO CollegeRankInteractions (
                    CollegeDetailsId, Round, OpeningRank, ClosingRank,
                    InputRankComparisonToClosingRank, CategoryMatch
                ) VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                college_details_id,
                item.get('Round'),
                item.get('Opening Rank'),
                item.get('Closing Rank'),
                item.get('Input Rank Comparison to Closing Rank'),
                item.get('Category Match')
            ))

# Process all JSON files in the directory
for file_name in os.listdir(data_dir):
    if file_name.endswith('.json'):
        json_file_path = os.path.join(data_dir, file_name)
        print(f"Processing {file_name}...")
        process_json_file(json_file_path)

# Commit changes and close the connection
conn.commit()
conn.close()

print(f"All JSON files have been processed and saved into {db_file}.")