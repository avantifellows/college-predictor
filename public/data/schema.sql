-- colleges
CREATE TABLE colleges (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR UNIQUE,
  name TEXT NOT NULL,
  state VARCHAR,
  college_type VARCHAR,
  management_type VARCHAR,
  af_hierarchy SMALLINT,
  expected_salary BIGINT,
  salary_tier SMALLINT
);

-- Programs 
CREATE TABLE programs (
  id SERIAL PRIMARY KEY,
  college_id INTEGER REFERENCES colleges(id),
  name TEXT,
  duration_years SMALLINT,
  degree_type VARCHAR
);

-- Cutoffs 
CREATE TABLE cutoffs (
  id SERIAL PRIMARY KEY,
  program_id INTEGER REFERENCES programs(id),
  exam VARCHAR,
  seat_type VARCHAR,
  gender VARCHAR,
  quota VARCHAR,
  opening_rank INTEGER,
  closing_rank INTEGER
);