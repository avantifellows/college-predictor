# Research spec: exam / recruitment records for Futures (Avanti Fellows)

Futures is a free site that helps low-income Class 11-12 students in India plan
what comes after school. Its Exams tab lists entrance exams; we are adding
government recruitment exams and a few missing entrance exams. Every figure must
come from a page you actually opened. Never fill a value from memory. If you
cannot find a value, leave it empty ("") and say why in `notes`. Wrong data is
far worse than missing data.

Today is 25 Nov 2026. Use the latest completed cycle (2026, else 2025) and say
which.

## Output

Write ONE JSON file (path given in your task): a list of records, one per exam.
Each record has these keys (all strings unless noted; "" when unknown):

- `exam_name`: "ACRONYM (Full Name)", e.g. "SSC CGL (Combined Graduate Level Examination)". The part before the last " (" becomes the short name, so keep acronyms unique.
- `aliases`: other names students search by, separated by "; ".
- `course`: the stream it sits under on the Exams tab. Use exactly one of:
  "Defence", "Government Jobs", "Commerce", or an existing college stream
  ("Engineering", "Science", "Paramedical", "Nursing", "Pharma", "Agriculture", ...).
- `degrees`: degree it leads to for college entrance exams (e.g. "BTech", "BSc"), "" for jobs.
- `scope`: "All India", or a state name exactly as written (e.g. "Uttar Pradesh"), or the university's name.
- `url`: the official site (gov.in / nic.in / the body's own domain).
- `stage`: one of "After Class 10", "After Class 12", "After graduation". If one exam takes both 10th- and 12th-pass people, give the lowest stage that can apply and explain in eligibility.
- `duration`: e.g. "120 minutes" (prelims for multi-stage exams).
- `mode`: "Computer Based" / "Pen & Paper Based" / "Online" etc.
- `forms_out`, `last_date`, `test_date`: typical timing in words, e.g. "February", "3rd week of May", "As per notification".
- `marking`: e.g. "+2/-0.5".
- `eligibility`: one short paragraph: education, age limits (general category; say relaxations exist), nationality only if unusual (e.g. state domicile).
- `application_fee`: "Rs. 100/- (no fee for women, SC/ST, PwBD, ex-servicemen)" style.
- `paper_pattern`: one short paragraph describing the first written stage's sections and marks.
- `selection_process`: the stages in order, separated by " → ", e.g. "Prelims (objective) → Mains (written) → Interview → Document verification & medical". Keep each stage short.
- `remarks`: one or two short sentences of anything a student must know (e.g. "Posts and vacancies change every notification; confirm on the official site."). No people's names.
- `applicants`: {"year": int, "registered": int|null, "appeared": int|null, "source_url": "...", "source_type": "official"|"aggregator"|"news", "note": "..."} or null. Registered = applied. Prefer official (annual report, press release, result notice). UPSC Annual Reports list applicants for every UPSC exam. A news or aggregator figure is OK if it attributes the number to the official body; say so in note.
- `vacancies`: {"year": int, "count": int, "source_url": "...", "source_type": "...", "note": "..."} or null. Vacancies notified in that cycle's notification (the posts on offer). For multi-post exams give the total and say so.
- `sources`: list of every URL you used.
- `notes`: anything uncertain, conflicting figures, which cycle each figure is from.

Style: plain English, short. Rupees as "Rs. 500/-". No marketing language. No people's names anywhere.
