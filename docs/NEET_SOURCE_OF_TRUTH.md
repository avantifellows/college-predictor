# NEET data — Source-of-Truth Ledger

One row per state. This is the **spec for the eventual canonical parser + BigQuery load** (Phase 3):
for each state it records which pipeline won and why, how "govt" is determined, the rank space
(and any conversion), which counselling round the data represents, concrete data bugs found, and
web cross-check status. Built as reconnaissance during the 2026 min-marks matrix workstream.

Legend:
- **Source**: OURS = `NEETUG.json` (from our parsers); THEIRS = Dropbox `medical-state-counselling`.
- **Rank space**: AIR = NEET All-India-Rank native; STATE = state merit rank (needs →AIR conversion).
- **Round**: the counselling round the closing data represents (drives generous-vs-strict).
- **Data bugs**: Bucket-B issues (see NEET_2026_MATRIX_DECISIONS.md) — real data problems patched at
  matrix-time only; candidates for back-propagation to parser/`NEETUG.json` so the live predictor benefits.

| State | Matrix source | Govt-classification method | Rank space | Round (our data) | BDS source | Web cross-check | Data bugs found (→ back-prop candidates) |
|---|---|---|---|---|---|---|---|
| **All India (AIQ)** | OURS | national-quota filter {All India, Open Seat Quota} | AIR | **R1** (strict; ×~1.22 → final) | ours | neetugguidance AIQ ✓ | AIQ quota-contamination in pivot files (fixed earlier); AIQ is R1 only (no R3 union for AIQ) |
| **Maharashtra** | OURS | program-aware name (GMC / GDC for dental) | AIR (verified vs their state-rank→AIR: 3/5 exact) | R3 final | ours | — | orphan/earmark sub-pools must be excluded from base floor |
| **Telangana** | OURS (MBBS) + THEIRS (BDS) | name (Govt Medical / Osmania/Gandhi/Kakatiya/ESI) | AIR (== theirs to the digit) | **Mop-up** (most generous) | theirs | neetugguidance AIQ ✓ | our TG = MBBS-only (no BDS); PHO(>1M AIR) rows present, must exclude |
| **Karnataka** | **THEIRS** (ours too thin/contaminated) | **their fee-based `is_true_govt`** (govt ₹64k vs private ₹153k+) | AIR (BMC GM 3478 == ours) | R3 (theirs spans R1-R3) | theirs | neetugguidance AIQ ✓ | **our `Seat Type=Government` CONTAMINATED w/ private colleges** (Al-Ameen/Srinivasa/S R Patil); our KA parse recovers only 5/24 true-govt → our KA parse needs rework |
| **Gujarat** | OURS | name → their `mgmt` set (Govt + GMERS + Municipal); program-aware BDS | AIR (B.J. 4016; looser than AIQ 889 ✓) | R3 final | ours | web (B.J. Medical) ✓ | their "closing_ranks" file is actually a SEAT-COUNT matrix (misnamed); Narendra Modi college = private (trust) |
| **Andhra Pradesh** | OURS (finer: SC1/2/3) | name (Government Medical + classic named) | AIR (AMC OC 15377 ≈ their 15949) | R3 final | theirs (single SC) | neetugguidance AIQ ✓; 16/17 college recon ✓ | **their summary MISSED Rangaraya (govt)**; **their Machilipatnam OC folds in OC-BSG sub-pool (150k) — theirs wrong, ours right** |
| **Kerala** | OURS | program-aware name (Govt Medical / Govt Dental) | AIR (their STATE-rank→AIR == ours EXACTLY, all govt colleges) | Phase 3 final | ours | Xylem + neetugguidance | **their pipeline keeps Kerala STATE RANK** (needs conversion); Kerala SM = tight elite pool, NOT fill-to-bottom open (framing caveat) |
| **Punjab** | OURS | name true-govt (5 colleges) | AIR | **R2** (not final — strict) | ours | — | **our `Govt. Quota` seat-type CONTAMINATED w/ private** (Gian Sagar/PIMS/Adesh/DMC/RIMT); **NRI row (Patiala Open AIR 1,094,655) mislabeled** → both leak into floor unless filtered; **no ST govt seats** (structural) |
| **Madhya Pradesh** | OURS | our `Seat Type=GOVT` — **CLEAN** (verified) | AIR | **R1** (strict, like AIQ) | ours | model validated vs their `closing_neet` to ±1 mark | none (clean parse); compound category code VERT/HORIZ/SUB — base uses /X/ general-horiz |
| **West Bengal** | OURS | their state_govt set (25) + JMN/Jakir Hosain; else private | AIR | **R1** (strict; theirs R2/deeper) | ours | recon vs theirs ~1.08-1.10× ✓ | Management-Quota UR rows (JMN/Jakir Hosain AIR 734k/836k) are CORRECT parse (mgmt seats close deep) — just filter Seat Type=State Quota; OBC split A/B (median); EWS thin pool closes deep |
| **Himachal Pradesh** | **THEIRS** (ours too thin) | their file is govt-only (6 MBBS + 1 BDS) | AIR (== ours on General, to the digit) | R3 final | theirs | their General == ours ✓ | **our parse captured ONLY General for MBBS** (OBC/SC/ST absent) → our HP parse needs rework; no EWS in HP counselling; only 6 govt colleges (low robustness) |
| **Uttar Pradesh** | THEIRS (Dropbox-only) | their `state_UP.py` govt-keyword filter — **but `[PPP]` wrongly=govt** (fix: exclude PPP) | AIR (KGMU UROP 805-4013 verified) | R1+R2+R3 cumulative | theirs | KGMU top-college AIR plausible | **their parser: `[PPP]` colleges classified govt but fill private (AIR 380k-470k)** → excluded from matrix; BDS only 2 govt colleges (Azamgarh 1.3M) — low confidence. Parser otherwise clean/well-built (good reference impl). |
| **Bihar** | THEIRS (Dropbox-only) | their `state_BR.py` hard-coded list — **but includes 2 PRIVATE colleges (Katihar, Sasaram)**; excluded | AIR (PMC Patna 8261 / IGIMS 9583 verified) | R3-revised (final) | theirs | **neetugguidance govt table ✓** (deepest govt UR ESIC 27,331 ≈ our floor) | KMC Katihar + NMC Sasaram wrongly in govt list (private per neetugguidance) → excluded; OBC split BC+EBC (median). Even hard-coded lists can be wrong. |
| **Chhattisgarh** | THEIRS **RAW** (extracted file STALE) | their hard-coded 10-college set (plausible vs neetugguidance) | AIR (raw `neet`, PJNM UR-NC rank1=AIR 20,174) | R1+R2 cumulative | theirs raw | neetugguidance CG AIQ ≈ our top-college ✓ | **extracted closing_ranks STALE vs raw (PJNM 180k vs real 24k)** → rebuilt from raw; 'Special ST' 1-seat sub-pool must not fold into ST; thin-EWS closes deep |
| **Uttarakhand** | THEIRS (Dropbox-only) | keyword filter → 5 govt colleges | AIR (Doon UR 23,789 verified) | R3 broadsheet | theirs | neetugguidance UK AIQ 526 ≈ our top Doon 530 ✓ | THIN STATE — 5 govt colleges; ST=1 seat (qual), SC/EWS pools sparse/deep → low confidence reserved; no govt BDS; parser may under-capture R1/R2-retained |
| **Tamil Nadu** | THEIRS (Dropbox-only) | govt filter keeps "Govt. Colleges" (36 MBBS+3 BDS) | **MARKS-native** (`closing_tmark`, NO conversion) | through R3 | theirs | Chengalpattu OC 547 etc textbook | MARKS-native = cleanest state (no rank→AIR error); OBC=med(BC/BCM/MBC), SC=med(SC/SCA); NO EWS in TN 69%-reservation scheme; shift applied in marks-space |
| **Assam** | THEIRS **RAW** (Dropbox-only) | inst codes 101-113 MBBS / 201-203 BDS | AIR (raw neet_air) | R1 + merit list | theirs raw | our AIQ-in-AS 534 vs state Gen 491 ✓ | **parser final_pool/quota_seat MIS-ASSIGNMENT** (score-150 cands in UR seats) → score>=350 guard applied; ST=med(ST(P),ST(H)); OBC least reliable (migration). MEDIUM confidence |
| **Odisha** | **OURS — `scripts/parse_odisha_2025.py`** on 2 official OJEE PDFs (R3 allotment + state merit list) | 15 govt colleges by name (SCB/MKCG/VIMSAR/PRM/SLN/FM/BB/GMCH…) | **state rank → AIR via OUR 5,817-pair official bridge** (no OD curve existed before) | **R3** (deep/final-ish) | ours (1 govt dental → low conf) | bridge monotonic & anchored (state 1→AIR 180) ✓ | **NO OBC bucket in OD state quota — POLICY** (historically none; 11.25% SEBC approved but not in 2025 allotment) → OBC=qual, revisit for 2026; base seats only (exclude SGS/NRI + GC/PC/EX) |
| **Haryana** | **OURS — `scripts/parse_haryana_2025.py`** on official DMER PDF (portal 503; mirror) | 7 govt colleges by name (PGIMS Rohtak, KC-Karnal, BPS-Khanpur, SHKM-Nalhar, ABV-Chhainsa, ESIC-Faridabad, PGIDS) | **MARKS-native + AIR** (both columns) | **R1 ONLY** (strict) | ours (1 govt dental → low conf) | **our model validated vs their marks: +0.86 mean, sd 2.39** ✓ | `Remark` filter critical (only 2,213/7,595 = Allotted); OBC=med(BCA,BCB); SC=med(SC,SC_DEPRIVED); **NO ST quota** (structural, like PB); MGT/MINORITY/NRI + PWBD/ESM_FF excluded |
| **Rajasthan** | **OURS — `scripts/parse_rajasthan_2025.py`** on official 2025 board PDFs (Dropbox stuck on 2024) | **STATED IN DATA**: `(Govt. Seat)` marker; 31 govt vs disjoint 26 `(Gen. Seat)` private — zero overlap | AIR (`NEET A.I. Rank`) | **R1 ONLY** (runs strict) | ours (1 govt dental → low conf) | neetugguidance RJ-AIQ + round-normalized ✓ (EWS ~4, ST ~8 marks apart) | horizontal PwD/EXS/WPP rows close at AIR 1.1-1.3M → MUST exclude (else GEN "closes" at 1.14M, looser than EWS); OBC=med(OBC,MBC); ST=med(ST,SA-Sahariya) |
| **Jammu & Kashmir** | THEIRS (closing + UT merit list) | 11 govt colleges (9 GMC incl SKIMS + 2 GDC) | **MARKS via UT merit list** (has air+score per state_rank) | R1/R3 | theirs | state_rank1=AIR423/622 ✓; SKIMS OM 558 ✓ | OM=Gen; RBA/ALC/P&B are J&K area quotas → excluded from base (462/430/528); EWS thin-pool deep (318) |
| **Jharkhand** | **SOURCE PDFs re-parsed by us** | 6 govt MBBS + RIMS Dental (hard-coded) | **MARKS-native** ('NEET Score' col; CML rank not needed) | R1+R3 union | source PDFs | textbook ordering; BDS ~25-30 below MBBS ✓ | **THEIR PARSER: off-by-one quota col (r[20]=Preference No, should be r[21]) → 32 rows & impossible floors (GEN 248 < SC 419).** Also PDF tables drift → we match quota by value-pattern; recovered 613 rows. OBC=med(BC-I,BC-II) |

## Cross-cutting lessons for the canonical parser (Phase 3)
1. **"Govt" is not a reliable tag in either raw source.** Our `Seat Type`/name can include private colleges (KA, PB); the robust method is a **fee-based classifier** (their KA `is_true_govt`) — adopt statewide where fee data exists, else a curated govt roster.
2. **Rank space varies:** most states AIR-native in our data, but their pipeline often keeps STATE rank (Kerala, Gujarat merit lists) needing conversion. Prefer AIR-native; validate conversions against a known anchor + web to the digit.
3. **Round depth is the biggest cross-state confound.** Our data spans R1 (AIQ) → mop-up (TG). Canonical load should record round per row and ideally **normalize to a common round** via empirical R1→final multipliers (their `_round_multipliers_2025.csv`).
4. **Sub-pool hygiene:** exclude PwD/PHO/CAP/NCC/SG/Orphan/EarMark/NRI/Management from base-category floors; several bugs came from these leaking in.
5. **Best source is per-state, often a COMBINATION:** ours finer (AP SC-split, our R1+R3 union) vs theirs better-classified (KA fee filter) or more complete (their BDS where ours is MBBS-only). The canonical parser merges: our closings + their govt-classifier + their BDS + round-normalization + web anchors.
6. **My recurring cross-check bug:** loose city substring-match conflates Govt Medical with Govt Dental college in the same city (hit MH/AP/PB) — always match **program + exact name**.
7. **Extracted output can be STALE vs raw** (CG: extracted PJNM 180k vs raw 24k). For BQ load, regenerate all extracted from raw and diff — don't trust checked-in extracted CSVs.
8. **Our AIQ data is a per-state cross-check for EVERY Dropbox-only state.** `NEETUG.json aiq_2025_cutoffs` has `State` per college → for any state, take our AIQ-in-that-state govt Open floor, convert AIR→marks via our model, and compare to the state-quota Gen (they close at similar levels for top colleges). Validated TN: our AIQ-in-TN loosest Open = AIR 12,262 → 550 marks ≈ their TN state OC 547 / our state Gen 551. Stronger in-house validation than neetugguidance alone; apply to AS/JK/JH + retro if desired. (Note: TN in our NEETUG.json is AIQ-only — 267 rows — NOT state quota; same for other Dropbox-only states.)

## Extracted-vs-raw consistency spot-check (2026-07-24, after CG stale-file finding)
Recomputed closings from RAW allotments, compared to each state's EXTRACTED `closing_ranks` (exact-name, >5-rank threshold):
- **UP** 50 UR colleges — **0 mismatches** ✓ · **Bihar** 11 — **0** ✓ · **Karnataka** 24 GM — **0** ✓ · **Himachal** 6 — **0** ✓
- **Chhattisgarh** — **STALE** (only one found) → rebuilt from raw.
⇒ Only CG was out of sync; all other Dropbox states' extracted files match raw. Matrices for UP/BR/KA/HP confirmed sound.

## Back-propagation queue → moved to its own doc
The actionable Bucket-B data-bug fix-list (Punjab NRI/govt-quota, Karnataka govt-mislabel, Gujarat no-govt-flag, Himachal thin-parse, + the NOT-bugs list) now lives in **`docs/NEET_DATA_BUGS_BACKPROP.md`** — a standalone queue with severity (P1/P2/P3), file/field, affects-predictor?, and proposed fix. That doc is the self-contained work-order for the parser/data-cleanup pass; keep it as the single source of truth for fixes (don't duplicate the list here).

## Ledger additions — NE states + small UTs (2026-07-27)

| State | Best source | Govt pool | Rank space | Round | Cross-check | Parser/data notes |
|---|---|---|---|---|---|---|
| **Arunachal Pradesh** | **Official APDHTE R1 PDF (ours)** — clean TEXT layer, 718 rows | TRIHMS + nominations (RIMS Imphal, Agartala) | AIR-native | R1 | smooth tail, no cliff | **Only `Cat-I` (APST) exists** — no Gen/OBC/SC split in the source; only ST populated |
| **Meghalaya** | **Official H&FW Order (ours, OCR)** Health.189/2025/66 | GoI/state-reserved nominations across India | **MARKS-native** | Final selected list | block structure self-consistent | **WAITING-LIST rows must be excluded** (Order: nominated only if a selected candidate fails to report). Khasi&Jaintia + Garo = **ST sub-pools, not OBC**. Open 477 = upper bound (2 scores lost to OCR) |
| **Nagaland** | **Official DTE PDF (ours, OCR)** — rotated scan | **GoI Central Pool** nominations | **MARKS-native** | Final selected list | serials prove 66+ rows exist | **PARTIAL — ~12 of 66+ rows recovered**; floor shown is an OVER-estimate. Page rotation 270° |
| **Manipur** | **Official R2 Annexure-A (ours, OCR)** | RIMS + JNIMS + CMC (**SAHS private, excluded**) | AIR-native | **R2 (mid-round → tight)** | ordering check | **SC n=1 gave an inverted floor (AIR 128k, tighter than Gen 141k) → dropped**; ST n=2 dropped. Only Gen n=10 / OBC n=17 reported |
| **Delhi** | **Ours — MCC `Seat Type='Delhi University Quota'`** | MAMC/UCMS/LHMC + MA Dental | AIR-native | R1+R3 | third-party matched exactly | Only 3 colleges; AIIMS/VMMC/ABVIMS/BSA are central, not this pool |
| **Puducherry** | **Ours — MCC `'Internal -Puducherry UT Domicile'`** | JIPMER | AIR-native | R1+R3 | reproduced from official rows | Odd EWS/ST = **real** sparse-pool behaviour, not incoherence |
| **Chandigarh** | **Official GMCH-32 admitted register (ours)** | GMCH-32 | **MARKS *and* AIR per student** | Final admitted list | vs third-party | **Third-party said UR 588; official = 514 (74-mark error)** → third-party discarded |

### Lesson 9 — selected-list vs waiting-list (new)
Nomination-style state lists (Meghalaya, and likely other NE states) print a **WAITING LIST** directly
below each category's **SELECTED LIST**. Taking a block minimum silently imports waiting-list scores
into the floor. **Always cut at the waiting-list header.** Cost if missed: Meghalaya Open would read
439 instead of 477.

### Lesson 10 — a category of n=1 is not a pool (new)
Manipur's single SC allotment produced an SC floor **tighter than Gen** — i.e. advice that an SC
student needs more marks than a General one. Small-n categories must be **left blank**, not published.
General rule for thin sources: require **n ≥ ~10** before treating a category closing as a floor, and
always run the ordering check (no reserved category harder than Gen).

### Lesson 11 — OCR institute patterns are order-sensitive (new)
`NIMS` matches inside `JNIMS`; match longer/more-specific institute tokens FIRST or rows get
attributed to the wrong college (and the wrong state). Same discipline for category tokens
(`OBC-MP` before `OBC`).
