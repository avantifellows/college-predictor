import { pool } from "../connection.js";

export const cuttoffs_db = async () => {

    await pool.query(`
CREATE TABLE IF NOT EXISTS josaa_cutoffs (

  id SERIAL PRIMARY KEY,

  college_id INT NOT NULL
  REFERENCES colleges(id)
  ON DELETE CASCADE,

  course_id INT NOT NULL
  REFERENCES courses(id)
  ON DELETE CASCADE,

  exam_id INT NOT NULL
  REFERENCES exams(id)
  ON DELETE CASCADE,

  quota_id INT
  REFERENCES quotas(id)
  ON DELETE SET NULL,

  gender_id INT
  REFERENCES genders(id)
  ON DELETE SET NULL,

  category_id INT
  REFERENCES categories(id)
  ON DELETE SET NULL,

  rank_id INT
  REFERENCES clg_rank(id)
  ON DELETE SET NULL,

  opening_rank INT,

  closing_rank INT,

  seat_type TEXT,

  expected_salary FLOAT,

  salary_tier INT
);
`);

    await pool.query(`
CREATE INDEX IF NOT EXISTS idx_josaa_cutoffs_college_id
ON josaa_cutoffs(college_id);
`);

    await pool.query(`
CREATE INDEX IF NOT EXISTS idx_josaa_cutoffs_course_id
ON josaa_cutoffs(course_id);
`);

    await pool.query(`
CREATE INDEX IF NOT EXISTS idx_josaa_cutoffs_exam_id
ON josaa_cutoffs(exam_id);
`);

    await pool.query(`
CREATE INDEX IF NOT EXISTS idx_josaa_cutoffs_quota_id
ON josaa_cutoffs(quota_id);
`);

    await pool.query(`
CREATE INDEX IF NOT EXISTS idx_josaa_cutoffs_gender_id
ON josaa_cutoffs(gender_id);
`);

    await pool.query(`
CREATE INDEX IF NOT EXISTS idx_josaa_cutoffs_category_id
ON josaa_cutoffs(category_id);
`);

    await pool.query(`
CREATE INDEX IF NOT EXISTS idx_josaa_cutoffs_rank_id
ON josaa_cutoffs(rank_id);
`);

}

cuttoffs_db()