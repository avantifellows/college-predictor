# Futures V2 AFDB Schema Plan

Date: 2026-06-25

Audience: Surya, Amogh, Priyanka

Scope: Futures v2 in AFDB, first launch focused on Engineering + JoSAA. The schema should still leave room for Priyanka's broader vertical data and future counseling sources.

## Read This First

This document is long because it records the schema reasoning, but the working plan is simple:

1. Use AFDB as the eventual product database.
2. Use `external_data_sources` as the raw/source-data layer.
3. Use Amogh's CSVs/prototype data as useful seed/demo/import material, not as a separate product schema.
4. If AFDB migrations are not ready, we can still demo and iterate through CSVs, but those CSVs should be shaped like the AFDB tables below.
5. For v2, focus only on Engineering + JoSAA.

The team does not need to read every table detail first. The most important decisions are:

| Question | Decision |
|---|---|
| Are Amogh's CSVs useful? | Yes. Use them for seed data, demos, parsing logic, and validation. |
| Can we use CSVs before AFDB tables exist? | Yes, if they follow the same table shape and IDs we expect in AFDB. |
| Should CSVs become the product source of truth? | No. They are a temporary fixture/import layer. |
| Do we need a separate Futures database schema? | No. Reuse AFDB tables and add only missing product tables. |
| Is JoSAA an exam? | No. JoSAA is a counseling process. JEE Main/JEE Advanced are exams. |
| What is Priyanka's main role in the schema? | Mapping source college IDs through `college_external_id`. |
| What is Amogh's main role in the schema? | Career content, prototype UX, seed data, and JoSAA parsing assumptions. |
| What is Surya's main role in the schema? | Product behavior, AFDB/db-service migrations, and saved user flows. |

Practical demo rule: if a CSV exists only for quick UI work, name it and structure it like the target AFDB/API table. That lets the UI move now without creating a data-model rewrite later.

## Executive Summary

Futures v2 should use AFDB as the product database. BigQuery `external_data_sources` remains the neutral government/public-data staging and analytics layer. AFDB should hold canonical product entities, curated mappings, user quiz paths, and the cutoff facts needed by the app.

We should not create blanket `futures_*` copies of everything. AFDB already has core tables for `college`, `branch`, `exam`, `exam_occurrence`, `demographic_profile`, and `cutoffs`. We should preserve those tables' existing contracts, extend `cutoffs`, and add narrowly scoped missing tables for verticals, careers, degrees, counseling processes, external ID mappings, and saved user paths.

First launch is JoSAA only, but the model should not bake in "JoSAA = exam". JoSAA is a counseling process using JEE Main and JEE Advanced ranks. Existing `exam` rows are used by portal registration and other systems, so they should continue to mean actual exams.

## Current Inputs

| Input | Location | What It Contains | Product Role | Owner/Context |
|---|---|---|---|---|
| Current college predictor app | `college-predictor` repo | JSON-backed predictor, filters, display fields | Shows current behavior to preserve for v2 | Surya |
| Career quiz standalone | `/Users/surya/Downloads/Avanti Futures - Standalone.html` | Prototype flow: stream -> specialization -> career -> degree -> colleges -> exams -> cutoff reveal -> save path | Defines functional requirements for new tables and joins | Surya |
| Amogh schema draft | `new-table-schemas.txt` | Branch, Exam, College, Cutoffs, Career rough schema | Good top-level entities, not detailed enough for implementation | Amogh |
| Amogh career CSV | `Career_Streams_Engineering_Populated - Sheet1.csv` | 44 engineering career rows with narrative content and pay/recruiter fields | Initial career content; assume publishable for now | Amogh |
| Amogh prototype CSVs and UI | `amogh-csv/`, `/Users/surya/Downloads/table_build_logic.md` | Demo CSVs, JoSAA table-building notes, static prototype UI | Useful as UX fixture and parsing reference if kept aligned to this schema; not a separate source of truth | Amogh |
| Priyanka PDF-derived JSONs | `/Users/surya/Downloads/drive-download-20260625T074825Z-3-001/data_jsons/` | Vertical, degree, specialization, profession, career prospect, college, entrance exam tables and joins | Future broader taxonomy; confirms `vertical` should be first-class | Priyanka |
| external_data_sources PR #23 | `avantifellows/external_data_sources#23` | JoSAA raw neutral cutoff fact and other counseling sources | Neutral BQ source; not the product schema | Amogh / external-data |
| external_data_sources PR #24 | `avantifellows/external_data_sources#24` | AISHE HE Directory raw passthrough tables | Neutral BQ source for college identity and metadata | Amogh / external-data |
| AFDB current schema | remote `prod_af_db` | Existing product DB tables | Product database to extend | Surya / db-service |
| db-service | `/Users/surya/jan2023/db-service` | Phoenix/Ecto schemas, migrations, contexts | Where migrations and API-facing schema changes should happen | Surya |

## Functional Requirements

### Career Quiz

The extracted prototype implements this flow:

| Step | User Action | Data Needed |
|---|---|---|
| Stream | Select broad stream, e.g. Engineering | `vertical` |
| Specialization | Select specialization, e.g. Computer Science | `branch`, `vertical_branch`, possibly `specialization` later |
| Career | View selected career details | `career`, `career_branch` |
| Degree | Pick degree path, e.g. B.Tech / B.E. | `degree`, `branch_degree`, maybe simple for v2 |
| Colleges | Pick or receive 3 colleges | `college`, `college_branch`, `cutoffs`, `college_exam`, ranking/salary fields |
| Exam | Guess/learn which entrance exam applies | `exam`, `counselling_process`, `counselling_process_exam`, `college_exam` |
| Cutoff reveal | Compare guessed rank with actual cutoff | `cutoffs`, `demographic_profile` |
| Save path | Save selected career/path/colleges to account | `student_career_path`, `student_career_path_college`, `user_id` |

### College Predictor

The current predictor needs:

| Need | Current JSON Field Examples | AFDB Equivalent |
|---|---|---|
| Institute display | `Institute`, `State`, `College Type`, `Management Type` | `college` |
| Program display | `Academic Program Name` | `branch.name` or exact JoSAA program branch row |
| Rank filter | `Closing Rank` | `cutoffs.closing_rank` |
| Category/gender filters | `Seat Type`, `Gender`, `Quota` | `demographic_profile`, `cutoffs.quota`, `cutoffs.seat_type` |
| JEE Main vs Advanced split | `Exam` | `exam` + `counselling_process_exam` or rank space on cutoff |
| Salary/NIRF display | `Expected Salary`, `NIRF Rank` | `college.expected_salary`, `college.nirf_ranking`, possibly NIRF-derived fields |

### Editable Content Later

Career, vertical, degree, and exam guide content should be editable later. For now we can store simple content columns. To support later editing without overengineering, include `status`, `source`, and timestamps on content-heavy tables.

## Existing AFDB Tables

These exist today and should be reused.

| Table | Existing Status | Current Role | Keep / Extend | Notes |
|---|---:|---|---|---|
| `college` | ~53k rows | Canonical institution/product college table | Keep, maybe extend later | Has `college_id` unique; many rows look AISHE-coded (`U-*`, `C-*`). Used by `cutoffs`, alumni, candidates. |
| `branch` | ~634 rows | Branch/program hierarchy | Keep and extend carefully | Already has parent-child structure. Parent rows are broad branches; child rows often exact program names. |
| `exam` | 35 rows | Actual exam table used elsewhere | Keep, do not overload | Portal registration resolves planned exams by name. JoSAA should not become an `exam` row unless explicitly needed as type `counselling`, which is not recommended. |
| `exam_occurrence` | 0 rows | Year/session occurrence of an exam | Keep and use | Good place for yearly form/test dates and fee metadata. |
| `demographic_profile` | ~167 rows | Category/gender/PwD/state-like profile combinations | Keep and possibly normalize later | Already contains JoSAA-like and state-category combinations. |
| `cutoffs` | 0 rows | Intended cutoff facts | Extend in-place | User requested extend this table, not create replacement. |

## Existing Table Details And Proposed Changes

### `college`

| Column | Existing? | Proposed Type | Purpose | Functional Use | Source / Owner |
|---|---:|---|---|---|---|
| `id` | Yes | bigint PK | Internal AFDB key | Joins from cutoffs, saved paths | Existing |
| `college_id` | Yes | string unique | Current external/canonical code | Existing product identity | Existing, likely AISHE for many rows |
| `name` | Yes | string | Display name | Predictor and quiz college display | Existing |
| `state` | Yes | string | Location | Filters/display | AISHE / existing |
| `district` | Yes | string | Location | Filters/display | AISHE / existing |
| `address` | Yes | string | Address | College profile | Existing |
| `gender_type` | Yes | string | College gender type | Future filters | Existing |
| `college_type` | Yes | string | Product college type | Display/filter | Existing / Amogh |
| `management_type` | Yes | string | Product management type | Display/filter | Existing / AISHE-derived |
| `year_established` | Yes | integer | Establishment year | College profile | AISHE |
| `affiliated_to` | Yes | string | Parent university text | College profile | Existing / AISHE |
| `tuition_fee` | Yes | decimal | Fee | College profile/filter | Existing |
| `tuition_fees_annual` | Yes | float | Annual fee | College finder budget | Existing / Amogh? |
| `af_hierarchy` | Yes | decimal | Avanti ranking/priority | Sorting/recommendation | Existing product |
| `expected_salary` | Yes | decimal | Expected salary | Predictor display/sort | Existing / NIRF-derived |
| `salary_tier` | Yes | string | Salary tier | Ranking/display | Existing product |
| `qualifying_exam` | Yes | string | Old free-text exam | Legacy display only | Should not be primary join |
| `nirf_ranking` | Yes | integer | NIRF rank | Predictor display | NIRF / existing |
| `top_200_nirf` | Yes | boolean | NIRF flag | Ranking/filter | NIRF / existing |
| `placement_rate` | Yes | float | Placement rate | College profile | NIRF aggregate |
| `median_salary` | Yes | float | Median salary | College profile | NIRF aggregate |
| `entrance_test` | Yes | int[] | Existing exam id array | Legacy/use with caution | Prefer `college_exam` |
| `inserted_at`, `updated_at` | Yes | timestamps | Audit | All | Existing |

Recommended additions to `college` are minimal. Prefer `college_external_id` and `college_exam` join tables instead of adding many source-specific columns.

Optional future additions:

| Column | Type | Why Optional |
|---|---|---|
| `canonical_name` | string | Useful if `name` remains source-like. Not required if `name` is already curated. |
| `display_name_short` | string | Useful for UI cards, not needed for launch. |
| `hostel_available` | boolean | Quiz asks hostel/home, but data quality is uncertain. Add only if sourced. |
| `city` | string | Priyanka JSON has city; AFDB has district/state but not city. Useful for local college finder. |
| `website` | string | Priyanka/AISHE have website. Existing `college` does not show it in current schema sample. |

### `branch`

| Column | Existing? | Proposed Type | Purpose | Functional Use | Source / Owner |
|---|---:|---|---|---|---|
| `id` | Yes | bigint PK | Internal AFDB key | Cutoff and career joins | Existing |
| `branch_id` | Yes | string indexed | Stable branch code | Imports and references | Existing |
| `name` | Yes | string | Branch/program display | Quiz/predictor program display | Existing / JoSAA |
| `duration` | Yes | integer | Duration in years | Degree path display | Existing but underused |
| `parent_branch_id` | Yes | FK to branch | Branch hierarchy | Career mapping by parent cluster | Existing |
| `inserted_at`, `updated_at` | Yes | timestamps | Audit | All | Existing |

Recommended extensions:

| Column | Type | Purpose | Functional Use | Notes |
|---|---|---|---|---|
| `branch_group` | string | Broad area: engineering, medicine, design, science | Stream/vertical mapping, filters | For v2 this can be `engineering` for JoSAA rows. |
| `degree_label` | string | Human label parsed from program, e.g. B.Tech, B.Arch, Dual Degree | Degree path and predictor display | Keep simple for v2. |
| `specialization` | string nullable | Clean specialization, e.g. Computer Science | Career/branch matching | Can be populated gradually. |
| `source_program_name` | string nullable | Original exact JoSAA program string | Audit/import traceability | Useful if `name` becomes normalized later. |

Alternative: put specialization and degree in join tables. For v2, extending `branch` is acceptable because `branch` already owns program hierarchy.

### `exam`

Existing table should continue to mean actual exams.

| Column | Existing? | Type | Purpose | Functional Use | Notes |
|---|---:|---|---|---|---|
| `id` | Yes | bigint PK | Exam ID | Portal registration, resources, test rules, Futures | Existing |
| `name` | Yes | string required | Exam name | Registration lookups, UI | Do not rename existing rows lightly. |
| `counselling_body` | Yes | string | Existing optional metadata | Can keep | Not enough for JoSAA model. |
| `type` | Yes | string | Existing optional metadata | Can use for broad classification | Be careful with existing consumers. |
| `inserted_at`, `updated_at` | Yes | timestamps | Audit | All | Existing |

Potential small extensions:

| Column | Type | Purpose | Notes |
|---|---|---|---|
| `abbreviation` | string | Display/search, e.g. JEE Main | Priyanka has abbreviations. Could be useful. |
| `website` | string | Exam profile | Priyanka has websites. |
| `eligibility_summary` | text | Exam page content | Editable later. |

Do not add JoSAA as an exam for v2. Add `counselling_process`.

### `exam_occurrence`

Use for yearly editable exam metadata.

| Column | Existing? | Type | Purpose | Functional Use |
|---|---:|---|---|---|
| `id` | Yes | bigint PK | Internal occurrence ID | Cutoff joins, exam pages |
| `exam_id` | Yes | FK to `exam` | Which exam | JEE Main/JEE Advanced yearly data |
| `year` | Yes | integer | Exam year | Filters |
| `exam_session` | Yes | integer | Session number | JEE Main sessions |
| `registration_end_date` | Yes | string | Existing registration date field | Exam guide |
| `session_date` | Yes | string | Existing test date field | Exam guide |
| `inserted_at`, `updated_at` | Yes | timestamps | Audit | All |

Recommended extensions:

| Column | Type | Purpose | Functional Use |
|---|---|---|---|
| `registration_start_date` | date nullable | Form opening | Exam page |
| `registration_end_at` | timestamp nullable | Better typed date | Exam page/notifications |
| `exam_start_date` | date nullable | Test window start | Exam page |
| `exam_end_date` | date nullable | Test window end | Exam page |
| `result_date` | date nullable | Result date | Exam page |
| `form_fee` | numeric nullable | Form fee | Exam page |
| `exam_fee` | numeric nullable | Exam fee if separate | Exam page |
| `official_url` | string nullable | Source link | Audit/UI |
| `source` | string nullable | Source of metadata | Priyanka/Amogh/manual |

### `demographic_profile`

Keep current table. It can represent JoSAA seat type/gender combinations if populated consistently.

| Column | Existing? | Type | Purpose | JoSAA Use |
|---|---:|---|---|---|
| `id` | Yes | bigint PK | Internal profile ID | Cutoff FK |
| `category` | Yes | string | Display/category code | OPEN, EWS, OBC-NCL, SC, ST, PwD variants |
| `gender` | Yes | string | Gender pool | Gender-Neutral, Female-only |
| `caste` | Yes | string | Normalized caste | OPEN/OBC/SC/ST |
| `physically_handicapped` | Yes | boolean | PwD flag | Seat type variants |
| `family_income` | Yes | string | Income | Future scholarships |
| `religion` | Yes | string | Religion | Future minority quotas |
| `defence_ward` | Yes | string | Defence ward | Future state counseling |
| `nationality` | Yes | string | Nationality | Future |
| `ews_ward` | Yes | string | EWS | Future |
| `language` | Yes | string | Language | KCET-like future |
| `urban_rural` | Yes | boolean | Rural/urban | KCET-like future |
| `region` | Yes | string | Region/state/category context | State counseling future |

Potential extension:

| Column | Type | Purpose |
|---|---|---|
| `source_code` | string | Original source category code, e.g. JoSAA seat type or MHT category key. |
| `source` | string | JoSAA/MHTCET/KCET/etc. |

### `cutoffs`

Extend this table in-place.

Existing columns:

| Column | Existing? | Type | Current Purpose |
|---|---:|---|---|
| `id` | Yes | bigint PK | Internal cutoff row |
| `cutoff_year` | Yes | integer | Year |
| `exam_occurrence_id` | Yes | FK | Exam occurrence |
| `college_id` | Yes | FK to `college` | College |
| `degree` | Yes | string | Degree free text |
| `branch_id` | Yes | FK to `branch` | Program/branch |
| `demographic_profile_id` | Yes | FK | Category/gender profile |
| `state_quota` | Yes | string | Existing quota text |
| `opening_rank` | Yes | integer | Opening rank |
| `closing_rank` | Yes | integer | Closing rank |
| `inserted_at`, `updated_at` | Yes | timestamps | Audit |

Recommended added columns:

| Column | Type | Required? | Purpose | Functional Use | Source / Context |
|---|---|---:|---|---|---|
| `counselling_process_id` | FK to `counselling_process` | Yes for new rows | JoSAA vs future MCC/KCET/etc. | Predictor knows which counseling rules apply | Amogh/Surya |
| `round` | integer | Yes for JoSAA rows | Counseling round | Latest/final-round filtering | PR #23 JoSAA |
| `quota` | string | Yes for JoSAA | Source quota: AI, HS, OS, GO, JK, LA | Home-state logic | JoSAA |
| `seat_type` | string | Yes for JoSAA | Source seat category: OPEN, EWS, etc. | Category filtering | JoSAA |
| `gender_pool` | string | Yes for JoSAA | Gender-Neutral / Female-only | Gender filtering | JoSAA |
| `rank_space` | string | Yes | JEE_MAIN, JEE_ADVANCED, NEET_AIR, STATE_RANK, MARKS | Prevents mixing rank scales | JoSAA/product |
| `cutoff_metric` | string | Yes | rank, marks, percentile | Future non-rank sources | Surya |
| `opening_is_preparatory` | boolean default false | No | JoSAA prep rank flag | Correct filtering | PR #23 JoSAA |
| `closing_is_preparatory` | boolean default false | No | JoSAA prep rank flag | Correct filtering | PR #23 JoSAA |
| `source` | string | Yes | Source label, e.g. `external_data_sources.josaa_fact_cutoffs` | Audit/imports | external_data_sources |
| `source_row_hash` | string | Yes | Deterministic source row identity | Idempotent import/dedupe | Surya |
| `is_active` | boolean default true | No | Allows soft deprecating rows | Refreshes | Surya |

Recommended indexes/constraints:

| Index / Constraint | Columns | Purpose |
|---|---|---|
| Unique source row | `source`, `source_row_hash` | Idempotent import from BQ/external sources. |
| Product query index | `counselling_process_id`, `cutoff_year`, `college_id`, `branch_id`, `demographic_profile_id` | Predictor and quiz cutoff lookup. |
| JoSAA lookup index | `cutoff_year`, `round`, `quota`, `seat_type`, `gender_pool`, `rank_space` | Current behavior and latest-round filtering. |
| College/program index | `college_id`, `branch_id` | College profile and career path college selection. |

## New Tables

### `vertical`

First-class taxonomy above branch/career. Priyanka's JSON has 22 verticals.

| Column | Type | Required | Purpose | Functional Use | Source / Owner |
|---|---|---:|---|---|---|
| `id` | bigint PK | Yes | Internal ID | Joins | AFDB |
| `name` | string | Yes | Vertical name | Stream picker, pages | Priyanka |
| `description` | text | No | Vertical overview | Career/vertical pages | Priyanka |
| `stream_required` | string | No | PCM/PCB/etc. | Guidance content | Priyanka |
| `maths_compulsory` | boolean | No | Math requirement | Guidance filters | Priyanka |
| `status` | string | Yes | draft/published/archived | Editable later | Surya |
| `source` | string | No | Source label | Audit | Priyanka/PDF |
| `inserted_at`, `updated_at` | timestamps | Yes | Audit | AFDB |

Functional use:

| Product Surface | Use |
|---|---|
| Career quiz | Stream picker. For v2, Engineering can be one published vertical. |
| Careers pages | Browse by vertical. |
| Future non-engineering expansion | Architecture, medicine, design, agriculture, law, commerce, etc. |

### `vertical_branch`

Maps verticals to AFDB branches.

| Column | Type | Required | Purpose |
|---|---|---:|---|
| `id` | bigint PK | Yes | Internal ID |
| `vertical_id` | FK to `vertical` | Yes | Vertical |
| `branch_id` | FK to `branch` | Yes | Branch/program cluster |
| `is_primary` | boolean default false | No | Main branch for vertical |
| `source` | string | No | Priyanka/Amogh/manual |
| timestamps | timestamps | Yes | Audit |

Constraint: unique `vertical_id`, `branch_id`.

Functional use:

| Product Surface | Use |
|---|---|
| Career quiz | Stream/specialization to branch choices. |
| College predictor | Filter programs by vertical. |
| Future vertical pages | List courses/branches under a vertical. |

### `career`

Career/profession content. For v2, seed from Amogh's engineering career CSV, optionally mapping Priyanka `professions` later.

| Column | Type | Required | Purpose | Source / Owner |
|---|---|---:|---|---|
| `id` | bigint PK | Yes | Internal ID | AFDB |
| `slug` | string unique | Yes | URL/key | Surya |
| `name` | string | Yes | Career display name | Amogh |
| `vertical_id` | FK to `vertical` | No | Broad vertical | Priyanka/Amogh |
| `day_in_the_life` | text | No | Career profile content | Amogh CSV |
| `real_world_impact` | text | No | Career profile content | Amogh CSV |
| `entry_exams_text` | text | No | Human-readable exam list | Amogh CSV |
| `top_colleges_text` | text | No | Human-readable colleges | Amogh CSV |
| `pay_entry_lpa` | string | No | Entry pay display | Amogh CSV |
| `pay_mid_lpa` | string | No | Mid pay display | Amogh CSV |
| `pay_senior_lpa` | string | No | Senior pay display | Amogh CSV |
| `top_recruiters` | text | No | Recruiter content | Amogh CSV |
| `stability_outlook` | string | No | High/Medium/Low | Amogh CSV |
| `automation_risk` | string | No | High/Medium/Low | Amogh CSV |
| `geo_flexibility` | string | No | Location flexibility | Amogh CSV |
| `notable_practitioners` | text | No | People content | Amogh CSV |
| `sources` | text | No | Source notes | Amogh CSV |
| `status` | string | Yes | draft/published/archived | Editable later |
| `content_source` | string | No | ai_generated/pdf/manual | Surya |
| timestamps | timestamps | Yes | Audit | AFDB |

Functional use:

| Product Surface | Use |
|---|---|
| Career quiz | Career detail step and final path. |
| Careers page | Career profile pages. |
| Recommendation engine | Match subjects/interests to careers through mappings. |

### `career_branch`

Maps career to branch clusters.

| Column | Type | Required | Purpose |
|---|---|---:|---|
| `id` | bigint PK | Yes | Internal ID |
| `career_id` | FK to `career` | Yes | Career |
| `branch_id` | FK to `branch` | Yes | Branch cluster or exact program |
| `relevance_weight` | numeric | No | Ranking strength |
| `is_primary` | boolean default false | No | Main branch |
| `source` | string | No | Amogh/manual/Priyanka |
| timestamps | timestamps | Yes | Audit |

Constraint: unique `career_id`, `branch_id`.

Functional use:

| Product Surface | Use |
|---|---|
| Career quiz | Career -> eligible JoSAA branches/programs. |
| College recommendation | Find colleges offering relevant branches. |
| Career profile | "Courses that lead here". |

### `degree`

For v2 this can be simple. Priyanka's `degrees.json` has 105 degrees and can seed this later.

| Column | Type | Required | Purpose | Source |
|---|---|---:|---|---|
| `id` | bigint PK | Yes | Internal ID | AFDB |
| `name` | string | Yes | Full degree name | Priyanka/Amogh |
| `abbreviation` | string | No | B.Tech, B.E., B.Arch | Priyanka |
| `duration_years` | numeric | No | Duration | Priyanka/JoSAA parsing |
| `degree_type` | string | No | Bachelor/Master/Dual | Priyanka |
| `eligibility` | text | No | Eligibility content | Priyanka |
| `status` | string | Yes | draft/published/archived | Editable later |
| timestamps | timestamps | Yes | Audit | AFDB |

Functional use:

| Product Surface | Use |
|---|---|
| Career quiz | Degree path step. |
| Branch pages | Show degree options. |
| Future non-JoSAA | B.Sc, B.Des, B.Arch, MBBS, etc. |

### `branch_degree`

Maps branch/program clusters to degrees.

| Column | Type | Required | Purpose |
|---|---|---:|---|
| `id` | bigint PK | Yes | Internal ID |
| `branch_id` | FK to `branch` | Yes | Branch |
| `degree_id` | FK to `degree` | Yes | Degree |
| `source` | string | No | JoSAA parser/manual/Priyanka |
| timestamps | timestamps | Yes | Audit |

Constraint: unique `branch_id`, `degree_id`.

### `college_external_id`

This is essential for joining AFDB product colleges to AISHE, NIRF, JoSAA, KCET, and future sources.

| Column | Type | Required | Purpose | Source / Owner |
|---|---|---:|---|---|
| `id` | bigint PK | Yes | Internal ID | AFDB |
| `college_id` | FK to `college` | Yes | Canonical college | AFDB |
| `source` | string | Yes | AISHE/NIRF/JOSAA/KCET/MCC/etc. | Priyanka |
| `source_key` | string | Yes | Source ID or stable key | external_data_sources |
| `source_name` | string | No | Name as seen in source | external_data_sources |
| `match_confidence` | numeric | No | 0-1 confidence | Priyanka |
| `match_method` | string | No | exact/manual/fuzzy/heuristic | Priyanka |
| `is_primary` | boolean default false | No | Primary mapping for source | Priyanka |
| `notes` | text | No | Human review notes | Priyanka |
| timestamps | timestamps | Yes | Audit | AFDB |

Constraints:

| Constraint | Purpose |
|---|---|
| unique `source`, `source_key` where `is_primary = true` | One canonical college per source key. |
| index `college_id`, `source` | Fast college profile joins. |

Functional use:

| Product Surface | Use |
|---|---|
| JoSAA import | Map raw JoSAA institute strings to canonical `college.id`. |
| College profile | Show AISHE/NIRF/NAAC metadata. |
| Priyanka workflow | "Connecting the college ids" lives here. |
| external_data_sources relation | This is AFDB's curated bridge from BQ source tables to product entities. |

### `college_exam`

Normalized college-to-exam eligibility/entry route. This replaces or complements `college.entrance_test`.

| Column | Type | Required | Purpose | Source |
|---|---|---:|---|---|
| `id` | bigint PK | Yes | Internal ID | AFDB |
| `college_id` | FK to `college` | Yes | College | AFDB |
| `exam_id` | FK to `exam` | Yes | Exam | Priyanka/current |
| `degree_id` | FK to `degree` | No | Degree-specific exam route | Priyanka |
| `branch_id` | FK to `branch` | No | Branch-specific exam route | JoSAA/product |
| `admission_process` | string | No | Human text, e.g. JoSAA/BITSAT | Priyanka |
| `source` | string | No | Priyanka/manual/import | Audit |
| timestamps | timestamps | Yes | Audit | AFDB |

Constraint: unique nullable-friendly constraint may need implementation as indexes. At minimum index `college_id`, `exam_id`.

Functional use:

| Product Surface | Use |
|---|---|
| Career quiz exam step | "Which exam gets you into this college?" |
| College pages | Entrance exams accepted. |
| Exam pages | Colleges accepting exam. |

### `counselling_process`

Separates counseling/allotment from exams.

| Column | Type | Required | Purpose | Examples |
|---|---|---:|---|---|
| `id` | bigint PK | Yes | Internal ID | |
| `name` | string | Yes | Display name | JoSAA |
| `slug` | string unique | Yes | Stable key | `josaa` |
| `conducting_body` | string | No | Body | Joint Seat Allocation Authority |
| `scope` | string | No | national/state/private | national |
| `website` | string | No | Official URL | josaa.nic.in |
| `description` | text | No | Product content | |
| `status` | string | Yes | active/inactive/draft | active |
| timestamps | timestamps | Yes | Audit | |

Functional use:

| Product Surface | Use |
|---|---|
| Predictor | Apply JoSAA-specific quota/rank rules. |
| Cutoff import | Source/process FK for cutoffs. |
| Future expansion | MCC, KCET, MHT CET CAP, TNEA, etc. |

### `counselling_process_exam`

Maps counseling process to the exams/rank spaces it consumes.

| Column | Type | Required | Purpose |
|---|---|---:|---|
| `id` | bigint PK | Yes | Internal ID |
| `counselling_process_id` | FK | Yes | Process |
| `exam_id` | FK to `exam` | Yes | Exam |
| `rank_space` | string | Yes | JEE_MAIN/JEE_ADVANCED |
| `applies_to` | string | No | IIT / NIT-IIIT-GFTI / all |
| timestamps | timestamps | Yes | Audit |

For JoSAA:

| Process | Exam | Rank Space | Applies To |
|---|---|---|---|
| JoSAA | JEE Advanced | JEE_ADVANCED | IIT |
| JoSAA | JEE Main | JEE_MAIN | NIT/IIIT/GFTI |

### `college_branch`

Optional but useful product table: colleges offering branches/program clusters.

| Column | Type | Required | Purpose |
|---|---|---:|---|
| `id` | bigint PK | Yes | Internal ID |
| `college_id` | FK to `college` | Yes | College |
| `branch_id` | FK to `branch` | Yes | Branch/program |
| `degree_id` | FK to `degree` | No | Degree |
| `source` | string | No | JoSAA/cutoffs/manual |
| timestamps | timestamps | Yes | Audit |

This can be derived from `cutoffs`, so it is optional for launch. If college pages need fast "programs offered", materializing it helps.

### `quiz_subject`

Supports "I don't know yet" path from the prototype.

| Column | Type | Required | Purpose |
|---|---|---:|---|
| `id` | bigint PK | Yes | Internal ID |
| `name` | string unique | Yes | Subject label |
| `status` | string | Yes | active/inactive |
| timestamps | timestamps | Yes | Audit |

Seed examples: Maths, Physics, Chemistry, Biology, Coding / CS, Economics, English & Lang., Art & Design, Social Studies.

### `career_subject_affinity`

Stores career recommendation weights from subject interest.

| Column | Type | Required | Purpose |
|---|---|---:|---|
| `id` | bigint PK | Yes | Internal ID |
| `career_id` | FK to `career` | Yes | Career |
| `quiz_subject_id` | FK to `quiz_subject` | Yes | Subject |
| `weight` | numeric | Yes | Affinity score |
| `source` | string | No | Prototype/manual |
| timestamps | timestamps | Yes | Audit |

Functional use:

| Product Surface | Use |
|---|---|
| Career quiz | Computes 5 best-fit careers from subject picks. |

### `student_career_path`

Saved path for logged-in users. User requested attach to `user`, because user id is primary. Guests may use the quiz without persistence; if they later create an account, save against that created user.

| Column | Type | Required | Purpose |
|---|---|---:|---|
| `id` | bigint PK | Yes | Internal ID |
| `user_id` | FK to `user` | Yes | Account owner |
| `vertical_id` | FK to `vertical` | No | Chosen stream |
| `career_id` | FK to `career` | Yes | Chosen/recommended career |
| `degree_id` | FK to `degree` | No | Chosen degree path |
| `branch_id` | FK to `branch` | No | Chosen branch/specialization |
| `source` | string | Yes | quiz/manual/import |
| `status` | string | Yes | active/archived |
| `metadata` | jsonb | No | Non-critical quiz state, e.g. subject order |
| timestamps | timestamps | Yes | Audit |

Functional use:

| Product Surface | Use |
|---|---|
| Career quiz | Save full mapped path. |
| User dashboard | Resume saved path. |
| Counseling ops | Understand student interests. |

### `student_career_path_college`

Target colleges inside a saved path.

| Column | Type | Required | Purpose |
|---|---|---:|---|
| `id` | bigint PK | Yes | Internal ID |
| `student_career_path_id` | FK | Yes | Parent saved path |
| `college_id` | FK to `college` | Yes | Target college |
| `branch_id` | FK to `branch` | No | Target branch/program |
| `exam_id` | FK to `exam` | No | Relevant exam |
| `counselling_process_id` | FK | No | JoSAA |
| `rank_guess` | integer | No | User's guessed rank |
| `demographic_profile_id` | FK | No | Category/gender profile used |
| `actual_cutoff_id` | FK to `cutoffs` | No | Cutoff row shown |
| `position` | integer | No | 1, 2, 3 in quiz |
| timestamps | timestamps | Yes | Audit |

Functional use:

| Product Surface | Use |
|---|---|
| Career quiz | Save target colleges and cutoff reveals. |
| User dashboard | Show selected colleges. |
| Analytics | Compare guesses vs actual cutoffs. |

## Relationship To Priyanka's JSON Tables

| Priyanka JSON | Proposed AFDB Table | Import Scope For Engineering v2 |
|---|---|---|
| `verticals.json` | `vertical` | Import Engineering-relevant verticals first; keep IDs in import logs, not necessarily as AFDB IDs. |
| `specializations.json` | Could map to `branch.specialization` or future `specialization` table | For v2, use `branch.specialization` only if needed. |
| `degrees.json` | `degree` | Import B.Tech/B.E./B.Arch-like relevant rows first. |
| `entrance_exams.json` | `exam` plus optional columns | Map to existing `exam` by name/abbreviation; do not duplicate existing rows. |
| `colleges.json` | `college`, `college_external_id` | Do not blindly import as new colleges; match to existing `college`. |
| `professions.json` | `career` or future `profession` | For now, Amogh career CSV seeds `career`; Priyanka professions can later enrich/map. |
| `career_prospects.json` | future `career_prospect` or `career` tags | Not needed for JoSAA v2. |
| `vertical_colleges.json` | `college_branch` or `vertical_college` if needed | Useful for future college finder; not critical if cutoffs drive JoSAA. |
| `vertical_degrees.json` | `vertical_degree` or derived via `vertical_branch` + `branch_degree` | Optional; can add if vertical pages need degree lists. |
| `vertical_entrance_exams.json` | `counselling_process_exam`, `college_exam`, or `vertical_exam` | Useful for future vertical pages. For v2, JoSAA mapping is enough. |
| `college_entrance_exams.json` | `college_exam` | Good to import after college/exam ID matching. |
| `vertical_professions.json` | `career.vertical_id` or `career_branch` | Use later. |
| `vertical_specializations.json` | `vertical_branch` / future `vertical_specialization` | Use later. |

Recommendation: do not copy Priyanka's numeric IDs as AFDB primary keys. Store them in import metadata or source mapping if needed.

## Relationship To Amogh's Draft

| Amogh Draft Entity | Keep? | Change |
|---|---:|---|
| Branch | Yes | Use existing `branch`, extend with group/degree/specialization fields, and add mapping tables. |
| Exam | Yes | Use existing `exam` for actual exams. Add `counselling_process` for JoSAA. Add annual metadata in `exam_occurrence`. |
| College | Yes | Use existing `college`. Add external ID mapping table rather than assuming AISHE joins everything. |
| Cutoffs | Yes | Extend existing `cutoffs` with JoSAA grain and source fields. |
| Career | Yes | Add new `career` table seeded from CSV, plus `career_branch` map. |

Key correction: "AISHE code = college ID" is useful but not sufficient. JoSAA and NIRF do not join perfectly on AISHE. Use `college_external_id`.

### Relationship To Amogh's Prototype CSVs

Amogh's CSVs and prototype UI are acceptable as a quick demo layer only if they remain downstream of the schema decisions in this document. They should not become a second product data model.

| Prototype Artifact | Keep? | How To Use |
|---|---:|---|
| `table_build_logic.md` | Yes | Use as a reference for JoSAA program parsing, branch grouping, and demo-table generation logic. Convert useful logic into reviewed import code later. |
| `branch.csv` | Yes, as fixture | Compare against existing AFDB `branch`; do not copy generated `branch_id` values blindly. |
| `college.csv` | Yes, as fixture | Use for UI demos and mapping review. Canonical product rows remain in AFDB `college`; source identities go through `college_external_id`. |
| `cutoffs.csv` | Yes, as fixture | Useful for prototype cutoff reveal. Product import must preserve year, round, rank space, source, source hash, and JoSAA-specific flags in `cutoffs`. |
| `exam.csv` | Use carefully | Treat as content/reference for actual exams only. Do not let it redefine existing AFDB `exam` rows or model JoSAA as an exam. |
| `career.csv` / populated career sheet | Yes | Seed `career` and `career_branch` after content review and branch mapping. |
| Static prototype UI | Yes | Valid for UX review. The product UI should eventually read AFDB/API-shaped data, even if the first demo uses generated fixtures. |

Rule of thumb: CSVs can help Amogh and the team see the product quickly, but AFDB remains the contract. If a CSV column is useful, map it to one of the AFDB tables above; if it cannot be mapped cleanly, that is a schema/import question, not a reason to create a parallel data path.

## Relationship To external_data_sources

external_data_sources is not the product schema. It is the neutral source-data layer in BigQuery.

| external_data_sources Table | AFDB Use |
|---|---|
| `josaa_fact_cutoffs` | Import into `cutoffs` after mapping JoSAA `institute` to `college.id`, `academic_program_name` to `branch.id`, and seat dimensions to `demographic_profile`. |
| `aishe_fact_colleges` | Source for `college` metadata and `college_external_id` mappings. |
| `aishe_fact_universities` | Source for university-type `college` rows and parent university metadata. |
| `aishe_fact_standalone_institutions` | Future source for standalone technical institutes. |
| `nirf_fact_rankings` | Source for `college.nirf_ranking`, `top_200_nirf`, and external NIRF IDs. |
| `nirf_fact_aggregate` | Source for salary/placement/intake fields. |
| future `kcet`/state sources | Future cutoff imports into `cutoffs` using `counselling_process`. |

Import principle:

1. BQ stores source facts as published.
2. AFDB stores product-ready canonical records.
3. `college_external_id` records how each source row maps to product college.
4. `source` and `source_row_hash` in `cutoffs` make imports idempotent.

## Stress Test And Duplication Checks

This section is meant to prevent the main failure mode: slightly different concepts getting stored twice because they look similar during a demo.

| Concern | Decision | Why |
|---|---|---|
| Entrance test vs qualifying exam | Treat existing `college.entrance_test` and `college.qualifying_exam` as legacy/display fields. New logic should use `college_exam`. | Avoids joining product behavior to free-text or array fields that already have unclear semantics. |
| Exam vs counseling | `exam` means the test a student writes. `counselling_process` means the allotment process that consumes ranks. | Keeps JEE Main/JEE Advanced separate from JoSAA, and protects existing portal registration usage of `exam`. |
| Degree on `branch` vs `degree` table | `branch.degree_label` may be a simple parsed display field; `degree` and `branch_degree` are the normalized path. | Allows quick JoSAA display without blocking future B.Sc/B.Des/MBBS style expansion. |
| `college_branch` vs `cutoffs` | `college_branch` is optional/materialized. For JoSAA v2 it can be derived from cutoff/program data. | Prevents maintaining duplicate "programs offered" facts unless UI performance or profile pages need it. |
| Career vs profession | Use `career` for v2. Priyanka's broader `professions` can map/enrich later. | Keeps launch focused on the engineering career quiz without prematurely splitting content types. |
| Source IDs vs product IDs | Keep AFDB internal IDs canonical; store AISHE/JoSAA/NIRF/KCET IDs in `college_external_id`. | Makes Priyanka's mapping work explicit and avoids assuming one source ID joins everything. |
| Annual refreshes | Store year, round/session, source, and source-row identity on changing facts. | Fees, dates, cutoffs, and rankings change; imports must be repeatable and auditable. |

Product flow check:

| Flow | Required Join Path |
|---|---|
| Career quiz stream -> specialization | `vertical` -> `vertical_branch` -> `branch` |
| Specialization -> careers | `branch` -> `career_branch` -> `career` |
| Career -> degree options | `career_branch.branch_id` -> `branch_degree` -> `degree` |
| Career/branch -> colleges | `branch` -> `cutoffs` -> `college`, optionally materialized through `college_branch` |
| College -> relevant exam | `college_exam` and/or `counselling_process_exam` depending on whether the question is "accepted exam" or "rank space used for this counseling process" |
| Rank reveal | `cutoffs` filtered by year/latest round, counseling process, college, branch, quota, seat type, gender pool, and rank space |
| Save path | `student_career_path` -> `student_career_path_college`, attached to `user_id` when the student has an account |

If a proposed table or CSV cannot be placed in one of these paths, pause before adding it. It may be content, a fixture, a source table, or a future feature rather than a product table needed for v2.

## Launch Plan: Engineering + JoSAA Only

### Minimum Tables Needed For V2

| Table | Existing/New | Launch Requirement |
|---|---|---|
| `college` | Existing | Required |
| `branch` | Existing + extend | Required |
| `exam` | Existing | Required |
| `exam_occurrence` | Existing + maybe extend | Required if cutoffs need occurrence FK |
| `demographic_profile` | Existing | Required |
| `cutoffs` | Existing + extend | Required |
| `vertical` | New | Required for quiz stream |
| `career` | New | Required for quiz |
| `career_branch` | New | Required for career -> JoSAA programs |
| `degree` | New | Useful; keep simple |
| `branch_degree` | New | Useful; can be minimal |
| `counselling_process` | New | Required to model JoSAA correctly |
| `counselling_process_exam` | New | Required to distinguish JEE Main vs Advanced rank space |
| `college_external_id` | New | Required for durable imports/mapping |
| `student_career_path` | New | Required for save path |
| `student_career_path_college` | New | Required for saving selected colleges/cutoffs |

### Can Defer

| Table / Feature | Reason To Defer |
|---|---|
| Full Priyanka vertical import | Launch is engineering only. |
| Full `specialization` table | Existing `branch` can carry enough for v2. |
| Hostel/distance fields | Data quality uncertain. |
| Non-JoSAA counseling sources | Launch is JoSAA only. |
| Full CMS/versioning | Add `status/source` now; full revision history later. |
| Career prospects/professions split | Amogh career CSV is enough for v2 content. |

## Open Decisions

| Decision | Recommendation |
|---|---|
| Use `futures_*` prefix? | No blanket prefix. Add concept-specific tables in AFDB. |
| Extend `cutoffs` or create new table? | Extend `cutoffs` in-place, as requested. |
| Actual exam vs counseling process? | Keep separate. JoSAA is `counselling_process`, JEE Main/Advanced are `exam`. |
| Save guest quiz paths? | Do not persist anonymous guest paths initially. Save when user account exists. |
| Career content editable later? | Include `status`, `source`, timestamps now. Build full CMS later. |
| Degree path complexity? | Keep simple for engineering v2; use `degree` + `branch_degree`. |
| Latest round vs max closing rank | Preserve current Futures behavior in query/import logic. Store enough raw dimensions to support either. |

## Suggested Migration Sequence In db-service

1. Extend `cutoffs` with JoSAA/source columns and indexes.
2. Add `counselling_process` and `counselling_process_exam`.
3. Add `vertical`, `career`, `career_branch`.
4. Add `degree`, `branch_degree`.
5. Add `college_external_id`, `college_exam`.
6. Add `student_career_path`, `student_career_path_college`.
7. Extend Ecto schemas and contexts in `db-service`.
8. Seed minimal Engineering/JoSAA rows.
9. Import JoSAA cutoffs from BQ after college and branch mappings are ready.

## Practical Notes For The Three Workstreams

| Person | Main Workstream | Schema Touchpoints |
|---|---|---|
| Priyanka | Connect college IDs across AISHE, JoSAA, KCET/future sources | `college_external_id`, maybe `college_exam`, later broader vertical imports |
| Amogh | Career/branch/exam/college content and JoSAA parsing assumptions | `career`, `career_branch`, `branch`, `degree`, `cutoffs` import mapping |
| Surya | Product behavior, AFDB/db-service migrations, saved user flows | `cutoffs`, `student_career_path`, `counselling_process`, existing `exam` compatibility |

## Final Recommendation

Treat AFDB as the Futures v2 product database, but keep it canonical and cautious:

- Existing shared tables stay shared.
- `cutoffs` gets extended because it is already the intended fact table.
- JoSAA is modeled as counseling, not as an exam.
- Career quiz gets first-class `career`, `vertical`, `degree`, and saved-path tables.
- Priyanka's source ID work lands in `college_external_id`.
- external_data_sources remains the source-of-truth staging layer; AFDB stores curated product-ready records and mappings.
