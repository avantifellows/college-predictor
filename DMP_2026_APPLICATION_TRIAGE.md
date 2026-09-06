# DMP 2026 Application Triage

Source: `/Users/surya/Downloads/org-dmp-applications-all-columns.xlsx`

Correction note: the first pass used `openpyxl` in read-only mode, which incorrectly reported only 42 rows. Loading the workbook normally shows 79 rows total: 78 applications plus the header. This corrected pass includes Rajvi, Sakshi, Kanika, Sahana, Subinita, and the other earlier-missed rows.

Method: first-pass review of the written application plus GitHub signal from `avantifellows/college-predictor` issues and PRs. This is not a final selection; it is a resume-review shortlist to get to 3-4 interviews.

## Resume Review Priority

### Strong Pull

| Candidate | Why keep them in the next filter |
| --- | --- |
| Rajvi Singh Rathore | Strong data-prep alignment: #178 was merged, and her proposal discusses validation, schema, SQL proximity scoring, and the large-result-set problem. Safe/moderate/dream PR needs better rules, but the direction is relevant. |
| Rama Sasank Gudipati | Strongest recent bug-fix signal: #290 was merged after rebase and fixed stable row keys, stale fetches, and dropdown reset. Proposal is less data-deep, but the contribution showed debugging, iteration, and scope control. |
| Sakshi Shamrao Jadhav | Strongest volume of useful repo observations: #241, #277, and #258 were merged; several other PRs were too broad but based on real exam/data semantics. Proposal shows careful exam-rule thinking, especially GUJCET/MHT-CET. |
| Kush Patel | Merged meaningful correctness/docs fixes (#203, #195) and shows good JoSAA/PwD understanding. Later PRs had large generated-looking churn, so resume/interview should test judgment and scope discipline. |
| Kanika Katare | #161 merged and she has broader Avanti repo context from quiz-backend. Proposal is aligned with data reliability/prediction consistency; worth checking resume for depth beyond engagement. |
| Kaushiki Vashisth | #227 merged and proposal is sensible around validation, API contracts, and incremental backend/data work. Good resume-review candidate if her resume supports the claimed full-stack/ML experience. |
| Sahana K B | #274 merged as a small defensive API fix; application also shows broader open-source contribution history. Proposal is not the deepest on Futures specifics, but repo signal is clean. |
| Subinita Ray | #287 merged and proposal is confident on Postgres/LightGBM/data-pipeline work. Some language is ambitious, but the merged correctness fix makes her worth resume review. |

### Secondary Pull

| Candidate | Why keep as backup |
| --- | --- |
| Shushmita | Very repo-specific proposal around Lambda/S3, `jee-predict`, Postgres, and calibration; #167/#168 were not merged but showed real code reading. |
| Chinmayi D S | Avanti ex-student perspective and counselling-flow empathy are valuable; contribution was small/not merged (#175), so resume should confirm engineering strength. |
| Sharanya Vinod Pillai | Strong personal/contextual fit as an Avanti platform user and data-validation focus; #192 was too large but direction matches the project’s real data-prep needs. |
| Revaa Rathore | Proposal is unusually concrete on JSON size, field maps, Postgres migration, and validation; no current repo PR signal, so resume-dependent. |
| Tushar Jamdade | Strong on-paper backend/data/open-source profile and coherent static-JSON-to-Postgres plan; no direct repo contribution found. |
| Somesh Pawan Kamad | Found a real JEE filtering issue in #278, though the PR mixed unrelated caching. Worth a lower-priority resume check. |
| Khushi | Detailed #136 comment with concrete observations about `jee-predict.js` and `lambda_sync_sheet_to_s3.py`; not obvious in repo PRs, so resume/GitHub should be checked. |
| Abhay Singh | Technically detailed proposal, possibly strong backend/ML fit; no direct repo contribution signal found. |

## Suggested Resume Downloads

Download first: Rajvi, Rama, Sakshi Shamrao Jadhav, Kush, Kanika, Kaushiki, Sahana, Subinita.

If you want 3-5 extra options before deciding interviews: Shushmita, Chinmayi, Sharanya, Revaa, Tushar.

Likely interview pool after resume filter: Rajvi, Rama, Sakshi, Kush, plus one of Kanika / Kaushiki / Sahana / Subinita depending on resume strength and availability.

## Resume Pass 1

Source: signed Badal resume links provided on 2026-05-25 for Rajvi, Rama, Sakshi, Kush, Kanika, Kaushiki, Sahana, and Subinita. Filter used here: prefer available 2nd/3rd year students, avoid candidates with competing internships/jobs, keep repo signal as the main quality check, and use gender balance only as a final tie-breaker.

| Candidate | Resume read | Current call |
| --- | --- | --- |
| Sakshi Shamrao Jadhav | IIT Bhilai, B.Tech Electrical, 2023-2027, CGPA 9.08. Past full-stack/government-health and FOSSEE internships, plus strongest repo contribution volume with 3 merged PRs. | Strong interview candidate. Good 3rd-year profile, no obvious current competing internship, and the proposal/repo work are more exam-semantics-aware than most. |
| Rajvi Singh Rathore | IIIT Jabalpur, B.Tech 2024-2028, 2nd year per application. No current job/internship shown; projects are ordinary but relevant to Next.js/Postgres, and #178 merged. | Strong interview candidate, subject to confirming full summer availability and testing whether she can reason beyond validation-script/data-cleaning basics. |
| Kush Patel | IIIT Jabalpur, CSE 2024-2028, likely 2nd year. Strong OSS claims outside Avanti and two useful Avanti merges; resume has inflated AI/ML stack language but enough real technical signal. | Strong interview candidate, but interview should test scope discipline because later PRs had large generated-looking churn. |
| Kanika Katare | IIITDM Jabalpur, Smart Manufacturing 2024-2028, 2nd year. No competing internship listed; one college-predictor merge and claimed quiz-backend contribution. | Strong interview/near-interview candidate. Good fit for availability and gender-balance tie-breaker if technical depth checks out. |
| Kaushiki Vashisth | NIT Kurukshetra, IT 2023-2027, 3rd year. Strong academics and one clean reliability PR; no current internship/job listed. | Strong backup interview candidate. Resume is credible and focused, though repo signal is thinner than Sakshi/Rajvi/Kush/Kanika. |
| Rama Sasank Gudipati | Polaris School of Technology, B.Tech 2025-present, 1st year. Best recent repo debugging PR (#290), but resume is thinner and more frontend/AI-general than data/backend. | Keep as a technical wildcard. Strong PR signal, but below preferred year filter and resume depth is weaker than the top group. |
| Sahana K B | Medhavi Skills University, B.Tech CSE AI/ML, expected 2029, 1st year. Clean small merged PR, but resume is basic and project depth is lighter. | Polite hold/backup. Good early contributor, but not ideal for this internship if filtering for 2nd/3rd-year focus and stronger data/backend readiness. |
| Subinita Ray | NIT Agartala, B.Tech 2023-2027. Resume has strong-sounding data/ML experience, but projects are bloated and she lists Summer of Bitcoin 2026 selection. | Do not shortlist for now. Competing internship/focus risk is too high for a role where Avanti needs dedicated attention. |

Current practical interview shortlist from these eight: Sakshi, Rajvi, Kush, Kanika. Keep Kaushiki as the first alternate, and Rama as the repo-signal wildcard if you want one more technical interview.

## Resume Pass 2

Source: signed Badal resume links provided on 2026-05-25 for Chinmayi, Shushmita, Sharanya, Revaa, Tushar, Somesh, Khushi, and Abhay.

| Candidate | Resume read | Current call |
| --- | --- | --- |
| Khushi | IGDTUW, B.Tech CSE-AI, 2024-2028, 2nd year, CGPA 9.61. DRDO research internship appears completed Jan-Feb 2026; strong full-stack/data profile and a concrete repo-reading application, but no Avanti PR merge found. | Strong alternate, possibly interviewable. Good year/availability profile and strong resume; weaker only because repo contribution signal is comment/application rather than merged PR. |
| Sharanya Vinod Pillai | SIES GST, BE Computer Engineering, 2023-2027, 3rd year, CGPA 9.18. Project internship ended Apr 2026; Avanti user context and data-validation PR direction are relevant. | Strong alternate. Good student-fit and data-quality focus; not above top four because her Avanti PR was not merged and resume is less distinctive than Sakshi/Rajvi/Kush/Kanika. |
| Somesh Pawan Kamad | IIIT Hyderabad, B.Tech+MS CSE, 2024-present, 2nd year. Strong institution and useful builder profile; resume says he is also applying to Sugar Labs/C4GT. | Backup/wildcard. Good raw profile, but repo signal is one mixed PR and application is less Avanti-specific than top candidates. |
| Tushar Jamdade | VIIT Pune, B.Tech CSE/Data Science, app says 4th year; GSoC 2025 and Shakktii AI internship ended Apr 2026. Strong OSS/devops resume, no direct Avanti contribution found. | Backup only. Capable on paper, but year filter and lack of repo signal make him less aligned for this specific pick. |
| Chinmayi D S | NIT Surathkal, B.Tech 2022-2026, app says 4th year. Strong GSoC/LFX/Apollo background and Avanti ex-student/user empathy, but resume lists TempWallets Backend/Product Intern from Feb 2026-present. | Kind hold/reject for focus fit. Strong person and good product instincts, but 4th year plus current internship makes availability/focus risky for Avanti's one-slot program. |
| Shushmita | Cambridge Institute of Technology, 2023-2027, 3rd year, CGPA 9.0. Very repo-specific application and #167/#168 code-reading signal, but resume lists ISRO AI/ML Intern from Nov 2025-present. | Hold/reject unless she confirms ISRO is ending before DMP. Technical alignment is good, but current internship is a major focus-risk. |
| Revaa Rathore | Polaris School of Technology, B.Tech 2025-present, 1st year. Strong OSS claims but resume lists GSoC 2026 Contributor present and Summer of Bitcoin phase qualifier. | Do not shortlist for this slot. First-year plus competing GSoC 2026 commitment conflicts with the desired full Avanti focus. |
| Abhay Singh | Bangalore Institute of Technology, BE ISE, 2023-2027, 3rd year. Strong technical writing and OWASP signal, but resume lists Full Stack Engineer Intern from Dec 2025-present. | Do not shortlist for now. Capable, but current employment/internship at another org is exactly the focus risk to avoid. |

Updated practical interview shortlist after both resume passes: Sakshi, Rajvi, Kush, Kanika. If you want one replacement or fifth conversation, prefer Khushi or Kaushiki; Sharanya is the next values/data-quality alternate.

## Full Applicant Notes

| Applicant | GitHub signal | First-pass note |
| --- | --- | --- |
| AMIT KUMAR GUPTA | No direct repo PR found. | Strong full-stack/data wording and reasonable phased plan; no repo evidence, so resume-dependent rather than priority. |
| Garv Agarwal | No direct repo PR found. | Good schema-first/migration framing and risk awareness; lacks contribution signal. |
| Raghav | No direct repo PR found. | Relevant Python/ML framing, but proposal stays broad and does not distinguish itself from stronger applicants. |
| Sakshi Tripathi | No direct repo PR found. | Strong written plan around schema, ingestion, FastAPI, and calibration; worth a backup look if resume is strong, but not the same as Sakshi Jadhav. |
| Darla Sharon | No direct repo PR found. | Relevant Postgres/API/React claims; proposal is standard and less repo-specific. |
| RITIK CHAUDHRY | No direct repo PR found. | Personal motivation is sincere, but plan is generic and ambitious without repository evidence. |
| Khustar | No direct repo PR found. | Has practical full-stack claims and sensible sequencing; no GitHub signal in this repo. |
| Abhay Singh | No direct repo PR found. | Technically detailed and may be strong; proposal may be over-engineered with FastAPI/RAG/PyTorch, so verify judgment in resume/interview. |
| Keerthi Masaa | No direct repo PR found. | Respectful application, but technical depth appears lighter than top candidates. |
| Ashritha Kunjeti | No direct repo PR found. | Relevant general full-stack skills, but proposal is broad and less specific than stronger applicants. |
| Eashan Hasija | #292/#279 closed. | Shows effort, but PRs were dark-mode/duplicate fixes; not a top data-prep signal. |
| Anshika Chaubey | #181 merged; many other broad PRs closed. | Good persistence and one useful merged UX fix; many PRs were too broad, so scope control is a concern. |
| Sahana K B | #274 merged. | Clean, small defensive API contribution; application is modest but open-source background looks credible. |
| Aniket Kumar | No direct repo PR found. | Generic proposal; not enough project-specific evidence. |
| Ishwari Ganpatrao Shinde | Many PRs/issues, none merged in triage. | Very active, but contributions skewed broad/refactor-heavy; not a priority unless resume is exceptional. |
| Vaishnavi | No direct DMP 2026 repo signal found. | General fit unclear from current evidence. |
| Sakshi Shamrao Jadhav | #241/#277/#258 merged; many other PRs closed. | Strong practical repo signal and strong exam-specific product thinking; high-priority resume review. |
| Dipak Prakash Dhangar | #182 closed. | Identified maintainability themes, but contribution was refactor-oriented and not merged. |
| Chinmayi D S | #175 closed. | Strong Avanti/user empathy and counselling-simulator idea; resume should confirm backend/data execution strength. |
| Somesh Pawan Kamad | #278 closed. | Found a valid JEE filter bug but mixed in cache change; backup candidate, test precision/scope. |
| JAY SONI | No direct repo PR found. | Not enough standout repo or proposal evidence from this pass. |
| Kanishka Bhardwaj | #268 closed. | Looked at a real filter issue, but proposed logic was unsafe; not a top pick. |
| Ankur Dutta | No direct repo PR found. | No strong repo signal found. |
| Pushti Sonawala | #217 merged; #253 closed. | Useful NEETUG form/data alignment fix; worth noting, though proposal signal is not as strong as top group. |
| Vanisha Garg | No direct repo PR found. | Relevant full-stack/data-science framing, but reads generic and polished without repo evidence. |
| Dibakar Bala | No direct repo PR found. | Compelling personal context and decent backend/data proposal; possible values-fit backup. |
| Vaishnavi H | No direct repo PR found. | Not enough standout evidence from this pass. |
| Arushi Shukla | No direct repo PR found. | Good motivation, but proposal centers UI/onboarding more than the data core. |
| Ashutosh Vishwakarma | No direct repo PR found. | Good static-JSON/Postgres understanding, but no contribution signal. |
| Abhishek Kumar | No direct repo PR found. | Strong backend/platform claims on paper; keep only as a resume wildcard. |
| PONNAM SRI SAI | No direct repo PR found. | Some text appears mismatched to another project/domain; lower priority. |
| Anubhav Roy | No direct repo PR found. | Data/backend interest is relevant, but application stays high-level. |
| Aanchal Routela | No direct repo PR found. | ML/backend skills are relevant, but proposal is cautious and generic. |
| Chippe Vinay Kumar | No direct repo PR found. | Basic data/API migration idea; not enough evidence for shortlist. |
| Kaushiki Vashisth | #227 merged under `Kaushi-vashisth`. | Clean reliability contribution and sensible phased proposal; strong resume-review candidate. |
| Rahul Kori | #234 closed. | Strongly structured proposal but PR was broad mobile UI; backup only if resume is strong. |
| Tejaswa Hinduja | #231/#199 closed. | Correctly identifies static JSON and migration risks; useful backup if resume confirms backend/data depth. |
| Lakshya Mewara | No direct repo PR found. | Technically detailed but no repo signal; backup only. |
| Haina Kumari | No direct repo PR found. | Proposal is over-scoped with many AI/UI ideas; lower priority. |
| Aniruddha Ambewadikar | No direct repo PR found. | Repository-pattern framing feels generic and less aligned with data-prep priority. |
| Shreecharana | No direct repo PR found. | Backend/data interests fit, but proposal shifts into feature expansion. |
| KEERTHI MORUGU | No direct repo PR found. | Relevant React/API experience, but proposal is standard and not repo-specific enough. |
| Subinita Ray | #287 merged; #288/#286 closed docs PRs. | Good small correctness merge and strong written technical plan; high-priority resume review. |
| Noaman Akhtar | #254 merged; #262/#235/#209 closed. | Practical small-PR signal and realistic incremental plan; good backup. |
| Rishit Sharma | #165/#166/#171 closed under similar handle. | Good data/backend framing and JEE empathy; PRs were not strong enough for top shortlist. |
| Anant Sharma | No direct repo PR found. | Enthusiastic and learning-oriented, but proposal overreaches into XGBoost/Reports. |
| Ashavennela Rapa | No direct repo PR found. | Mission fit is clear, but technical plan is broad and light on repo specifics. |
| Vijay KV | No direct repo PR found. | Good general full-stack background and personal JEE context; less concrete than top group. |
| Sharanya Vinod Pillai | #192 closed. | Avanti-user context and data-validation focus are valuable; strong secondary resume review. |
| Tushar Jamdade | No direct repo PR found. | Strong on-paper backend/data/open-source profile; resume-dependent secondary pull. |
| Kush Patel | #203/#195 merged; #210/#249/#256 closed. | Strong meaningful fixes and ML/data framing; interview should test judgment because later PRs had large churn. |
| Abhinav Pingle | #285/#266/#250 closed. | Active and interested, but PRs were too broad or duplicative; lower priority unless resume is strong. |
| Rama Sasank Gudipati | #290 merged; #284/#282/#281/#280 closed as duplicates/mixed. | Strongest recent contribution signal: real bug cluster, rebase responsiveness, and small final patch. |
| Shushmita | #167/#168 closed. | Very repo-specific thinking around Lambda/S3 and `jee-predict`; strong secondary pull despite no merged PR. |
| Nishant Borude | No direct repo PR found. | General full-stack/data proposal; not enough distinguishing evidence. |
| Ayushman | No direct repo PR found. | Relevant backend/database claims, but proposal is broad. |
| Sagar | Commented on #136; no PR found. | Practical full-stack interest, but proposal is too general for top shortlist. |
| Nachiket Roy | No direct repo PR found. | Understands student problem and mentions calibration, but no direct repo signal. |
| Anshul V Chikhale | No direct repo PR found. | Motivation is good; proposal is generic and includes vague external data ideas. |
| Revaa Rathore | #158 closed. | Written proposal is notably concrete on JSON-to-Postgres and validation; secondary pull despite limited current repo signal. |
| SHAHAZADI SHAGUFTHA SYED | No direct repo PR found. | Strong empathy and mobile-first framing, but proposal is very broad/AI-ish and needs resume validation. |
| Priya | #295 closed. | Useful web instincts, but SEO/OG work is lower priority than data correctness. |
| Avni Shukla | No direct DMP PR found. | Claims strong React/Postgres/ML fit, but application is more aspirational than grounded. |
| Rameshwari Rajnedra Satpute | No direct repo PR found. | Respectful and aligned with mission, but not enough technical specificity. |
| Rajvi Singh Rathore | #178 merged; #151 closed. | Strong data-prep signal and serious proposal; high-priority resume review. |
| Khushi | Detailed #136 comment; no direct PR found. | Strong repo reading in comment around `jee-predict` and Lambda/S3; worth secondary resume check if application/resume confirms depth. |
| Gaurav Chand | No direct repo PR found. | Generic recommendation/platform proposal; lower priority. |
| Kaushalendra Pratap | No direct repo PR found. | Similar-platform experience on paper; proposal reads like a standard migration plan. |
| V Priyadharshini | No direct repo PR found. | Basic relevant skills, but lower specificity than shortlisted candidates. |
| NIKITHA S | Claimed mobile-friendly PR; obvious matching PR not confirmed. | Good frontend/data-dashboard experience, but proposal is broad and contribution signal needs verification. |
| Aryan Choudhary | #147/#149 closed. | Understands student pain and tried contributing, but PRs were not among the cleaner useful changes. |
| SLOK TULSYAN | #153 closed. | Enthusiastic and did work, but contribution leaned toward large UI rewrite rather than data/correctness core. |
| Prakhar Singh | Older Docker PR appears under similar handle; no strong current signal. | Full-stack skills may be useful, but application is broad and not very repo-specific. |
| Hemang Joshi | No current repo PR found. | Potentially strong IIIT-H/ML background; proposal is generic, so resume needs to carry him. |
| Bhavik Jain | Commented on #136; no PR found. | Sincere social-impact framing and rough stack fit; lacks concrete repo-specific evidence. |
| Swati Yelamanchili | No repo PR found. | Reasonable data/backend framing and academic assistant experience; proposal remains generic. |
| Rakshit Yadav | No repo PR found. | Clear enough application but mostly repeats expected Postgres/API/ML themes; no direct contribution signal. |
| Kanika Katare | #161 merged; quiz-backend contribution claimed. | Engaged across Avanti repos and has one useful college-predictor merge; strong resume-review candidate. |
