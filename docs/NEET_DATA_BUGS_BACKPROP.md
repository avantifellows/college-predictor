# NEET data bugs — back-propagation / fix queue

Actionable fix-list for **data-quality bugs found in `NEETUG.json`** (and the parsers that produce it)
during the 2026 min-marks matrix workstream. These were patched **at matrix-time only**; the live
**college-predictor** app still serves the un-fixed data, and the eventual **BigQuery / external_data_sources**
load needs clean data. Fix these in a **dedicated parser/data pass**, not silently inside matrix work.

Source of findings: `NEET_SOURCE_OF_TRUTH.md` (per-state ledger) + `NEET_2026_MATRIX_DECISIONS.md` (provenance).
Cross-reference the Dropbox pipeline `amogh-csv/medical-state-counselling/` for the better source/logic where noted.

## Severity legend
- **P1** — wrong data served to predictor users (mislabels that produce absurd cutoffs / wrong govt list).
- **P2** — incomplete data (missing categories/programs) → predictor silently under-covers.
- **P3** — missing derived field (e.g. govt flag) → predictor can't filter, but underlying rows OK.

## Queue

| # | State | Severity | Bug | Where | Affects predictor? | Proposed fix |
|---|---|---|---|---|---|---|
| 1 | **Punjab** | **P1** | NRI-quota row tagged plain `Open` at AIR 1,094,655 (GMC Patiala) — absurd as an Open closing | `NEETUG.json` `punjab_2025_cutoffs`; parser | Yes — inflates Open cutoff | Parser: carry Seat Type onto the row / tag NRI rows so they're not read as Open; or drop NRI from the Open category |
| 2 | **Punjab** | **P1** | Private colleges (Gian Sagar, PIMS Jalandhar, Adesh, DMC Ludhiana, RIMT) tagged `Seat Type = Govt. Quota` (they have govt-*quota seats* but aren't govt colleges) | `NEETUG.json` `punjab_2025_cutoffs` | Yes — pollutes govt-only view | Add a true `is_govt_college` flag (name/fee-based); don't equate "Govt. Quota seat" with "govt college" |
| 3 | **Karnataka** | **P1** | Private/minority colleges (Al-Ameen, Srinivasa, S R Patil, Farookh, Khaja Bande Navaz) tagged `Seat Type = Government` | `NEETUG.json` `karnataka_2025_r3_cutoffs` | Yes — wrong govt list / inflated govt floor | Adopt their **fee-based `is_true_govt`** classifier (`KA_college_govt_classification.csv`, govt ~₹64k vs private ₹153k+) |
| 4 | **Karnataka** | **P2** | Our KA parse covers only ~5/24 true-govt colleges (thin) | parser `07_*`/KA parser | Yes — under-covers KA govt | Re-parse KA, likely **adopt their source** (`KA_closing_ranks_state_govt_2025.csv`, 703 MBBS rows) |
| 5 | **Gujarat** | **P3** | No govt/private distinction in our parse (no govt flag) | `NEETUG.json` `gujarat_2025_cutoffs` | Yes — can't filter govt-only | Add govt flag from their `mgmt` classification {Govt, Govt-Society GMERS, Municipal} vs Private/Other |
| 6 | **Himachal** | **P2** | Our parse captured ONLY the General category for MBBS (OBC/SC/ST rows absent) | parser `08_parse_himachal.py`; `himachal_2025_r3_cutoffs` | Yes — no reserved-category HP data | Re-parse HP or **adopt their source** (`HP_closing_ranks_state_govt_2025.csv`, 6 colleges × full categories) |
| 7 | **Uttar Pradesh** (THEIR parser) | **P1** | `state_UP.py` classifies `[PPP]` colleges as GOVT, but UP's 3 PPP colleges (Ajay Sangaal, KMC Maharajganj, Shri Siddhi Vinayak) fill like PRIVATE (UR closes AIR 380k-470k). Inflates govt UR floor (matrix Gen came out 321 < EWS 518 until excluded) | THEIR `scripts/state_UP.py` `is_govt()` / `GOVT_MBBS_KEYWORDS` + `[PPP]` rule → `UP_closing_ranks_state_govt_2025.csv` | N/A to our predictor (Dropbox-only state) but **affects the canonical BQ load if we adopt their parser** | Drop `[PPP]` from the govt set (or flag PPP as a distinct `college_type=PPP`, excluded from "govt" floor). Verify same issue in other states' parsers that honor PPP |
| 8 | **Bihar** (THEIR parser) | **P1** | `state_BR.py` hard-coded govt list WRONGLY includes 2 PRIVATE colleges — **KMC Katihar** (Muslim-minority private) & **Narayan MC Sasaram** (private) — confirmed via neetugguidance govt-vs-private tables. Their UR closes AIR 135k/309k, contaminating the govt floor tail | THEIR `scripts/state_BR.py` `GOVT_BR_PATTERNS` (has "KMC KATIHAR", "NMC SASARAM") → `BR_closing_ranks_state_govt_2025.csv` | N/A to predictor (Dropbox-only) but affects canonical BQ if adopted | Remove KMC Katihar + NMC Sasaram from `GOVT_BR_PATTERNS` (they're private). Impact small (median already discounts) but classification is wrong |
| 9 | **Chhattisgarh** (THEIR extracted output) | **P1** | `CG_closing_ranks_state_govt_2025.csv` is STALE / out-of-sync with the current raw `CG_all_allotments_2025.csv` — reports PJNM Raipur UR 180,626 vs real ~24,483. An old parser-version artifact | THEIR `extracted_data/CG_closing_ranks_state_govt_2025.csv` (stale); raw is fine | N/A predictor (Dropbox-only) but **the stale extracted file must not be loaded to BQ** | Re-run `state_CG.py` against current raw (or regenerate closings from `CG_all_allotments_2025.csv`); verify all states' extracted-vs-raw consistency before BQ load |
| 10 | **Chhattisgarh** (taxonomy) | **P3** | 'Special ST' (PVTG/special-tribe) is a 1-seat sub-pool at AIR 1.3M; naive consumers folding it into ST corrupt the ST floor | data taxonomy | consumer-side | Keep 'Special ST' as a distinct sub-category, exclude from base ST floor |
| 12 | **Jharkhand** (THEIR parser) | **P1 — worst found** | **OFF-BY-ONE QUOTA COLUMN.** True PDF cols: [12]='NEET Score', [13]='CML Rank', [18]=CollegeName, [19]=Course, **[20]='Preference No'**, **[21]='Seat Opted Category/Quota'**. `state_JH.py` reads `allotted_quota` from **r[20] = Preference No** → its "quotas" are preference numbers 1-10 (docstring mis-explains them as "college-specific affiliated-school reservations"). Only 32 closing rows survived its `MAIN_QUOTAS` filter; category floors came out impossible (GENERAL 248 marks, BELOW SC 419). Docstring schema also omits the NEET Score column. **Also: PDF tables DRIFT on some pages** — fixed indices unsafe | THEIR `scripts/state_JH.py` line ~103 (`r[20]`→ should be `r[21]`) → `JH_closing_ranks_state_govt_2025.csv` | N/A predictor (Dropbox-only) but **badly corrupts BQ if adopted** | Change quota to `r[21]`; better, identify quota by VALUE PATTERN `^(UR|ST|SC|BC-I|BC-II|EWS)(--(PH\|Blind\|Deaf))?$` to survive table drift (what our `neet_matrix_jh.py` does). Also expose `neet_score` (col 12) properly — JH is marks-native, no CML→AIR conversion needed |
| 11 | **Assam** (THEIR parser) | **P1** | `final_pool`/`quota_seat` MIS-ASSIGNMENT: low-score candidates (score ~150-210, cat OBC/SC) dumped into UR/other seats at deep AIR (Dhubri UR: 2 OBC score-154 rows at AIR ~1.03M; Jorhat UR: score-205 at 779k). Raw max(neet_air) per pool → absurd closings (Assam Medical UR 614k, OBC 1.06M; UR looser than SC) | THEIR `scripts/state_AS.py` pool/migration logic → `AS_*allotments/closing` | N/A predictor (Dropbox-only) but corrupts BQ if adopted | Fix the pool-assignment; or apply a score-sanity guard (drop holders with score far below the pool cluster). We used score>=350 to recover sane floors |

## NOT bugs (do not "fix" — structural realities / correct-but-needs-filtering)
- **West Bengal**: JMN / Jakir Hosain have `Seat Type = Management Quota` "UR" rows at AIR 734k/836k — **correct parse** (management/paid seats genuinely close near the qualifying floor). Consumers must filter `Seat Type = State Quota`; not a mislabel.
- **Kerala**: SM (State Merit) is a small pure-merit pool (~40-50% seats), not a fill-to-bottom open pool → general state floor tighter than AIQ. Real; a semantics caveat, not a bug.
- **Telangana**: our parse is MBBS-only (no BDS) — a coverage limitation to note, BDS pulled from theirs for the matrix; could be a P2 re-parse later if the predictor needs TG BDS.
- **Punjab**: no ST govt seats — structural (negligible ST population), not missing data.

## Cross-cutting fix (the canonical-parser design, Phase 3)
See `NEET_SOURCE_OF_TRUTH.md` "Cross-cutting lessons". The recurring theme across #1-6: **"govt" and "seat quota" are conflated in our parse.** The canonical parser should carry, per row: `institute`, `is_govt_college` (fee/roster-based, NOT seat-type), `seat_quota` (State/AIQ/Mgmt/NRI/ESI…), `vertical_category`, `horizontal_subpool`, `rank_space` (+AIR after conversion), `round`. Then the predictor filters on clean typed fields instead of overloaded strings.

---

# ROUND 2 — Karnataka medical-student feedback (2026-07-29, via Amogh)

Five issues reported by medical students in Karnataka using the college predictor. All five reproduce.
Amogh's read — *"main issue is that seat type is being conflated with category because there is no
separate seat type filter"* — is correct, and it explains items 1, 3, 4 and 5.

## P1-A — No SEAT TYPE filter: irrelevant quota rows shown to everyone
**Report:** *"They can see DU quota / puducherry quota / etc in the All India list even if it's not
applicable to them."*

**Reproduced.** `examConfig.js` `getFilters` scoping rule: `if (Source startsWith "aiq") return true` —
i.e. **every** AIQ-sourced row is shown to every user regardless of eligibility. Our AIQ file has
**25 distinct seat types** across 3,110 rows, and most are domicile- or institution-restricted:

| Seat Type | rows | who can actually use it |
|---|---|---|
| All India | 2,798 | everyone |
| Deemed/Paid Seats Quota | 88 | everyone (but see P2-A) |
| Employees State Insurance (ESI) | 58 | ESI beneficiaries only |
| Non-Resident Indian | 47 | NRI only |
| **Delhi University Quota** | 26 | Delhi domicile only |
| IP University Quota | 20 | Delhi domicile only |
| **Internal - Puducherry UT Domicile** | 9 | Puducherry domicile only |
| AMU / Jamia / Muslim-minority / Jain-minority quotas | ~17 | institution-internal only |
| Delhi NCR CW (Armed Forces children/widows) | 24 | that cohort only |
| Foreign Country Quota | 1 | foreign nationals |

The code comment admits the design: *"we keep as their own labeled Seat Type so the list is complete —
the student reads the Seat Type to see which apply to them."* That was optimistic: a Karnataka student
has no idea DU Quota is Delhi-only, and it inflates their apparent options.

**Fix:** add a first-class **`seatType` filter field** (Any / All-India open / Deemed-paid / State govt /
State private / Management / NRI), defaulting to *exclude* the restricted pools unless explicitly asked
for. This is the single change that fixes 4 of the 5 reports.

## P1-B — Karnataka built from ROUND 3 ONLY: college coverage collapses
**Report:** *"We are using only round 3 data for state cutoffs in Karnataka, but that only includes
cutoffs for seats left vacant after R1 and 2. For data completeness we need to merge R1,2,3 and then
take the max value of cutoffs for each category."*

**Reproduced, and worse than it looks.** `karnataka_2025_r3_cutoffs` = 318 rows. The raw file
`KA_all_allotments_R1_R2_R3_2025.csv` has **24,418** allotments split **R1 10,457 / R2 12,615 /
R3 1,346** — so R3 is **5.5%** of the data.

The closing *ranks* move only a little (R3's few seats are the deepest, so they already sit near the
floor) but **college coverage collapses**, which is what a predictor actually shows a student:

| Category | R3-only | R1+R2+R3 | closing-rank effect | marks effect |
|---|---|---|---|---|
| GM | **8 colleges** | **28** | 58,767 → 58,778 | 0 |
| 2AG | 3 | 28 | 73,545 → 73,334 | ~0 |
| 2BG | 2 | 28 | 70,992 → 62,178 | **+7** |
| 3BG | 1 | 28 | 78,595 → 53,986 | **+19** |
| 3AG | **0 — category absent entirely** | 25 | — | n/a |
| STG | 2 | 28 | 205,334 → 176,078 | **+16** |
| SCG | 4 | 28 | 218,719 → 214,196 | +3 |

⇒ A Karnataka 3AG student currently sees **nothing**. A GM student sees 8 of 28 govt colleges.
**Fix:** rebuild Karnataka from the R1+R2+R3 file, max-per-(college, category) across rounds. Amogh's
prescription is exactly right. Note for the matrix: our published KA *floors* barely change (median-of-5
is dominated by the deepest seats, which R3 already had) — this is primarily a **predictor
completeness** bug, not a matrix-accuracy bug.

## P2-A — Deemed/paid seats have NO category reservation
**Report:** *"All India - Seat type = deemed/paid does not have any category based reservations, any cat
can get that seat."*

**Confirmed** (88 rows). Deemed universities admit on rank+fee with no reservation, so filtering them by
the student's category is wrong in both directions: it hides deemed options from reserved-category
students and implies a reservation that does not exist.
**Fix:** exempt `Seat Type = "Deemed/Paid Seats Quota"` from the category filter; label the rows
"no category reservation — open to all, fee-based".

## P2-B — College type / seat type not shown in the state-quota list
**Report:** *"Show college type and seat type in state quota list (college type = Govt/Pvt, seat type =
Govt/Pvt/Management)."*

We already hold this: Karnataka rows carry `Seat Type` ∈ {Government 199, Private 81, Other 37,
NRI Quota 1}, and `KA_college_govt_classification.csv` has a **fee-based** `is_true_govt` flag per
college (26 govt MBBS colleges) — the most reliable govt classifier we have anywhere.
**Fix:** surface both as display columns. Distinguish them, because they differ: a *government seat*
can exist inside a *private college* (govt-quota seats at private colleges), which is precisely the
distinction students are asking to see.

## P3-A — Karnataka GM vs OPN naming
**Report:** *"OPN is used only for private seats while GM is used only for govt seats, but both mean the
same thing. This is causing some confusion."*

Karnataka's own convention, not our bug — but ours to present clearly. Our KA rows use GM/GMH/GMK
(+2AG/2BG/3AG/3BG/1G and SCG/STG).
**Fix:** normalise to a single displayed label (`General (GM/OPN)`) with the raw state code kept in
`Category Label`, so a student searching "OPN" finds the GM rows.

## Priority order
1. **P1-A seat-type filter** — fixes 4 of 5 reports, and is the fix Amogh identified.
2. **P1-B Karnataka R1+R2+R3 merge** — a whole category (3AG) is currently invisible.
3. **P2-A deemed category exemption** · **P2-B show college/seat type** · **P3-A GM/OPN label**.

## STATUS — all five FIXED (2026-07-29)

| # | Issue | Fix | Where |
|---|---|---|---|
| P1-A | Restricted quotas shown to everyone | **New `seatType` filter**, defaulting to "Seats I can apply to" which hides the 259 restricted rows (DU/IP/Puducherry/AMU/Jamia/minority/ESI/CW/Foreign/NRI). Options: govt-only · private+management · deemed · show-all. | `examConfig.js` — `NEET_SEAT_BUCKETS`, `neetSeatBucket()`, `NEET_OPEN_BUCKETS`, new filter in `getFilters` |
| P1-B | Karnataka R3-only | **Rebuilt from R1+R2+R3**, max closing rank per (college, program, category). 318 rows → **2,562**; govt colleges per category 0–8 → **23–24**; 3AG now exists. | `scripts/rebuild_karnataka_all_rounds.py` |
| P2-A | Deemed filtered by category | **Category filter exempts deemed rows.** All 88 deemed rows are labelled `Open`, so a reserved-category student previously saw **zero** deemed colleges. | `examConfig.js` category filter |
| P2-B | College type not shown | **`College Type` column added** (Govt/Private), distinct from `Seat Type`. Karnataka carries a fee-derived value; other sources infer from seat pool rather than render blank. | `components/PredictedCollegeTables.js`, both rebuild scripts |
| P3-A | GM vs OPN confusion | `Category Label` now reads **"GM — General (= OPN on private-seat lists)"**, plus the suffixes decoded (G=govt pool, H=Hyderabad-Karnataka Art.371-J, K=Kannada medium, R=Rural). | `rebuild_karnataka_all_rounds.py` `KA_BASE`/`SUFFIX`/`decode()` |

### Verified effect (Karnataka MBBS student)
- Was seeing **157 restricted rows** they cannot use (DU Quota, Puducherry UT Domicile, AMU, ESI,
  Foreign Country Quota…). Default view now hides them: 4,572 → 4,415.
- Govt-seats-only: 2,994 · private/management: 1,367 · deemed: 54 · show-all: 4,572.

## NEW STATES ADDED TO THE PREDICTOR (2026-07-29)
`scripts/add_states_to_predictor.py` — wires the states we parsed during the matrix work into
`NEETUG.json` (the predictor's data file). homeState dropdown: **10 → 13 states**.

| State | Rows | Colleges | Source |
|---|---|---|---|
| Rajasthan | 567 | 59 (30 govt) | official R1 allotment |
| Haryana | 97 | 19 (6 govt) | official DMER R1 |
| Odisha | 74 | 19 (14 govt) | official OJEE R3, AIR via our 5,817-pair bridge |

**Deliberately NOT added:** Tripura (70 rows), Mizoram (90), Arunachal (101), Meghalaya (24),
Nagaland (4), Ladakh (9). These are per-*student* allotment/admitted lists, not per-(college,category)
closings — aggregating a 3-seat category into a "cutoff" would publish a one-student bar as a reliable
door, the same mistake that got Uttarakhand ST blanked. They stay matrix-only.

### Two bugs found while writing that script (both fixed)
1. **Rajasthan college type.** `Govt. Seat` in that source marks the seat POOL, not the college.
   Private colleges carry `Gen. Seat`/`Mgmt. Seat` rows. A first version labelled all 567 rows "Govt";
   correct split is **Govt 222 / Private 345**.
2. **Blank `seat_type` defaulted to govt.** `"Geetanjali MC, Udaipur (Mgmt. Seat) - Court Order"` has an
   empty seat_type with the pool written into the *college name*, and closes at **AIR 1,096,552**. It
   was being published as a government closing, making Rajasthan's govt GEN floor look like AIR 1.09M
   instead of the real **13,375**. Now the pool is read from the college name too, and a blank never
   defaults to government.
3. **Karnataka rebuild was not idempotent** — re-running appended a second copy (2,562 → 5,124). Now
   drops its own prior output first.

## BROWSER VERIFICATION PASS (2026-07-29) — 2 more bugs found and fixed

Ran the app locally and swept every dropdown combination (13 states × 3 programs × 10 categories ×
5 seat types × ranks 1 / 5k / 50k / 200k / 600k). Two real bugs surfaced that unit-level checks missed.

### BUG 1 — Karnataka Seat Type derived from the category suffix (all General rows mislabelled)
`rebuild_karnataka_all_rounds.py` set `Seat Type = "Government" if cat.endswith(("G","GH","GK"))`.
**"GM" (General) ends in "M"**, so every General row — including the **28 at genuine government
colleges** — was labelled `Private`. Combined with the new seat-type filter, *"Government seats only +
home-state category GM"* returned **ZERO rows**.
**Fix:** seat pool now follows the fee-based college classification (`Seat Type = Government if govt`).
Karnataka's suffixes encode region/medium/rural (H/K/R), not the govt-vs-private pool.
GM MBBS now splits **28 Government / 43 Private**; that query returns **10 govt colleges**.

### BUG 2 — "Government seats only" ignored College Type for RJ/HR/OD
`Seat Type = "State Quota"` spans **both** govt and private colleges (a private college sells
state-quota-priced seats): Rajasthan **217 govt / 134 private** under the same label, Haryana 42/55,
Odisha 58/16. The filter bucketed `statequota` as government, so it returned private colleges
(Adesh, HITECH) as "government" and mislabelled MG MC Jaipur.
**Fix:** the filter now consults `College Type` when present, falling back to the seat bucket only for
sources that lack it (Maharashtra etc.).

Two follow-on defects in `add_states_to_predictor.py`, both fixed:
- **Govt-ness is PER-ROW, not per-college.** 26 Rajasthan colleges carry BOTH a `Govt. Seat` and a
  `Gen./Mgmt. Seat` row. Must read the row's own `seat_type`, exactly as the verified matrix builder
  does. My versions flip-flopped and mislabelled colleges in both directions.
- **The blank-seat_type fallback demoted everything for HR/OD.** Those sources have no `seat_type`
  column at all, so `if not seat:` was always true and wiped all 97 HR + 74 OD govt rows to Private.
  Guarded with `if seat_key and not seat:`.

### Verification after the fixes
- **Govt college sets match the verified matrix builders EXACTLY**: Rajasthan 30/30, Haryana 6/6,
  Odisha 14/14 — zero missing, zero extra.
- **Zero mislabelled rows** across all 13 states (no private college in "govt only", no govt college
  in "private/management").
- **No restricted-quota leaks** in the default view, for any state.
- MBBS / BDS / BSc Nursing all reachable in all 13 states.
- Rendered in a production build: `College Type` column shows, quota tabs split correctly, and
  Rajasthan GEN at rank 13,000 returns 7 govt GMCs (closings 11,902-12,727) with round
  "Round 1 (official allotment)".

**Note on dev vs prod:** `next dev` takes 10-20s per query against the 13,280-row file and often shows
"Loading predictions…" indefinitely. Verify UI changes against `next build && next start`.
