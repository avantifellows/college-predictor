import { pool } from "../connection.js";
import { DB_URL } from "../../utils/env_values.js";

export const masterDB = async () => {

    console.log(pool, DB_URL)

    await pool.query(
        `CREATE TABLE IF NOT EXISTS colleges (
  id SERIAL PRIMARY KEY,

  external_college_id TEXT,

  aishe_code TEXT,

  college_name TEXT NOT NULL,

  college_type TEXT,

  managed_by TEXT,

  year_of_establish INT,

  district TEXT,

  state TEXT,

  region TEXT,

  place TEXT,

  dist_code TEXT,

  co_ed TEXT,

  UNIQUE(college_name, state)
    );`
    )

    await pool.query(
        `CREATE TABLE IF NOT EXISTS clg_rank (
    id SERIAL PRIMARY KEY,
    college_id INT REFERENCES colleges(id),
    af_hierarchy TEXT,
      nirf_ranking TEXT,
      college_rank TEXT
    );`
    )

    await pool.query(
        ` CREATE TABLE IF NOT EXISTS exams (
      id SERIAL PRIMARY KEY,
      exam_name VARCHAR UNIQUE NOT NULL
    );`
    )

    await pool.query(
        `CREATE TABLE IF NOT EXISTS categories(
        id SERIAL PRIMARY KEY,
        category_name TEXT UNIQUE NOT NULL
    );`
    )

    await pool.query(
        `CREATE TABLE IF NOT EXISTS quotas (
    id SERIAL PRIMARY KEY,
    quota_name TEXT UNIQUE NOT NULL
    );`
    )

    await pool.query(
        `CREATE TABLE IF NOT EXISTS genders (
    id SERIAL PRIMARY KEY,
    gender_name TEXT UNIQUE NOT NULL
    );`
    )

    await pool.query(
        `CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,

  course_name TEXT NOT NULL,

  program_name TEXT,

  UNIQUE(course_name, program_name)
    );`
    )

    await pool.query(`
CREATE INDEX IF NOT EXISTS idx_college_name
ON colleges(college_name);
`);

    await pool.query(`
CREATE INDEX IF NOT EXISTS idx_course_name
ON courses(course_name);
`);

    await pool.query(`
CREATE INDEX IF NOT EXISTS idx_category_name
ON categories(category_name);
`);
}

masterDB()