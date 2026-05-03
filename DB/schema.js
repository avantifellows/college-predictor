import { pool } from "./connection.js";

export const mhtcetDB = async () => {

    console.log("Creating Table for Mhtcet")

    await pool.query(
        `CREATE TABLE IF NOT EXISTS mhtcet (
      id SERIAL PRIMARY KEY,
      institute TEXT,
      academic_program_name TEXT,
      category TEXT,
      gender TEXT,
      defense BOOLEAN,
      pwd BOOLEAN,
      state TEXT,
      category_key TEXT,
      closing_rank INT
    );`
    )

    console.log("Table created for mhtcet")

    await pool.query(
        `
      CREATE TABLE IF NOT EXISTS gujcet (
      id SERIAL PRIMARY KEY,

      -- College Info
      aishe_code TEXT,
      college_name TEXT,
      district TEXT,
      college_type TEXT,

      -- Course Info
      course_name TEXT,
      program TEXT,
      total_seats INT,
      fees_per_year INT,

      -- Admission Info
      exam TEXT,
      category TEXT,
      pwd BOOLEAN,
      closing_marks FLOAT,

      -- Placement Info
      median_salary INT,
      avg_placement FLOAT,
      nirf_ranking INT,
      medical_stipend INT
    );`
    )

    await pool.query(
        `CREATE TABLE IF NOT EXISTS kcet (
  id SERIAL PRIMARY KEY,
  institute TEXT,
  course_type TEXT,
  academic_program_name TEXT,
  category TEXT,
  state TEXT,
  language TEXT,
  rural_urban TEXT,
  category_key TEXT,
  closing_rank INT
);`
    )

    await pool.query(
    `CREATE TABLE IF NOT EXISTS neetug (
  id SERIAL PRIMARY KEY,
  institute TEXT,
  state TEXT,
  seat_type TEXT,
  academic_program_name TEXT,
  gender TEXT,
  category TEXT,
  closing_rank INT
);`
    )

    await pool.query(
        `CREATE TABLE IF NOT EXISTS scholarships (
  id SERIAL PRIMARY KEY,
  scholarship_name TEXT,
  no_of_awards INT,
  scholarship_amount INT,
  scholarship_frequency TEXT,
  status TEXT,
  class_10_or_below BOOLEAN,
  class_11 BOOLEAN,
  class_12 BOOLEAN,
  class_12_passed BOOLEAN,
  second_third_year BOOLEAN,
  diploma_iti BOOLEAN,
  eligible_pg BOOLEAN,
  gender TEXT,
  category TEXT,
  family_income FLOAT,
  state TEXT,
  city TEXT,
  last_date TEXT,
  stream TEXT,
  eligibility TEXT,
  benefits TEXT,
  doc_required TEXT,
  application_link TEXT,
  prefilled_form_link TEXT,
  grade TEXT
);`
    )

    await pool.query(
        `CREATE TABLE IF NOT EXISTS tnea (
  id SERIAL PRIMARY KEY,
  institute_id TEXT,
  institute TEXT,
  course TEXT,
  district TEXT,
  college_type TEXT,
  category TEXT,
  cutoff_marks INT
);`
    )

    await pool.query(
        `CREATE TABLE IF NOT EXISTS tseapert (
  id SERIAL PRIMARY KEY,
  inst_code TEXT,
  institute_name TEXT,
  place TEXT,
  dist_code TEXT,
  co_ed TEXT,
  college_type TEXT,
  year_of_establish INT,
  branch_code TEXT,
  branch_name TEXT,
  category TEXT,
  gender TEXT,
  region TEXT,
  closing_rank INT,
  tuition_fee INT,
  affiliated_to TEXT
);`
    )

    return 
}