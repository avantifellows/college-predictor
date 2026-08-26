# NEET 2026 min-marks matrix — decisions & provenance log

One line per assumption / data-source choice / compromise, so every number in the final
matrix is explainable later. Scope of this first slice: **AIQ / central only, govt colleges,
MBBS(B1a)+BDS(B1b)+Qualifying(B2b), 2026** (via 2025→2026 mapping). See plan
`~/.claude/plans/resilient-sauteeing-charm.md`.

## Definitions
- **Matrix cell B1a[cat] (2026, AIQ):** the minimum NEET-2026 marks (/720) a `cat` student must score to get **a government MBBS seat anywhere in India via the AIQ (central) list** — i.e. the marks at the *worst-admitted govt-MBBS closing rank* for that category. B1b = same for BDS. B2b = national qualifying floor. (Confirmed w/ Surya+Amogh 2026-07-22.)
- "Minimum to get a seat" = the loosest (deepest-closing) **government** college for that category+program. Private/deemed excluded from the matrix (kept in parsed data).

## Data-source decisions
- **AIQ closing ranks → USE OURS (`NEETUG.json` aiq_2025_cutoffs, R1+R3 union), NOT theirs.** Their `amogh-csv/medical-national-ranks/govt_medical_closing_ranks_r1_2025*.csv` has the SAME "Open" quota-contamination bug we fixed this session (MAMC Open shows 1,031,573 / LHMC 611,573 — Delhi-University/CW domicile pools folded into Open; real MAMC AIQ Open ≈103). Also theirs is R1-only; ours is R1+R3 (deeper = correct round for a "min to get any seat" floor). [2026-07-22]
- **Govt-college roster → USE THEIRS.** `govt_medical_closing_ranks_r1_2025_pivot.csv` has a clean `institute_type` (State-Govt / Central-AIIMS / Central-ESIC / Central-Univ-{DU,IP,BHU,Jamia} / Central-JIPMER) and `govt_medical_colleges_2025-26.csv` (515 govt colleges w/ intake). We reuse this as the authoritative "which colleges are government" filter rather than re-deriving. [2026-07-22]
- Combination: govt filter (theirs) ∩ closing ranks (ours). Match on institute name (fuzzy; log unmatched).
- **2025 marks↔AIR converter → REUSE existing** `score_rank_model.json` (32,093-pair fit), to be AUGMENTED with JNV 2025 pairs and re-fit for L4. [2026-07-22]
- **Cross-check source:** neetugguidance.in AIQ pages (category × rank × score) — second-hand, used only to sanity-check our computed marks, not as primary. [2026-07-22]
- **2026 qualifying floor (B2b):** UR/EWS 213, OBC/SC/ST 177, Gen-PwD ~194, ST-PwD 178 (careers360/NTA). CAVEAT: labeled "Expected/Re-NEET 2026" — must verify NTA-final before shipping. [2026-07-22]

## L1/L3 results (2025 AIQ, done)
- Govt filter: 2,647 govt AIQ rows kept, 115 private excluded. Loosest govt-MBBS Open floor sits in a tight cluster (AIR 20,273–20,989, new Assam/Mizoram/Telangana govt colleges) → robust, not a spike.
- 2025 AIQ min-marks (govt floor, via inverted score_rank_model): MBBS Open **534** / OBC 533 / EWS 527 / SC 457 / ST 436; BDS Open 500 / OBC 509 / EWS 502 / SC 428 / ST 404. Output `scripts/neet_matrix_out/aiq_2025_matrix.csv`.
- CROSS-CHECK (web, [ensureeducation]/[collegedunia]): 2025 AIQ last govt-MBBS General ≈ **525 marks / AIR 26,178** (OBC AIR 26,231). Ours 534 marks / AIR ~21k — same band, slightly tighter (ours R1+R3 union may miss the very last stray-round seat; ± rounding). Method validated. [2026-07-22]
- COMPROMISE: base category only for the matrix so far (PwD sub-pools stripped); PwD-Gen/PwD-cat rows (B2b has them) still TODO for the marks side.

## L4 — 2025→2026 mapping anchors & decisions
- Real 2026 (marks,AIR) evidence, in order of trust:
  - OFFICIAL NTA 2026 cumulative (news, [pw.live]/[shiksha]): AIR1=715 marks; 19 cands ≥700 (→700≈AIR19); top138 ≥690 (→690≈AIR138); **1,492 ≥650 (→650≈AIR1,492)**; ~11.21L qualified. [2026-07-22]
  - JNV 2026 pairs (185, from NTA xlsx `2026 Physical NEET`): span **AIR 40,668 .. 1.59M only** (JNV best ≈40k; no top-end). Δmarks(AIR)=2026−2025 ≈ **+25..+41** across AIR 45k–450k (Surya's eyeballed +30 ≈ correct in mid-range).
  - Qualifying floor: UR 2025=144 → 2026=213 ⇒ Δ=+69 at the very bottom (~AIR 1.3M).
  - Top anchor: AIR~1 → ~715 both years ⇒ Δ≈0.
- DISCREPANCY REJECTED: prep-site "2026: 600 marks→AIR ~16k / 550→~50k" (vedantu/careers360) would imply Δ≈+66 at AIR~20k — MUCH bigger than JNV's +30 and inconsistent with official 650≈AIR1,492 (which puts AIR20k well below 650). Prep-site marks→AIR tables are optimistic/unreliable; NOT used as anchors. Using official cumulative + JNV instead. [2026-07-22]
- MODEL: Δmarks(AIR) is a smooth monotone curve: ~0 at AIR≈1, rising through the observed +25..+41 in the seat range, to +69 at the qualifying floor. Fit robustly to the anchors above (don't overfit 185 noisy JNV pts). 2026 marks-at-AIR = 2025 marks-at-AIR + Δmarks(AIR).
- CAVEAT: our MBBS floors (Open AIR~21k) sit ABOVE the JNV data range (≥40k) → the Δ there is interpolated between the official top anchors (650≈AIR1,492) and the JNV band (AIR45k,Δ+34). Flag as lower-confidence; validate on held-out JNV pts that ARE in range.

## L0 — base reconciliation (ours vs Dropbox), done on the RANK side
- Their long-form `govt_medical_closing_ranks_r1_2025.csv` KEEPS a `quota` column (All India / Open Seat Quota / Delhi University / ESI / AMU / IP / CW …). The Open-contamination I saw earlier was ONLY in their *pivot* file (quotas collapsed into "Open"); the long-form is clean when filtered to the national merit pool {All India, Open Seat Quota}. [correction — I was unfair to their base earlier] [2026-07-22]
- CELL-BY-CELL, loosest govt-MBBS closing AIR per category — OURS(R1+R3) vs THEIRS(R1, national-quota-filtered):
  Open 20,989 vs 21,190 (0.9% apart); OBC 21,452 = 21,452; EWS 25,599 = 25,599; SC 110,389 = 110,389; ST 145,625 = 145,625. **Near-identical / identical.**
- ⇒ The 21k-vs-26k gap vs the one web page is NOT a coverage or round bug — ours and the independent Dropbox base AGREE at ~21k. The ~26k web figure is a different published summary (stray round / site difference). Our rank floor is corroborated. [2026-07-22]
- OPEN: does their `normalize_round_depth` change these (they may project R1→R3-equiv)? Awaiting code read. If it materially moves the floor, revisit.

## L0 — their METHODOLOGY (code read, aca63d27) — 3 findings that change the plan
1. **21k↔26k gap EXPLAINED (round depth).** Their AIQ closing is **R1-only** (conservative). The ~26k web figure is FINAL-round. Their empirical R1→final multiplier for a UR-Mid-tier seat (AIR 5k–50k) = **1.22×**; 21,000×1.22 ≈ 25,600 ≈ web ~26k. So our ~21k floor = R1-conservative; realistic final-round floor ≈ 26k. DECISION NEEDED: "min marks to get a seat" = R1-confident bar OR final-round (looser, lower marks) bar? Round multipliers by (cat,tier) available in `_round_multipliers_2025.csv` (UR Mid 1.22 / Lower 1.29; OBC Mid 1.05/Low 1.09; SC Mid 1.23/Low 1.06; EWS 1.06; ST 1.05; all Top 1.00).
2. **Their curve = empirical monotone cummax ladder (non-parametric), NOT a poly.** Ours = degree-4 poly + log-linear top extrapolation. They overlap on MP/PB → blendable. Refit should use the empirical ladder where dense + keep principled top-end.
3. **They EXPLICITLY reject cross-year MARKS mapping** (paper difficulty shifts year to year) — keep cross-year link in RANK/percentile space, convert to marks WITHIN each year. ⇒ my earlier L4 (Δmarks curve) is the wrong shape. CORRECT design: 2025 closing RANK → same RANK in 2026 (rank≈rank across years) → 2026 MARKS via a 2026 within-year score→AIR curve (from 185 JNV + official anchors). This is cleaner and matches their principle.
- Also: their AIQ pipeline does NO R1+R3 union (ours does); their govt `institute_type` = name-substring heuristic w/ State-Govt catch-all (fragile, not authoritative — fine as filter since private already dropped by quota).
- CROSS-CHECK BONUS: our 2025 score→AIR ladder == theirs to <1% (score 150–550). Two independent calibrations agree.

## REVISED L4/L5 design (rank-space mapping)
- 2025: govt closing AIR per (cat, prog), optionally round-adjusted to final (×tier multiplier) → the RANK floor.
- Cross-year: that AIR floor is ~stable year to year (rank N ≈ rank N; seat supply grows slowly).
- 2026 marks = convert the floor AIR through a **2026 within-year AIR→marks curve** built from the 185 JNV 2026 pairs + official 2026 cumulative anchors (715@1, 700@19, 690@138, 650@1492) + 2026 qualifying floor (213@~1.3M). No cross-year marks arithmetic.

## CORRECTION (important): there are NO real 2026 admission cutoffs yet
NEET 2026 result: 16 Jul 2026; counselling had NOT started as of this work. ⇒ **no 2026 closing ranks exist** — seats aren't allotted yet. Every web "2026 govt-MBBS cutoff (535+/620-680)" is a coaching-site FORECAST, not data. I briefly (wrongly) treated them as "real anchors" — retracted. They are OTHER PEOPLE'S ESTIMATES, usable only as a loose plausibility check on ours, never as ground truth.
REAL 2026 data that DOES exist: qualifying cutoffs (NTA), the 185 JNV (marks,AIR) pairs, topper/cumulative counts (715@1, 650@~1492). That's it.
⇒ The 2026 matrix is UNAVOIDABLY an ESTIMATE (that's the whole L4/L5 point): take verified 2025 closing RANKS, express in 2026 MARKS via the real within-2026 marks↔rank relationship (185 JNV + qualifying + topper anchors). Coaching forecasts = sanity check only.

## (below: the coaching-site FORECASTS — treat as external estimates, not data)
- **"closing/minimum marks" ≠ "safe score".** Sources that say UR 2026 = 620-680 are quoting SAFE SCORE (advice), not the floor. The actual CLOSING/minimum:
- 2026 govt-MBBS AIQ closing (careers360/pw.live, multi-source consistent): **UR 535+, OBC 530+, SC 450+, ST 425+**, at **MCC R1 closing AIR ≈ 21,000–22,000**.
- 2025 govt-MBBS AIQ closing (findmycollege, final-round): UR 525 @ AIR 27,360; OBC 525 @ 27,421; EWS 521 @ 30,921; SC 439 @ 139,123; ST 425 @ 164,804. (2025 R3 last UR seat = AIR 26,178 per careers360.)
- **TRIANGULATION:** our computed 2025 R1-ish floors (UR 534@21k, OBC 533, EWS 527, SC 457, ST 436) sit ~10 marks TIGHTER than published FINAL-round 2025 (UR 525@27k) — consistent with round depth (R1→final ×1.22 on rank ≈ our 21k→27k; marks 534→525). Round-depth finding validated by real data, not just their multiplier.
- **BIG CORRECTION to my earlier +30:** the govt-MBBS FLOOR barely moved 2025→2026 (UR 525→535 ≈ **+10**, not +30). Because at the floor two effects ~cancel: 2026 easier paper (marks↑) vs bigger qualifying pool + more seats (closing rank looser → marks↓). Surya was right to distrust the eyeballed +30. The +25..+41 Δ I saw earlier was from JNV mid-range (AIR 40k-450k) where the balance differs — NOT the floor.
- ⇒ 2026 AIQ matrix should be ANCHORED to these published 2026 floors (real data), using our rank-space method only to fill cells/programs the sources don't give (e.g. BDS, EWS-2026, PwD). Cross-check every produced cell vs these.

## FINAL AIQ matrix (point estimates) — method + result
BASE (2025, verified): national-quota govt floors {All India, Open Seat Quota}, loosest govt college per (prog,cat). Robust clusters; AMU-quota spike (Dr Ziauddin BDS 50,332) removed by the national-quota filter — DECISION: use national-quota-filter, not keyword-govt, to avoid quota-mixed spikes. Our data == their long-form cell-by-cell.
FACTORS (all data-traced):
- Seat growth: govt MBBS intake 60,485→63,683 = **+5.3%** (their seat matrix intake_2024_25 vs _2025_26) ⇒ 2026 closing rank ≈ 2025×1.053 (looser).
- Difficulty shift: measured from 185 JNV 2026 (marks,AIR): Δmarks ≈ **+26..+34 in the 400–500 band** (our floor region; tight sd). Parameterized Δ(m2025)=0.085·max(0,720−m). Applied on top of the 2025 marks-at-rank.
- 2025 marks↔rank: our 32k-pt degree-4 model (== their empirical ladder <1%).
RESULT (2026 est, marks /720): MBBS Open **548** / OBC 547 / EWS 542 / SC 476 / ST 457. BDS Open 528 / OBC 525 / EWS 518 / SC 448 / ST 426. Qualifying B2b 213/177. Output `scripts/neet_matrix_out/aiq_matrix_final.csv`.
SANITY: MBBS-UR 548 sits between coaching "535" (over-weights drift) and rank-fixed ~562; MBBS>BDS; Gen≈OBC>EWS>SC>ST; all ≫ qualifying. ✓
CAVEATS (honest, for the group): (1) MBBS floors (AIR ~21-27k) are ~13k ranks ABOVE the nearest JNV 2026 point (40k) → the +shift there is extrapolated via the 2025 curve shape (small, anchored, not wild). (2) +5.3% seat growth applied uniformly (national avg; not per-tier). (3) PwD-category rows not yet produced (base cats only). (4) This is a PRE-COUNSELLING estimate — revise once MCC 2026 R1 allotment is out.

## PwD rows + Amogh cross-check + rank column (final touches)
- **PwD B1a/B1b = the QUALIFYING floor** (194/194/177/177/178), NOT a closing-rank number. Reason: the PwD sub-pool is sparse and closes at AIR ~0.94M–1.39M (marks ~150-185, i.e. BELOW the qualifying gate). So a PwD candidate's binding minimum to get a govt seat is simply *qualifying*. Good-faith, matches real PwD admission. We still REPORT the deep 2026-est closing AIR next to it (descriptive) so the reader sees "only need to qualify; pool closes ~AIR X". BDS-PwD EWS/SC/ST have zero national-pool seats → marks=qual, rank blank.
- **Amogh's multiplier model cross-check** (`NTA NEET 2025 - score rank model.csv`): his multiplier = 2026_AIR/2025_AIR at same marks (~2.9 @650 → ~1.43 @466). Same difficulty phenomenon as our shift, in rank-ratio space. RECONCILED: at the floor band (450-534 marks, where our matrix lives) his mult ≈ 1.43 vs our implied ≈ 1.37 — AGREE. His diverges at the top (2.9 vs our capped 1.0) but the top is irrelevant to govt floors. ⇒ our numbers validated; kept our method, logged his as concurring cross-check. (His top-end is actually more correct if we ever need it.)
- OUTPUT now carries MARKS **and** AIR per cell (Surya: more descriptive/confidence). `scripts/neet_matrix_out/aiq_matrix_final.csv`.

## FINAL 2026 AIQ MATRIX (marks / est AIR)
Gen 548/22313 · Gen-EWS 542/26956 · OBC 547/22589 · SC 476/116240 · ST 457/153343 (MBBS);
BDS: 528/40249 · 518/51194 · 525/43592 · 448/169439 · 426/217035. PwD rows = qualifying (194/194/177/177/178) with deep pool AIRs shown.

## STATE SLICE — MAHARASHTRA (done)
Builder: `scripts/neet_matrix_state.py` → `scripts/neet_matrix_out/maharashtra_matrix_final.csv`.
- **SCOPE:** MH **State Quota** (85%, domicile) govt seats only. Source `maharashtra_2025_r3_cutoffs` in `NEETUG.json` (verified AIR-native — GSMC Mumbai OPEN=2571 matches web/Dropbox). Same rank→marks machinery as AIQ (reuse `score_rank_model.json` + `shift_2026.json`). [2026-07-23]
- **CATEGORIES (per Amogh, "just do OBC not SEBC for now"):** MH row = MH's literal category bucket only — Gen←OPEN, Gen-EWS←EWS, OBC←OBC (ignore SEBC/NT/VJ/DT for now), SC←SC, ST←ST. PwD rows = qualifying-gated (as AIQ). [2026-07-23]
- **SEAT GROWTH = 1.008** (MH govt MBBS intake ~6025→6075, +0.8%) — NOT the AIQ national +5.3%. So MH ranks barely drift; the 2025→2026 move is almost entirely the difficulty shift (+18..+32 marks), rank essentially flat. [2026-07-23]
- **FLOOR RULE = loosest (max) closing AIR** across a base category's GENERAL sub-pools, EXCLUDING PwD / Orphan / EarMark (separate deep pools). In MH the loosest is the **"(Home Univ)" domicile-protected** variant — the most-accessible door — so "loosest" picks it up naturally. Verified the floor colleges are real, clustered, remote-district GMCs (Gadchiroli, Bhandara, Hingoli, Buldhana, Akola), not lone outliers. [2026-07-23]
- **BDS govt filter FIX:** MH govt dental = "GDC"/Government Dental (GDC Mumbai/Nagpur/Jalgaon); private dental is named "<X> DC" (ACPM DC, Aditya DC…). Made `is_govt()` program-aware (`prog=="BDS"` → GDC-only) — earlier a blanket `"dental" not in name` had wrongly zeroed the whole BDS column. [2026-07-23]
- **RESULT (2026 est, marks / AIR):**
  MBBS: Gen 518/51k · Gen-EWS 496/82k · OBC 503/72k · SC 445/176k · ST 369/346k.
  BDS: Gen 488/96k · Gen-EWS 477/115k · OBC 473/121k · SC 416/237k · ST 328/460k.
  PwD rows = qualifying (194/194/177/177/178) with deep-pool AIR shown.
- **KEY TAKEAWAY (the domicile story, quantified):** MH state-quota Gen-MBBS door ≈ **518 marks / AIR ~51k** vs AIQ national Gen ≈ **548 / ~22k** — a Maharashtra-domicile student's easiest govt-MBBS route needs **~30 fewer marks** than the all-India route. Confirms state quota is materially gentler than AIQ; the "loosest = Home-University remote-GMC" seats are what make it so. [2026-07-23]
- **CAVEATS:** OBC is MH-literal-OBC only (SEBC/NT/VJ deferred — a real MH OBC student choosing the looser of OBC-vs-SEBC would face a lower floor than shown). Pre-counselling estimate. Same difficulty-shift extrapolation caveat as AIQ applies to the tightest (Gen/OBC) MBBS floors.

## MH two-pipeline reconciliation (ours vs their Dropbox medical-state-counselling), done 2026-07-23
- Compared our matrix floors vs THEIR `MH_closing_ranks_state_govt_2025.csv` (they convert MH state-rank→AIR via a fitted curve; we're AIR-native). Loosest govt-MBBS closing AIR per base cat: OPEN 50,633 vs 52,437 (~3%); OBC 71,114 = 71,114 (exact); EWS 81,235 = 81,235 (exact, GMC Amaravati Home-Univ — their file ALSO has orphan-EWS at 755k/1M which must be excluded, our matrix does); SC 174,342 vs 176,807 (~1.4%); ST 343,520 = 343,520 (exact). ⇒ two independent pipelines AGREE; 3/5 identical to the rank. We're at least as good AND simpler (AIR-native, no state-rank→AIR conversion step; R1+R3 union = deeper/correct floor). Their extra buckets (SEBC/NT/VJA) are the only thing we don't emit (deferred per Amogh). [2026-07-23]

## STATE SLICE — TELANGANA (done 2026-07-23)
Builders: `scripts/neet_matrix_telangana.py` → `scripts/neet_matrix_out/telangana_matrix_final.csv`.
- **AIR-NATIVE (verified 3 ways):** our `telangana_2025_cutoffs` has `rank_space="NEET AIR"`; anchor seats (Gandhi OPEN 11444/14005, Osmania 15611) match THEIR Dropbox TG file to the DIGIT; web corroborates magnitudes (top Osmania/Gandhi ~2.6k-5.5k AIR, floor much deeper). [2026-07-23]
- **TWO-PIPELINE RECONCILIATION = IDENTICAL.** Our MBBS loosest govt closing AIR vs their `TG_closing_ranks_state_govt_2025.csv` matches on ALL 11 sub-groups to the exact rank (SC3 off by 4). Strongest validation so far. Note their TG file names the col `closing_rank` but it IS AIR (unlike MH's explicit `closing_air`) — confirmed by the digit-match. [2026-07-23]
- **CATEGORY FRAGMENTATION (the real work):** TG splits SC→SC1/SC2/SC3 and OBC→BCA/BCB/BCC/BCD/BCE. Collapse rule (Surya): large spread → MEDIAN of sub-floors (drops sparse-pool outliers); small spread → median too, for consistency. SC spread 4.7× (SC1=AIR 1.21M, a near-empty sub-pool ≈ qualifying) → median = SC2/SC3 cluster ≈ 266,602. OBC spread 1.8× → median (BCB) 210,673. Documented per Surya's ask. [2026-07-23]
- **This collapse choice does NOT affect MH or AIQ** — neither fragments SC/OBC (MH OBC is a single bucket, SEBC already scoped out; AIQ uses national single buckets). Only fragmented states (TG, later KA) use the median rule. [2026-07-23]
- **BDS = pulled from THEIR pipeline** (our TG parse is MBBS-only). Their 18 govt-BDS rows (GDC&H Hyderabad, AIR-space). Honest gaps: EWS-BDS and SC1-BDS have ZERO govt dental seats → those cells fall back to qualifying (correct, not a miss). [2026-07-23]
- **SEAT GROWTH = 1.008** (placeholder like MH; TG's college expansion already reflected in the deep 2025 floors, no evidence of further large 2026 jump). PwD rows = qualifying (deep sub-pool).
- **CATEGORY FRAGMENTATION:** TG splits SC→SC1/SC2/SC3 and OBC→BCA/BCB/BCC/BCD/BCE. Collapse = MEDIAN across sub-groups (agreed on the group thread — Amogh's "just take median and move on", Priyanka "doesn't over-qualify"; Amogh's ideal seat-weighting deferred as we lack per-sub-cat seat shares). SC1 (near-empty pool) dropped by the median; SC uses the SC2/SC3 cluster. [2026-07-23]

## FLOOR RULE CHANGE — "median of loosest-5 colleges" (supersedes the 1.08× trim), 2026-07-24
- **Trigger:** web cross-check said TG state-quota Gen ~515-535, but our floor was ~408. Investigation showed BOTH are true — they're opposite ends of a WIDE within-state range: TG Gen govt-MBBS spans **552 marks (Gandhi/Osmania, tightest) → 408 (GMC Kumuram Bheem Asifabad, deepest mop-up seat)**. The web quotes the top/safe end; our old floor quoted the single deepest mop-up seat. NOT an AIQ-vs-state gap (that's ~30-50 marks, confirmed: AIQ-TG UR 526 vs state-top ~552 ≈ equal). The ~100-mark "gap" was tightest-vs-loosest WITHIN state quota. [2026-07-24]
- **DECISION (group thread, Amogh/Priyanka/Venu + my recommendation):** floor = **MEDIAN of the loosest-N colleges (N=5)**, per category. Rationale: the single deepest seat is one fragile mop-up allotment at the remotest college (may not recur 2026); median-of-last-5 is robust to it WITHOUT over-qualifying students (Priyanka). Only nudges TG Gen 408→419 (~11 marks). Replaces the earlier `robust_floor`/1.08×-trim hack (deleted — it was a size-of-gap proxy that couldn't tell a real deep college from an empty pool, and fired on the wrong case). [2026-07-24]
- **UNIFIED across states:** loosest-per-college → median-of-last-5. For fragmented categories: collapse sub-cats by median first, then the same. Applied to TG **and** MH (MH clusters are tight so it barely moves MH — kept for consistency). AIQ left as national-loosest (its clusters already tight; noted, not re-run). [2026-07-24]
- **VERIFIED (AIR-native, 3rd way):** careers360 real Q — "TG ST student, state merit rank 12,715, will he get a govt seat?" Our tightest ST govt seat closes at AIR 71,292; if our numbers were STATE rank, 71k would be absurd; as AIR, rank 12,715 gets in easily (matches the hopeful tone). Confirms TG numbers are AIR, not state-rank. [2026-07-24]
- **PHO contamination checked:** the AIR>1M "OPEN" rows are all `OPEN (PHO)` (PwD sub-pool) and are correctly excluded by the SUBPOOL filter — they did NOT contaminate the base floor. [2026-07-24]
- **RESULT (2026 est, marks / AIR) — after median-of-last-5:**
  MBBS: Gen 444/178k · Gen-EWS 445/177k · OBC 434/199k · SC 403/266k · ST 415/239k.
  BDS: Gen 430/207k · Gen-EWS =qual · OBC 423/223k · SC 390/295k · ST 399/274k.
- **TAKEAWAY:** TG govt floors looser than MH (Gen MBBS ~444 vs MH ~518 vs AIQ ~548) — real, driven by ~8 new remote/tribal GMCs (Kumuram Bheem, Mulugu, Narsampet, Nirmal…) that fill deep. But NOT a 100-mark AIQ-gap story — that was a definitional artifact (tightest-vs-loosest); the robust floor (median-of-5) sits ~135 below the top college, which is the honest "reliably reachable deepest govt college" number. [2026-07-24]
- **CAVEATS:** median reports the TYPICAL sub-group/college, not the emptiest — a student in a sparse sub-caste (SC1) or willing to take the single remotest mop-up seat faces an even looser door than shown. Pre-counselling estimate; no independent state-quota web cross-check exists (KNRUHS-only), so TG state floor rests on two-pipeline agreement (exact) + internal college-gradient sanity.

## STATE SLICE — KARNATAKA (done 2026-07-24)
Builder: `scripts/neet_matrix_karnataka.py` → `scripts/neet_matrix_out/karnataka_matrix_final.csv`.
- **FIRST STATE WHERE THEIRS > OURS → we switched source to THEIR pipeline.** Our `karnataka_2025_r3_cutoffs` is thin (318 rows) and its "Government" seat-type label is CONTAMINATED with private/minority colleges (Al-Ameen, Srinivasa, S R Patil, Farookh, Khaja Bande Navaz — all fee ~Rs 153k+, not govt), which inflated our GM floor to ~76k. Their `KA_closing_ranks_state_govt_2025.csv` has 703 MBBS rows across all 24 true-govt colleges. When both filtered to true-govt, OUR name-matching recovered only 5/24 colleges → our side too lossy to trust. Decision: **use theirs as primary for KA.** (This is the "compare both, take the better" case Surya's flow anticipated.) [2026-07-24]
- **GOVT FILTER = their `KA_college_govt_classification.csv` `is_true_govt` — a FEE-BASED classifier** (genuine govt charge ~Rs 64,350; private/minority ~Rs 153k-166k). Clean separation. Better than any name heuristic; we adopt it. [2026-07-24]
- **AIR-NATIVE confirmed:** their tightest GM true-govt = Bangalore Medical College AIR 3,478 — matches ours to the digit + KA's known top govt closing. [2026-07-24]
- **CATEGORIES (decode confirmed vs 3 sources: mbbscouncil + neet2seat KA category guides + neetugguidance):** KA codes = <vertical><suffix>; suffix G=general/plain(default), H=HK-region(Art.371J), K=Kannada-medium, R=Rural, KH/RH=combos. Use the plain **G** variant (= "standard pathway, no advantage" per neet2seat): Gen←GM, SC←SCG, ST←STG.
- **OBC — NOT deferred (Surya insisted).** KA splits OBC into 1/2A/2B/3A/3B (own G-variants). Collapse = **SEAT-WEIGHTED median** (Amogh's method): weights = KA reservation %s (2A=15% DOMINANT; 1=4%, 2B=5%, 3A=4%, 3B=4% — confirmed vs neet2seat; 2024 Muslim-quota redistribution leaves 2B/3A/3B slightly uncertain but all ~4-5%, 2A=15% is the robust anchor). Sub-cat floors span AIR 52,537 (3AG, tightest) → 73,334 (2AG, loosest); plain median = 59,756 but seat-weighted = **67,350** (pulled toward 2A, the biggest/most-accessible OBC pool → the honest "typical OBC door", avoids over-qualifying). Result OBC = 506 marks, sits just below GM 512 — matches neetugguidance AIQ pattern (OBC≈GM). [2026-07-24]
- **EWS — NOT a gap (resolved after Surya pushed + more Googling).** KA policy HAS 10% EWS, BUT it is **carved from GM and NOT allotted as a separate vertical** in KEA counselling data → confirmed absent from BOTH pipelines' every code AND their finer R1+R2+R3 all-allotments file (exhaustive check, not a parse miss). Multiple sources (vedantu/collegedekho): "EWS is a sub-division within GM, not a separate vertical." So **Gen-EWS ← GM floor** (EWS tracks GM slightly below; neetugguidance AIQ shows EWS ~4 marks under GM). A grounded modeling choice, not a blank. (Ignored a garbled web "EWS 2025 = 146-163 marks" — that's the qualifying floor, not an admission cutoff.) [2026-07-24]
- **FLOOR = median of loosest-5 true-govt colleges** (unified rule). PwD = qualifying. SEAT_GROWTH=1.008.
- **RESULT (2026 est, marks / AIR):** MBBS Gen 512/59k · Gen-EWS 512/59k (=GM) · OBC 506/68k · SC 426/216k · ST 445/177k. BDS Gen 483/104k · EWS 483 · OBC 478/112k · SC 405/259k · ST 407/256k. PwD = qualifying.
- **NOTE — ST(445) > SC(426) in marks (ST tighter than SC): EXPLAINED, real.** ST is Karnataka's SMALLEST reservation (3% vs SC 15% — confirmed neet2seat) → small seat pool fills tighter/quicker; STG's loosest-5 (173k-217k) genuinely tighter than SCG's (188k-229k). Kept as-is (state-specific truth), NOT forced to conventional SC<ST — same principle as Gen/EWS near-ties. [2026-07-24]
- **CAVEAT:** used the plain-G (general) variant, not HK-371J/Rural/Kannada sub-pools (those close much deeper — an HK-region-domicile student faces a far looser door than shown; HK can be 70% of seats at HK-region colleges). BDS govt = Government Dental College(s) only. Pre-counselling estimate.

## STATE SLICE — GUJARAT (done 2026-07-24)
Builder: `scripts/neet_matrix_gujarat.py` → `scripts/neet_matrix_out/gujarat_matrix_final.csv`.
- **RETRACTION of my earlier "GJ is problematic / state-rank needs conversion" claim — that was MY unfounded assertion, not Surya's.** Investigated: our `gujarat_2025_cutoffs` IS clean AIR-native (rank_space=NEET AIR; B.J. Medical OPEN = AIR 4,016, plausibly looser than the AIQ 889 per web). The scary "4,016 vs 6,027" gap dissolved on inspection: (a) their `GJ_closing_ranks_state_govt_2025.csv` is actually a SEAT-COUNT matrix, not ranks (values increase monotonically down colleges; PH sub-cols =1,20,29 = impossible ranks) — I wrongly compared our AIR to their seat count; (b) their merit list is too sparse at the top (floor at state-rank 255 → AIR 6027) to resolve anything tighter. Neither contradicts our 4,016. NO real GJ data problem on our side. [2026-07-24]
- **SOURCE = OURS** (R3, State Quota, AIR-native). **GOVT FILTER = name-based, matched to THEIR `mgmt` classification** in `GJ_closing_ranks_GQ_all_2025.csv`: mgmt ∈ {Govt(7), Govt-Society GMERS(13), Govt-Society Municipal(1)} = 21 true-govt colleges. GMERS ARE government (state-society, subsidized) → INCLUDED. Excluded: 'Private (govt-quota)' (Parul/Zydus/GCS/C.U.Shah…) and trust-run 'Narendra Modi Medical College'. [2026-07-24]
- **CATEGORIES:** GJ = OPEN, EW(EWS), **SE(=SEBC = Gujarat's OBC, single bucket)**, SC, ST. Gen←OPEN, Gen-EWS←EW, **OBC←SE directly** (per Surya — unlike MH where SEBC was an EXTRA bucket to defer, GJ's SE IS its sole OBC, so use it). SC←SC, ST←ST. PwD=qualifying. [2026-07-24]
- **BDS govt filter FIX (program-aware, same bug as MH):** BDS govt = "Government Dental College" (Ahmedabad + Jamnagar); a plain "government medical" filter zeroed BDS. Fixed → BDS now populated. [2026-07-24]
- **Municipal state-quota seats verified real:** NHL Municipal has OPEN closings at AIR 59,869 (Seat Type "Other" = municipal/local quota) AND 161,862 (Seat Type "State Quota"). The 161k is the genuine state-quota general closing (NHL is less-preferred for the general pool). Builder filters to State Quota → uses 161,862, correctly. median-of-5 dilutes it. [2026-07-24]
- **FLOOR = median of loosest-5 true-govt colleges** (unified rule). SEAT_GROWTH=1.008.
- **RESULT (2026 est, marks / AIR):** MBBS Gen 502/73k · Gen-EWS 500/76k · OBC 497/81k · SC 457/152k · ST 330/450k. BDS Gen 471/125k · EWS 460 · OBC 455 · SC 343/410k · ST 269/685k.
- **NOTE — GJ ST closes VERY deep (AIR ~450k MBBS, ~685k BDS → marks 330/269):** verified real, a tight cluster across many GMERS govt colleges (loosest-8 span 431k-460k), not an outlier. Gujarat has a large tribal (ST) population + substantial ST reservation at the newer GMERS colleges → ST seats fill very deep. Kept as-is. [2026-07-24]
- **CAVEAT:** used general/state-quota seats, not the municipal-local "Other" sub-pools (those close tighter for locals). Pre-counselling estimate.

## STATE SLICE — ANDHRA PRADESH (done 2026-07-24)
Builder: `scripts/neet_matrix_andhra.py` → `scripts/neet_matrix_out/andhra_matrix_final.csv`.
- **Structurally = Telangana** (AP+TG shared the pre-2014 scheme): OC(Gen)/EWS/SC1-3/ST/BCA-E + PH/CAP/NCC/SG/CON modifiers. Reused the TG playbook.
- **SOURCE = OURS** (`andhra_2025_r3_cutoffs`, State Quota, MBBS). AIR-native — Andhra Medical College OC = AIR 15,377, matches THEIR `closing_AIR` 15,949 within ~3.6%. Ours FINER (SC kept as SC1/SC2/SC3; theirs pre-collapses to single SC) + 909 rows vs their 121 → ours primary. [2026-07-24]
- **GOVT FILTER = name-based** (18 govt colleges): "Government Medical College" + classic named (Andhra/Guntur/Kurnool/**Rangaraya**/Sri Venkateswara/Siddhartha/Sri Padmavathi/ACSR). Their 17-row summary MISSED Rangaraya (Kakinada), which IS govt (105 allotment rows in their all-allotments) → included. [2026-07-24]
- **CATEGORIES:** OC→Gen, EWS→Gen-EWS, SC(SC1/2/3)→SC via **MEDIAN of sub-groups**, BC(BCA-E)→OBC via **MEDIAN of sub-groups**, ST→ST. (Used plain median here like TG, not seat-weighted — AP sub-cat seat shares not readily available; median is the agreed proxy.) [2026-07-24]
- **BDS = pulled from THEIR pipeline** (our AP is MBBS-only). Their BDS has a single 'SC' (not split) → BDS SC uses that. EWS-BDS absent → qualifying. [2026-07-24]
- **ORDERING matches neetugguidance AP-AIQ** (UR 528, OBC 528, EWS 525, SC 448, ST 433): our state result EWS(508) slightly looser than OC(512), ST looser than... no — SC(457)>ST(422) here in marks, i.e. ST looser than SC, consistent with AIQ (SC 448 > ST 433). EWS just below OC. NOT forced. [2026-07-24]
- **FLOOR = median of loosest-5 govt colleges** (unified rule). SEAT_GROWTH=1.008.
- **RESULT (2026 est, marks / AIR):** MBBS Gen 512/59k · Gen-EWS 508/64k · OBC 489/93k · SC 457/152k · ST 422/225k. BDS Gen 480/110k · EWS =qual · OBC 457/152k · SC 432/203k · ST 404/265k.
- **PROPER RECONCILIATION (redone 2026-07-24 after Surya flagged I did AP too fast — first pass validated on ONLY 1 anchor).** EXACT-name per-college OC cross-check, all 17 govt colleges ours-vs-theirs: **16/17 agree within 0.85-1.35×** (ours consistently ~1.0-1.19× = our R3 vs their round depth — expected). The 1 "outlier" = GMC Machilipatnam (ours OC 51,589 vs theirs 150,677): investigated → THEIRS is WRONG (they folded the OC-BSG special sub-pool seat 150,677 into main OC; our data correctly separates OC-general from OC-BSG and excludes BSG). So ours is more accurate there. ⇒ AP matrix values CONFIRMED. (Lesson: my earlier quick cross-checks used sloppy substring matching that manufactured fake gaps — Guntur/Kadapa/Nellore all dissolved under exact-name matching; the matrix numbers were always fine, the validation was lazy.) [2026-07-24]

## STATE SLICE — KERALA (done 2026-07-24)
Builder: `scripts/neet_matrix_kerala.py` → `scripts/neet_matrix_out/kerala_matrix_final.csv`.
- **MOST COMPLEX CATEGORY SCHEME yet — Kerala communal reservation.** Codes: SM(State Merit=open), EW(EWS), SC, ST, and 9 SEBC/OBC COMMUNITIES {EZ Ezhava, MU Muslim, BH, LA Latin-Catholic, DV Dheevara, VK Viswakarma, BX, KN, KU Kudumbi}, plus SM-*/FL-* combos and special pools (DA/PD/PI/SD/XS/NC/AC…). Decoded vs their pipeline's column set. [2026-07-24]
- **SOURCE = OURS** (`kerala_2025_cutoffs`, State Quota). **AIR-native — VERIFIED RIGOROUSLY (learned from the AP too-fast lesson).** Their pipeline keeps KERALA STATE RANK (TVM SM = state rank 370, per web), ours has AIR. Converting THEIR state ranks → AIR via their merit list reproduces OUR AIR **EXACTLY** for govt colleges: Alappuzha 10045=10045, Ernakulam 10555, Kannur 10536, Kottayam 7207, Manjeri 9914 (all exact). Plus TVM SM-AIR 4,840 lines up with the AIQ AIR 4,913 (web). ⇒ ours correctly AIR-native, no mislabel. (The 3 apparent mismatches — Kozhikode/Thrissur/TVM — were my city-substring check conflating the govt college with a PRIVATE college in the same city; govt values all matched.) [2026-07-24]
- **GOVT FILTER = program-aware name:** "Govt./Government Medical College" (MBBS, 17) / "Govt./Government Dental College" (BDS, 6). Private (Amala/MES/SUT/Malabar/Pushpagiri/Travancore…) excluded. [2026-07-24]
- **CATEGORIES:** SM→Gen, EW→Gen-EWS, SC→SC, ST→ST. **OBC = MEDIAN of the 9 SEBC communities.** Sub-floors span AIR 18k (BH) → 253k (KU, sparse community); median = VK 25,492, correctly ignoring the sparse KU/KN tail. [2026-07-24]
- **FLOOR = median of loosest-5 govt colleges** (unified rule). SEAT_GROWTH=1.008. PwD=qualifying.
- **RESULT (2026 est, marks / AIR):** MBBS Gen 570/10k · Gen-EWS 539/30k · OBC 543/25k · SC 438/191k · ST 360/369k. BDS Gen 529/39k · EWS 507 · OBC 507 · SC 407/256k · ST 289/600k.
- **⚠ CRITICAL FRAMING NOTE (Surya flagged the Gen number as unbelievable — good catch; investigated, number is RIGHT but the framing matters):** Kerala Gen state-quota (SM) = AIR ~10,555 / ~555 marks (2025), which is TIGHTER than Kerala's AIQ Gen (AIR ~26,117 / ~526 marks per neetugguidance). Normally impossible (a student good enough for the tighter door takes the looser AIQ). BUT verified real: BOTH pipelines agree exactly (their state-rank 904 → AIR 10,555 = ours), because Kerala **SM (State Merit) is NOT a fill-to-bottom open pool** — it's only ~40-50% of state seats, pure-merit, filled by Kerala's many top scorers → closes tight. A GENERAL (non-community) Kerala student can only compete for SM, so their state door (555) is actually WORSE than their AIQ door (526) — **general students gain nothing from Kerala state quota; they use AIQ.** State quota's benefit is entirely on the RESERVED side (SC AIR 191k, ST 369k, EZ/MU ~25-33k — all far looser than AIQ). So do NOT present "Kerala Gen = highest/hardest" without this: it's not that general Kerala students face a brutal state door, it's that they bypass it. Kerala is the ONLY state so far where the general state-quota door is tighter than AIQ. [2026-07-24]
- OBC(543) fractionally above EWS(539) — a 4-mark near-tie (Kerala's EZ/MU communities close tighter ~19-24k than EWS ~29k); real, not forced. [2026-07-24]

## STATE SLICE — PUNJAB (done 2026-07-24)
Builder: `scripts/neet_matrix_punjab.py` → `scripts/neet_matrix_out/punjab_matrix_final.csv`.
- **SOURCE = OURS** (`punjab_2025_cutoffs`, Round 2, AIR-native). Reconciled on GOVT MEDICAL colleges: GMC Patiala ours 15,289 vs theirs 17,605 (~1.15× = our R2 vs their round); GMC Amritsar 27,393 vs 37,245. Consistent (ours slightly tighter = earlier round). [2026-07-24]
- **⚠ 3rd repeat of MY substring bug:** first saw a scary "6.5×" gap (Patiala 15k vs 100k) — it was my loose city-match grabbing **Govt DENTAL College Patiala (100,547)** to compare against our medical Open. Must match program + exact name. Logged as a standing lesson.
- **GOVT FILTER = name-based true-govt** (matches their state_govt set): "Government Medical/Dental College" + "Ambedkar State Institute" + "ESIC Medical" + "Guru Gobind Singh Medical" (Faridkot). Our **"Govt. Quota" SEAT TYPE is contaminated** (private Gian Sagar/PIMS/Adesh/DMC/RIMT have govt-quota SEATS but aren't govt colleges) → excluded by name filter. Also filter Seat Type ∈ {Govt. Quota, Open Quota} to drop NRI/Mgmt (caught GMC Patiala Open NRI row at AIR 1,094,655 leaking in). [2026-07-24]
- **CATEGORIES:** Open→Gen, EWS→Gen-EWS, "Backward Classes"→OBC, "Scheduled Caste"→SC. **Punjab has NO ST govt seats** (negligible ST population; both pipelines' category sets = {Open,SC,EWS,BC}, no ST) → ST row = qualifying (177), an honest structural gap, not a miss. Horizontal pools (Sports/Border/Backward-Area/Defence/Riots/Terrorist) excluded. [2026-07-24]
- **CAVEAT: only 5 true govt MBBS colleges in Punjab** (Patiala, Amritsar, Ambedkar-Mohali, ESIC, GGS-Faridkot). median-of-5 therefore uses the ENTIRE govt population — it's the true floor, not a sample, but there's no room for the rule to discard an outlier. [2026-07-24]
- **FLOOR = median of loosest-5 govt colleges** (unified). SEAT_GROWTH=1.008. R2 data (ours) may run slightly tight vs a final round.
- **RESULT (2026 est, marks / AIR):** MBBS Gen 541/28k · Gen-EWS 522/46k · OBC 527/41k · SC 430/206k · ST =qual(177). BDS Gen 495/84k · EWS 477 · OBC 483 · SC 394/286k · ST =qual. (OBC 527 fractionally > EWS 522 — 5-mark near-tie, BC closes a touch tighter than EWS; not forced.)

## STATE SLICE — MADHYA PRADESH (done 2026-07-24)
Builder: `scripts/neet_matrix_mp.py` → `scripts/neet_matrix_out/mp_matrix_final.csv`.
- **SOURCE = OURS** (`mp_2025_cutoffs`, Round 1, AIR-native). A clean "our source wins" case — minimal fixing.
- **STRONGEST model validation yet:** their pipeline provides an independent `closing_neet` (marks) column; OUR AIR→marks curve reproduces it to **within 1 mark** across the whole range (AIR 44158→506 vs their 507; 39937→510 vs 511; 165893→425 vs 424; 317384→349 vs 349; 35102→515 vs 516). Two independent pipelines' marks agree to the digit. [2026-07-24]
- **GOVT FILTER = our `Seat Type=="GOVT"` — VERIFIED CLEAN** (17 real govt colleges; private Sri Aurobindo/LNCT correctly tagged Private). Unlike KA/PB, MP's govt flag is trustworthy → used as-is. [2026-07-24]
- **CATEGORIES:** compound code VERT/HORIZ/SUB. VERT∈{UR,OBC,SC,ST,EWS}, HORIZ∈{X=none/general, GS, PH=PwD, SN, FF}, SUB=OP. Base floor = the **/X/** general-horizontal variant (UR/X/OP→Gen etc). PH excluded from base; PwD row=qualifying. [2026-07-24]
- Reconcile vs theirs (govt medical, exact name): MGM Indore ours 8,510 vs theirs 11,467 (~1.35×); Bhopal/Gwalior/Jabalpur/Vidisha ~1.0-1.2×. Consistent (both R1). (The "Indore 8k vs 74k" I first saw = MY substring bug AGAIN, grabbed Govt Dentistry College Indore — 4th time; must match program+exact name.) [2026-07-24]
- **FLOOR = median of loosest-5 govt colleges.** SEAT_GROWTH=1.008. R1 → runs strict (like AIQ).
- **RESULT (2026 est, marks / AIR):** MBBS Gen 519/50k · Gen-EWS 514/56k · OBC 517/53k · SC 439/189k · ST 363/361k. BDS Gen 504/71k · EWS 496 · OBC 488 · SC 414/242k · ST 342/417k. (Gen/OBC/EWS cluster tight 514-519; ST deep — MP large tribal pop.)

## STATE SLICE — WEST BENGAL (done 2026-07-24)
Builder: `scripts/neet_matrix_wb.py` → `scripts/neet_matrix_out/wb_matrix_final.csv`.
- **SOURCE = OURS** (`westbengal_2025_cutoffs`, Round 1, AIR-native). Reconciled vs theirs (exact-ish name): Medical College Kolkata 15,419 vs 16,403; Nilratan 9,842 vs 10,597; Bankura/Burdwan/Midnapore ~1.08-1.10× (ours R1 vs their R2). [2026-07-24]
- **GOVT FILTER = their state_govt college set (25) + JMN & Jakir Hosain** (two newer govt medical colleges in our data but missing from their closing summary; verified govt via all-allotments). Excludes private (IQ City, ICARE, JIS, KPC, Jagannath Gupta, Gouri Devi, East West, Santiniketan, Krishnanagar) + private dental. [2026-07-24]
- **CATEGORIES:** UR→Gen, EWS→Gen-EWS, SC→SC, ST→ST. **OBC split OBC-A / OBC-B (both Non-Creamy Layer) → OBC = MEDIAN** (both ~46-49k, median 45,712). [2026-07-24]
- **NOTE — EWS(479) notably below Gen(526)/OBC(523):** verified REAL (not a bug). WB EWS is a thin 10% pool; its loosest-5 are remote district colleges (Jakir Hosain 199k, JMN 174k, Jalpaiguri 109k) where EWS closes very deep → EWS floor AIR 109,683. Same thin-pool effect seen elsewhere; kept, not forced. [2026-07-24]
- **Management-quota contamination correctly excluded:** JMN/Jakir Hosain had UR rows at AIR 734k/836k tagged `Seat Type=Management Quota` — builder filters to State Quota so these don't leak (5th time a throwaway CHECK script without the seat-type filter misled me while the BUILDER was correct — standing lesson: mirror builder filters in checks). [2026-07-24]
- **FLOOR = median of loosest-5 govt colleges.** SEAT_GROWTH=1.008. R1 → runs strict.
- **RESULT (2026 est, marks / AIR):** MBBS Gen 526/42k · Gen-EWS 479/110k · OBC 523/46k · SC 452/161k · ST 291/587k. BDS Gen 513/58k · EWS 469 · OBC 511 · SC 435/197k · ST 280/641k. (ST very deep — WB ST thin pool; median handles 1M-AIR outliers.)

## STATE SLICE — HIMACHAL PRADESH (done 2026-07-24)
Builder: `scripts/neet_matrix_hp.py` → `scripts/neet_matrix_out/hp_matrix_final.csv`.
- **SOURCE = THEIRS** (`HP_closing_ranks_state_govt_2025.csv`). Our `himachal_2025_r3_cutoffs` is TOO THIN (34 rows; parsed ONLY General for MBBS — OBC/SC/ST absent). Theirs has 6 govt colleges × full category set. VERIFIED they agree: their General MBBS closings == ours to the DIGIT (32531/38539/49648/61611/72199/82997). AIR-native (`closing_neet_air`). Same "theirs wins" as Karnataka. [2026-07-24]
- **GOVT**: their file is govt-only (6 MBBS: IGMC Shimla, Tanda, Nerchowk, Hamirpur, Nahan, Chamba; 1 BDS: HP Govt Dental Shimla). **CATEGORIES:** General→Gen, OBC→OBC, SC→SC, ST→ST. **No EWS in HP state counselling** (absent from both pipelines' MBBS) → Gen-EWS = qualifying. Special pools (Backward Area/Tibetan/Defence/Single-Girl/J&K) excluded. [2026-07-24]
- **CAVEAT — least robust of all states:** only 6 govt MBBS colleges (median-of-5 ≈ whole population) and **1 govt BDS college** (BDS floor = that single college per category, not a distribution). Complete but thin. [2026-07-24]
- **NOTE — reserved cats compress toward Gen** (SC 476 / ST 479 vs Gen 510): characteristic of a small hill state — small reserved pools + whole-state domicile competition compress the category spread. Real. [2026-07-24]
- **FLOOR = median of loosest-5.** SEAT_GROWTH=1.008. R3 final.
- **RESULT (2026 est, marks / AIR):** MBBS Gen 510/62k · Gen-EWS =qual · OBC 511/60k · SC 476/117k · ST 479/110k. BDS Gen 469/128k · OBC 482 · SC 451/163k · ST 410/250k (all single-college).

## STATE SLICE — UTTAR PRADESH (done 2026-07-24) — first Dropbox-only state; parser audited
Builder: `scripts/neet_matrix_up.py` → `scripts/neet_matrix_out/up_matrix_final.csv`.
- **Dropbox-ONLY** (no ours). Per Surya, now AUDITING each parser before trusting (he didn't write them). **Audited `state_UP.py`:** mostly clean & reusable — AIR-native (verified: KGMU UROP closes AIR 805-4013 = real NEET AIR, not UP state rank), correct 4-letter category decode, R1+R2+R3 cumulative, gender-split, no vacated-seat/upgrade-chain contamination.
- **⚠ PARSER BUG FOUND (audit paid off):** the parser treats `[PPP]` (Public-Private-Partnership) colleges as GOVT. But UP's 3 PPP colleges (Ajay Sangaal, KMC Maharajganj, Shri Siddhi Vinayak) close UR at **AIR 380k-470k** — they fill like PRIVATE, not govt. Including them dragged the median UR floor to AIR 382,152 → Gen came out **321 marks, LOOSER than EWS/OBC (518)** — an obvious impossibility that the audit caught. FIX: exclude `[PPP]` from the govt floor. After fix, Gen = 536 (AIR 32k), matching EWS/OBC. Logged in back-prop queue. [2026-07-24]
- **GENDER:** their closings split M/F; matrix takes the LOOSER (max across M/F) per (college,vert) = a general (male-default) student's most-accessible door.
- **FLOOR = median of loosest-5** (50 govt MBBS colleges — most college-dense state, very robust for MBBS). SEAT_GROWTH=1.008. Round = R1+R2+R3 cumulative.
- **RESULT (2026 est, marks / AIR):** MBBS Gen 536/32k · Gen-EWS 535/33k · OBC 535/33k · SC 436/194k · ST 305/539k. BDS Gen 272/671k · OBC 531/36k · SC 435/196k · EWS/ST =qual.
- **⚠ BDS low-confidence:** only 2 govt dental colleges (KGMU Dental, Azamgarh); Azamgarh UR closes AIR 1.3M (dental fills very deep — plausible but extreme). UR-BDS floor (671k/232 marks) rests on 2 colleges → shaky. MBBS is the solid deliverable; thin-dental-count BDS is inherently unstable (same as HP). [2026-07-24]

## STATE SLICE — BIHAR (done 2026-07-24) — Dropbox-only; parser audited = clean
Builder: `scripts/neet_matrix_br.py` → `br_matrix_final.csv`.
- **Audited `state_BR.py`: clean, well-built, NO issues.** Parses BCECEB R3-revised PDF; uses `neet_air` explicitly (AIR-native — verified PMC Patna UR 8,261 / IGIMS 9,583, plausible top-Bihar AIR); **HARD-CODED 15-college govt list** (safer than keyword-matching — no PPP/contamination trap; all 15 verified genuinely govt incl. remote KMC Katihar 135k / NMC Sasaram 309k). Round = R3-revised final.
- **CATEGORIES:** Bihar verticals UR/BC/EBC/EWS/SC/ST. UR→Gen, EWS→Gen-EWS, SC→SC, ST→ST. **OBC = MEDIAN of {BC, EBC}** (Bihar splits OBC into Backward Class + Extremely Backward Class; both ~27-28k, median 27,735). [2026-07-24]
- **⚠ CORRECTION + STRONG VALIDATION (Surya flagged Gen as "too high" — good doubt).** Cross-checked vs neetugguidance's **Bihar STATE-QUOTA govt college-wise table** (authoritative; `state-institute.php?coldesc_id=6`). TWO findings: (1) **their parser's hard-coded govt list WRONGLY includes 2 PRIVATE colleges** — KMC Katihar (Muslim-minority private) & Narayan MC Sasaram (private) — confirmed by neetugguidance listing both in its PRIVATE table. Excluded them (back-prop bug in `state_BR.py`). (2) After exclusion, Bihar govt UR floor = AIR 18,623-27,331 → **525-538 marks**, which MATCHES the neetugguidance govt table (deepest govt UR = ESIC Bihta 27,331 / Bettiah 27,138 / Purnea 27,223 ≈ 525) AND their "safe score 560-600". So the number is CONFIRMED, not too high — Bihar govt Gen genuinely is competitive (huge pool, few seats). Fix barely moved headline (552→553) since median already discounted the 2 outliers. [2026-07-24]
- **FLOOR = median of loosest-5** (14 govt MBBS, now excl. 2 private). SEAT_GROWTH=1.008.
- **RESULT (2026 est, marks / AIR):** MBBS Gen 553/19k · Gen-EWS 543/26k · OBC 541/28k · SC 444/179k · ST 457/152k. BDS Gen 521/48k · EWS 520 · OBC 517 · SC 422/225k · ST 432/202k.
- **NOTE:** Bihar Gen (553) is high — 2nd only to Kerala. Confirmed real by neetugguidance govt table. SC(444)<ST(457) minor; within noise, kept.
- **LESSON:** even a "hard-coded govt list" parser (which I'd praised as the safest pattern) can be wrong — Bihar's included 2 private colleges. neetugguidance's per-college GOVT-vs-PRIVATE split tables are a strong per-state validation source; use them to audit govt classification, not just AIQ cross-check.

## STATE SLICE — CHHATTISGARH (done 2026-07-24) — Dropbox-only; 2 findings from audit
Builder: `scripts/neet_matrix_cg.py` → `cg_matrix_final.csv`.
- **⚠ FINDING 1 — their EXTRACTED file was STALE / out-of-sync with their RAW.** `CG_closing_ranks_state_govt_2025.csv` reported PJNM Raipur UR = 180,626 (absurd — PJNM is CG's top govt college, real UR ≈ AIR 24,483). The RAW `CG_all_allotments_2025.csv` is clean/current (PJNM UR-NC state ranks 1-13 = AIR 20,174-24,483). So I **rebuilt CG closings from the RAW**, not their extracted file. LESSON: their extracted output can lag their raw — always sanity-check extracted vs raw before trusting. [2026-07-24]
- **⚠ FINDING 2 — 'Special ST' is a 1-seat sub-pool** (AIR 1,307,507, a PVTG/special-tribe reservation). Folding it into ST via median corrupted ST (876k). Fixed: ST = plain ST only (median-of-5 = AIR 446,055). [2026-07-24]
- **AIR-native** (raw `neet` col = NEET AIR, verified). **GOVT = their hard-coded 10-college set** (plausible vs neetugguidance CG: top PJNM 24k ≈ AIQ 26,284; remote Kanker 86k). **CATEGORIES:** UR/OBC/SC/ST/EWS, `-NC`/`-F` base (excl PH/EX/FF), GQ quota, looser-of-gender. Round = R1+R2 cumulative.
- **RESULT (2026 est, marks / AIR):** MBBS Gen 496/83k · Gen-EWS 457/152k · OBC 501/75k · SC 428/210k · ST 331/450k. BDS Gen 470/127k · EWS =qual · OBC 463 · SC 392/291k · ST 310/521k.
- **NOTE:** EWS(457) looser than OBC(501)/Gen(496) — thin 10% EWS pool closes deep at remote colleges (same as WB); real. ST deep (331) — CG heavily tribal. Cross-check: CG AIQ UR 527 (neetugguidance) vs our state top-college 529 ≈ match; state floor 475 looser than AIQ (correct). [2026-07-24]

## STATE SLICE — UTTARAKHAND (done 2026-07-24) — Dropbox-only, thin state
Builder: `scripts/neet_matrix_uk.py` → `uk_matrix_final.csv`.
- Audited `state_UK.py`: AIR-native (verified Doon Medical UR 23,789), keyword govt filter → 5 govt MBBS (Doon, Haldwani, Haridwar, VCSG Srinagar, SSJ Almora), state-quota only, R3 broadsheet. Extracted==raw (0 mismatch). Cross-check: UK AIQ UR 526 (neetugguidance) ≈ our top Doon 530; state floor 508 looser (ok).
- **CATEGORIES:** UR/EWS/OBC/SC/ST, looser-of-gender. No govt BDS in UK.
- **⚠ THIN STATE — LOW CONFIDENCE for reserved cats:** only 5 govt MBBS colleges; ST = 1 seat (AIR 1.09M → ~qualifying); SC loosest 380k-800k; EWS deep (137k). Gen/OBC solid, reserved sparse. Parser docstring also warns R3-broadsheet may under-capture R1/R2-retained.
- **RESULT (2026 est, marks / AIR):** MBBS Gen 530/38k · Gen-EWS 465/137k · OBC 520/49k · SC 296/567k · ST 198/1.09M (qual-ish). BDS all =qual (no govt dental).
- EWS(465)<OBC(520) — thin-EWS-pool (same as WB/CG). [2026-07-24]

## STATE SLICE — TAMIL NADU (done 2026-07-24) — MARKS-native, no conversion (cleanest state)
Builder: `scripts/neet_matrix_tn.py` → `tn_matrix_final.csv`.
- **SPECIAL CASE — TN publishes CLOSING MARKS (`closing_tmark`) directly**, so NO rank→AIR→marks conversion needed (avoids TN's `closing_grank` state-rank entirely — the least error-prone state). Verified tmark = NEET marks (237-597; Chengalpattu OC 547>BC 534>SC 477>ST 448 textbook). Used tmark as 2025 marks; 2026 = 2025 + difficulty_shift(marks) applied directly in marks-space.
- Audited `state_TN.py`: clean; parses TN GQ round PDFs; govt filter keeps "Govt. Colleges" (36 MBBS+3 BDS), drops govt-quota-in-private. Round = through R3.
- **CATEGORIES (TN community scheme):** OC→Gen. OBC = MEDIAN{BC, BCM, MBC&DNC} (507/502/494 → 502). SC = MEDIAN{SC, SCA-Arunthathiyar} (434/397). ST→ST. **NO EWS** in TN state allotment (TN 69% reservation; EWS absent from data) → Gen-EWS = qualifying. [2026-07-24]
- **RESULT (2026 est, MARKS):** MBBS Gen 551 · Gen-EWS =qual · OBC 521 · SC 442 · ST 426. BDS Gen 518 · OBC 504 · SC 409 · ST 411.
- **METHOD NOTE:** difficulty shift applied directly in marks-space (vs rank→marks for other states); same shift magnitude, defensible, TN-specific path. AIR columns blank for TN (marks-native). Most trustworthy 2025 figures (no conversion). [2026-07-24]
- **★ TRIPLE-VALIDATION (strongest in the workstream) — validates the whole pipeline.** TN gives us 3 independent paths that must agree: (1) published `closing_tmark`, (2) `closing_grank` (state rank) → AIR via THEIR `_state_rank_to_air_TN_curve.csv` → marks via OUR score-rank model, (3) our AIQ-in-TN. All agree to ±1 MARK per community: BC 534=533, OC 547=547, SC 477=476, SCA 449=449, ST 448=447. ⇒ not only is TN solid, but **our score-rank model AND their state-rank→AIR curves are both confirmed accurate end-to-end** — retroactive validation of the core machinery used for all 16 states. (Also confirmed: our NEETUG.json has NO TN state data — only 267 AIQ rows; the `public/data/TNEA/` file is ENGINEERING, not NEET.) [2026-07-24]

## STATE SLICE — ASSAM (done 2026-07-24) — Dropbox-only; parser mis-pool bug fixed
Builder: `scripts/neet_matrix_as.py` → `as_matrix_final.csv`. Built from RAW (`AS_all_allotments_2025.csv`, has clean per-candidate neet_air+neet_score+quota_seat).
- **⚠ PARSER BUG — `final_pool`/`quota_seat` mis-assignment.** Low-score candidates (score ~150-210, OBC/SC) dumped into UR/other seats at deep AIR → naive max(neet_air) gave absurd closings (Assam Medical UR 614k, OBC 1.06M — UR looser than SC, impossible). FIX: score-sanity guard (drop holders with neet_score<350; real closing clusters sit >=~490). Recovered sane floors. Logged back-prop #11. [2026-07-24]
- **AIR-native** (raw neet_air). GOVT = inst codes 101-113 (MBBS) + 201-203 (BDS). CATEGORIES: UR→Gen (General only), EWS→Gen-EWS, OBC/MOBC(NCL)→OBC, SC→SC, ST = median{ST(P) Plains, ST(H) Hills}. median-of-5.
- **RESULT (2026 est, marks / AIR):** MBBS Gen 510/61k · Gen-EWS 504/69k · OBC 385/304k · SC 437/191k · ST 398/275k. BDS Gen 498 · EWS 496 · OBC 396 · SC 422 · ST 396.
- **Cross-check (our AIQ-in-Assam):** loosest AIQ Open = 534 marks vs our state Gen 491 (2025) — state looser than AIQ, correct direction.
- **CONFIDENCE: MEDIUM** — Gen/EWS solid; OBC(385)<SC(437) is odd (Assam OBC/MOBC migration complexity + the mis-pool bug makes OBC least reliable). Small NE state, messy source. [2026-07-24]

## STATE SLICE — JHARKHAND (done 2026-07-24) — re-parsed the SOURCE PDFs; worst parser bug found
Builder: `scripts/neet_matrix_jh.py` → `jh_matrix_final.csv`. **Parses `source/JH/JH_R1_2025.pdf` + `JH_R3_2025.pdf` directly** (not their extracted CSV, not their column mapping).
- **⚠ THEIR PARSER BUG — OFF-BY-ONE QUOTA COLUMN (found by reading the actual PDF header row).** True cols: [12]='NEET Score', [13]='CML Rank', [18]=CollegeName, [19]=Course, **[20]='Preference No'**, **[21]='Seat Opted Category/Quota'**. `state_JH.py` takes quota from **r[20]=Preference No** → its "quotas" were preference numbers 1-10 (its docstring wrongly explains them as affiliated-school sub-quotas). Result: only 32 closing rows, and floors that were impossible (GENERAL 248 marks, BELOW SC 419). Logged back-prop #12. [2026-07-24]
- **ALSO: PDF tables DRIFT on some pages** (college/quota land in shifted cells) → fixed indices unsafe. We identify quota by VALUE PATTERN `^(UR|ST|SC|BC-I|BC-II|EWS)(--(PH|Blind|Deaf))?$`, and college/course by value match. 613 usable rows recovered (vs their 32).
- **MARKS-NATIVE:** PDF carries per-candidate 'NEET Score' → closing marks used directly; **no CML(state-rank)→AIR conversion needed** (same clean route as Tamil Nadu). 2026 = 2025 + difficulty_shift.
- **GOVT:** 6 govt MBBS (RIMS Ranchi, MGM Jamshedpur, SNMMC Dhanbad, SBMCH Hazaribagh, PJMC Dumka, Medinirai Palamu) + RIMS Dental. Round = R1+R3 union. CATEGORIES: UR→Gen, EWS→Gen-EWS, **OBC = MEDIAN{BC-I, BC-II}**, SC→SC, ST→ST; `--PH/Blind/Deaf` excluded from base.
- **RESULT (2026 est, MARKS):** MBBS Gen 547 · Gen-EWS 534 · OBC 544 · SC 445 · ST 354. BDS Gen 520 · EWS 509 · OBC 517 · SC 421 · ST 321. Textbook ordering, tight clusters, BDS consistently ~25-30 below MBBS.
- **LESSON (Surya's prompt "do you want to check the actual documents and parsers"):** reading the SOURCE PDF header + the parser code together is what caught this. Reverse-engineering their CSVs alone would have shipped garbage. **For any remaining/suspect state: open the source doc, verify column semantics, then decide whether to reuse or re-parse.** [2026-07-24]

## STATE SLICE — JAMMU & KASHMIR (done 2026-07-24) — marks via UT merit list
Builder: `scripts/neet_matrix_jk.py` → `jk_matrix_final.csv`.
- **MARKS via the UT MERIT LIST (no curve needed):** J&K publishes `JK_meritlist_state_rank_air.csv` (5,707 rows) carrying **both `air` and `score`** per `state_rank`, so each `closing_UT_rank` maps straight to that candidate's marks. Verified: state_rank 1 = AIR 423 / score 622; SKIMS OM closing UT-rank 85 → AIR 9,058 / 558 marks. Cleanest route — no rank→AIR modelling. [2026-07-24]
- **GOVT:** 11 colleges (9 GMC incl. SKIMS + GDC-Jammu/Srinagar dental). **CATEGORIES (J&K UT scheme):** **OM** (Open Merit)→Gen, EWS→Gen-EWS, OBC→OBC, SC→SC, ST→ST. **EXCLUDED (J&K-specific area quotas, no national equivalent):** RBA (Reserved Backward Area, floor 462), ALC (Actual Line of Control, 430), P&B (Pahari & Backward, 528) — reported here for reference only.
- **RESULT (2026 est, MARKS):** MBBS Gen 526 · Gen-EWS 352 · OBC 430 · SC 403 · ST 388. BDS Gen 517 · EWS 310 · OBC 436 · SC 398 · ST 400.
- **NOTE:** EWS (352) far below OBC (430) — the thin-10%-EWS-pool effect, now seen in WB/CG/UK/JK consistently. Real.

## DELHI — NOT matrixed: structurally different (an elite central-institution pool), documented instead (2026-07-25)
Surya's instinct ("it seems mostly national… might not have state?") was substantially right. Searched properly; findings:
- Delhi **does** have an 85% domicile quota — but it is run by **Delhi University** (not a state DME), with DGHS Delhi publishing college-wise cutoffs. Domicile bar is stricter than most states: Class **11 AND 12** in Delhi schools.
- **The DU state-quota pool is only ~3-4 colleges** (MAMC, LHMC, UCMS + Maulana Azad Dental). Delhi's other colleges — **AIIMS, VMMC, ABVIMS, Dr. BSA, NDMC** — sit under central/other authorities, not the DU state pool. So `median-of-loosest-5-colleges` is **impossible** (same structural blocker as the 1-college NE states).
- **Delhi's bar is far off the national distribution** — its **AIQ** UR closes at **AIR 3,086 / 583 marks** (vs ~26k / ~526 in typical states); the thirdparty state data shows **MAMC UR at AIR 1,908**; coaching sources put Delhi-domicile OBC at **670-685**. A bare row in the sheet would mislead: this is an *elite-institution* pool, not a comparable state quota.
- **Data status:** `DL_closing_ranks_state_govt_2025_THIRDPARTY.csv` is *better* than Odisha's (14 rows, **all 2025**, all "Final" round, all consistent **NEET AIR**, 3 colleges × UR/OBC/EWS/SC/ST) — but still `NOT_OFFICIAL=True`, and I could not reach an official DGHS/DU cutoff document.
- **DECISION: document, don't matrix.** Indicative 2025 state-quota closing AIR (thirdparty, unofficial): **MAMC** UR 1,908 · OBC 5,555 · SC 48,312 · ST 127,408; **UCMS** UR ~3,924 · EWS 6,992 · OBC 8,467 · SC 66,641; **LHMC** (women) UR 5,577 · OBC 13,303 · EWS 14,522 · SC 76,771 · ST 166,697. For Avanti guidance the honest statement is: **a Delhi-domicile student needs ~580+ (UR) for the DU pool — comparable to or tighter than AIQ — so AIQ and Delhi state quota are both elite doors here.** [2026-07-25]

## STATE SLICE — ODISHA (done 2026-07-25) — GAP CLOSED with OUR parser on two official OJEE PDFs
Parser: **`scripts/parse_odisha_2025.py` (ours)** → `scripts/odisha_2025_out/`. Builder: `scripts/neet_matrix_od.py` → `od_matrix_final.csv`. **Supersedes the earlier "Odisha unavailable" finding below** — Surya supplied the two official documents that were missing.
- **Two gaps closed at once.** Before: only `OD_..._THIRDPARTY.csv` (33 rows, `NOT_OFFICIAL=True`, mixed years + mixed rank types), **and** no Odisha state-rank→AIR curve existed (AS/GJ/JH/JK/KL/RJ/TN/UK had one; OD did not).
- **SOURCES (official, OJEE-2025):**
  1. `amogh-csv/191568Odisha R3 MBBS Cutoff 2025.pdf` (34pp) — "Provisional Allotment of Candidates (Common State Rank wise) MBBS/BDS, **3rd Round**", No. OJEE/0635 dated **28-10-2025** → **1,940 allotments**, 15 govt colleges. R3 = deep/final-ish (better round than the R1-only states).
  2. `amogh-csv/2025072943.pdf` (150pp) — "Provisional State Merit List for MBBS/BDS Admission 2025-26" → **5,817 exact (State_AIR → NEET_AIR) pairs** = the missing bridge (state rank 1..5,817; AIR 180..1,316,600).
- **METHOD:** closing STATE rank (doc 1) → bridge (doc 2) → closing NEET AIR → marks via our validated model. Bridge verified smooth & monotonic (state 1→AIR 180; 118→4,523; 1,000→28,844; 5,817→1,255,108).
- **BASE SEATS ONLY:** regular QUOTA (exclude SGS / NRI) and no horizontal **GC** (Green Card) / **PC** (Physically Challenged) / **EX** (Ex-serviceman) flag → 1,407 of 1,940 rows.
- **⚠ NO OBC IN ODISHA STATE QUOTA — policy, not a parse gap.** The 2025 R3 allotment contains only **GN / EW / SC / ST** across all 1,940 rows. Per Surya: Odisha historically had **no OBC/SEBC reservation** for medical state-quota admissions; the state cabinet approved an **11.25% SEBC quota** but it is **not reflected in the 2025 allotment**. ⇒ Our OBC row = qualifying is correct **for 2025-26**, but it is **policy-dependent — revisit for 2026 if SEBC activates.** Meanwhile an **Odisha OBC student's real 2025 door was AIQ**, where the central **27% OBC** quota applies (AIQ OBC = **547 marks**). [2026-07-25]
- **RESULT (2026 est, marks / AIR):** MBBS Gen 534/34k · Gen-EWS 534/34k · **OBC =qual (no bucket)** · SC 467/133k · ST 360/369k. BDS Gen 520/49k · EWS 518 · SC 453/160k · ST 340/422k (1 govt dental → low confidence).
- 14 govt MBBS colleges → robust median-of-5; tight clusters.

## (SUPERSEDED 2026-07-25 — Odisha is now DONE, see above) ODISHA — NOT matrixed: 2025 data genuinely unavailable (searched thoroughly, 2026-07-25)
Applied the same Google-the-official-PDF playbook that succeeded for Rajasthan and Haryana. It failed for Odisha, and the reason is availability, not search effort:
| Source checked | Result |
|---|---|
| **OJEE** `ojee.nic.in` (the UG MBBS/BDS counselling authority) | Live, but its **`/medical-notice/` archive is PURGED** for the new cycle — only "MCC_NRI NOTICE 2026" remains |
| OJEE **"Opening & Closing Rank 2025"** page | **B.Tech only** — no MBBS/BDS |
| **DMET Odisha** `dmetodisha.in` | **PG Medical / PG Dental / Allied only** — no UG; already on the 2026 cycle |
| edufever aggregator (the mirror route that rescued Haryana) | Has Odisha **2024 and 2023** allotments — **no 2025** |
| Multiple Google queries | Confirm the merit list released 29-Jul-2025, but no surviving PDF link |
- **The Dropbox THIRDPARTY fallback is NOT usable** and its own authors flagged it: `OD_closing_ranks_state_govt_2025_THIRDPARTY.csv` has a literal `NOT_OFFICIAL=True` column, **33 rows total**, **mixed years** (21 rows 2024 / 12 rows 2025), **mixed units** (21 "Odisha state rank" / 12 "NEET AIR"), and **only UR/SC/ST** (no OBC, no EWS). For 2025 that's ~12 rows — nowhere near a median-of-5. Building on it would be fabrication dressed as data.
- **DECISION: skip Odisha.** Documented as a data-availability gap. **To close it later:** obtain the OJEE 2025 UG allotment or opening/closing-rank PDF (portal login, an archived copy, or an RTI/mail to OJEE) — then the RJ/HR parser template applies immediately. [2026-07-25]

## NORTH-EAST & 1-COLLEGE STATES — deliberately NOT matrixed (finding, 2026-07-24)
Surya asked to Google for official NE sources. Findings:
- **Official portals mostly don't publish usable 2025 allotment PDFs.** Checked DHS Manipur (`manipurhealthdirectorate.mn.gov.in`) directly: only B.Sc-Nursing/Pharmacy 2026 notices + 2011-14 archives; no NEET-UG 2025 merit/allotment. Others: Meghalaya `meghealth.gov.in`, Nagaland DME, Mizoram/Tripura DME — no accessible 2025 closing data. This is WHY the Dropbox pipeline tagged OD/HR/DL/AN/AR/ML/MN/MZ/NL/TR as THIRDPARTY.
- **More decisive — there is barely anything to matrix.** Govt medical colleges per state (from our AIQ data): **Sikkim 0**, Meghalaya 1 (**NEIGRIHMS — a CENTRAL institute, seats via MCC not state quota**), Mizoram 1, Nagaland 1 (+ only ~10 domicile seats via NEIGRIHMS), Tripura 1, Arunachal 1, A&N 1, Goa 1, Chandigarh 1, DNH 1; Manipur 3. A "matrix" there = one college × a few categories = a single seat per cell — an anecdote, not a distribution (no median-of-5 possible).
- **DECISION: do not build matrices for the 1-college NE/small states.** For those students the practical door is **AIQ**, and we already have it (Gen 548 etc.). Recommend the deliverable state this explicitly rather than fabricate thin state rows. Assam (14 colleges) and J&K (11) were the only NE/UT states with a real multi-college state quota — both done. [2026-07-24]

## STATE SLICE — RAJASTHAN (done 2026-07-25) — RJ-2025 GAP CLOSED with OUR OWN parser
Parser: **`scripts/parse_rajasthan_2025.py` (ours)** → `scripts/rajasthan_2025_out/`. Builder: `scripts/neet_matrix_rj.py` → `rj_matrix_final.csv`.
- **Closes the RJ-2025 gap.** The Dropbox `state_RJ.py` is stuck on 2024 (its own header: *"the official 2025 portal rajugneet2025.in blocks programmatic access"*). Surya supplied the OFFICIAL 2025 board PDFs, so we wrote our own parser at our end.
- **SOURCE (official, NEET UG Medical & Dental Admission/Counseling Board-2025, SMS MC Jaipur):** `amogh-csv/599136R1 Allotment 2025.pdf` — "Provisional allotment list, Round 1, **18.08.2025**", 299pp → **5,367 allotments / 638 closings**; plus `rajasthan-neet-merit-list.pdf` (657pp, 12.08.2025) → **14,452 merit rows** (state-merit ↔ AIR ↔ percentile bridge). Year verified on both (headers say 2025 four ways). NOTE the merit list alone was insufficient — it has NO college; the allotment PDF is the one that matters.
- **AIR-native** (`NEET A.I. Rank` per allottee) → straight into our score-rank model, no conversion.
- **★ GOVT FILTER IS STATED IN THE DATA — cleanest of any state.** The college string carries an explicit seat-type marker: `(Govt. Seat)` vs `(Gen. Seat)` / `(Mgmt. Seat)` / `(NRI Seat)`. Verified **ZERO overlap**: 31 colleges have `Govt. Seat`; a **disjoint** 26 have `Gen. Seat` (= general seat at a PRIVATE college — American Int. Inst., Ananta, Darshan Dental…). No heuristic / fee-classifier / hard-coded roster needed — i.e. immune to the failure mode that broke KA/PB/UP/BR. [2026-07-25]
- **⚠ HORIZONTAL SUB-POOLS EXCLUDED (critical fix).** `category_considered` carries **PwD / EXS1-5 (Ex-Serviceman) / WPP1-3 (war-widow)** flags — 98 of 2,200 govt rows. These close at **AIR ~1.1-1.3M**; including them made GEN "close" at AIR **1,136,995**, *looser than EWS (15,144)* — impossible. Parser now records `horizontal` so consumers filter to base seats (2,102 rows). Same sub-pool hygiene as every other state. [2026-07-25]
- **CATEGORIES (RJ verticals):** GEN→Gen, EWS→Gen-EWS, SC→SC. **OBC = MEDIAN{OBC, MBC}** (MBC = Most Backward Class, OBC-family). **ST = MEDIAN{ST, SA}** (SA = Sahariya, a PVTG/ST-family). `category_allotted` token2 = area+gender (URB/URG/OBB/OBG/SCB/SCG/STB/STG/EWB/EWG/MBB/MBG/SAB/SAG) → looser-of-gender.
- **RESULT (2026 est, marks / AIR):** MBBS Gen 563/13k · Gen-EWS 559/15k · OBC 554/18k · SC 492/89k · ST 432/202k. BDS Gen 534/34k · EWS 520 · OBC 523 · SC 456/154k · ST 407/256k. 30 govt colleges per vertical → tight clusters, robust median-of-5. (BDS = 1 govt dental college → low confidence.)
- **⚠ ROUND CAVEAT — ROUND 1 ONLY.** Every other state uses a later/final round; R1 closes tightest, so RJ runs STRICT. **CROSS-VERIFIED vs neetugguidance RJ-AIQ** and round-normalized with their documented R1→final multipliers (UR 1.22, OBC 1.05, EWS 1.06, SC 1.23, ST 1.05): GEN 549→543 vs AIQ 526 (residual ~17); OBC 548→546 vs 527 (~19); **EWS 544→542 vs 538 (~4 ✓)**; SC 472→459 vs 441 (~18); **ST 468→465 vs 457 (~8 ✓)**. ⇒ roughly a third-to-half of the apparent "state stricter than AIQ" gap is ROUND DEPTH; the residual ~15-19 marks is genuine Rajasthan competitiveness (huge pool; Kota coaching hub). Numbers sound, caveat labeled in `source_round`. [2026-07-25]

## STATE SLICE — HARYANA (done 2026-07-25) — found the official PDF by Googling; OUR parser
Parser: **`scripts/parse_haryana_2025.py` (ours)** → `scripts/haryana_2025_out/`. Builder: `scripts/neet_matrix_hr.py` → `hr_matrix_final.csv`.
- **HOW IT WAS FOUND (repeat of the Rajasthan playbook, per Surya):** Googled → official body = **DMER Haryana** (`dmer.haryana.gov.in`) → its MBBS/BDS links point to the counselling portal **`uhsrugcounselling.com`**, which is in **Maintenance Mode (HTTP 503)** → obtained the PDF from an aggregator mirror (the same route the Dropbox team used for RJ-2024). Document is the genuine official one. (Side find: the `cdnbbsr` "PROVISIONAL SEAT ALLOTMENT ROUND-1/2" PDFs on that CDN are **West Bengal's**, not Haryana's — useful for a future WB refresh.)
- **SOURCE:** `amogh-csv/haryana-neet-ug-2025-round1-allotment.pdf`, 234pp — "Department of Medical Education and Research, Haryana / Govt. of Haryana — Provisional Merit List cum Allotment of seats ... MBBS/BDS ... **Round I (Session 2025-26)**, 14.08.2025". → **2,213 allotments / 169 closings**.
- **★ MARKS-NATIVE *AND* AIR:** carries BOTH `NEETScore` and `NEETAllIndiaRank`. Closings taken in MARKS (no conversion).
- **★★ INDEPENDENT MODEL VALIDATION (important beyond Haryana):** their published `NEETScore` vs OUR AIR→marks curve, sampled across AIR 6,673 → 1,107,283: **mean error +0.86 marks, sd 2.39** (e.g. AIR 6,673→566.7 vs 565; 120,175→451.1 vs 451; 309,271→352.8 vs 353). Only meaningful deviation is at AIR ~1.1M (+8), the extreme tail — irrelevant to govt floors. ⇒ With TN (±1 triple-check) and MP (±1), our score_rank model is now validated against **three independent states' official marks**. This underwrites every AIR-based state in the matrix. [2026-07-25]
- **⚠ `Remark` FILTER IS CRITICAL:** only **2,213 of 7,595** rows are real allotments ("Allotted"); the rest are applicants with no seat (blank `-` category/course/institute). Ignoring `Remark` would corrupt every closing.
- **GOVT = 7 colleges:** PGIMS Rohtak, Kalpana Chawla GMC Karnal, BPS GMC for Women Khanpur Kalan, SHKM GMC Nalhar Mewat, Atal Bihari Vajpayee GMC Chhainsa, ESIC NIT Faridabad, + PGIDS Rohtak (dental).
- **CATEGORIES (Haryana):** OPEN_CAT→Gen, EWS→Gen-EWS, **OBC = MEDIAN{BCA, BCB}** (Haryana's two backward blocks: 537/547), **SC = MEDIAN{SC, SC_DEPRIVED}** (485/444 — Deprived-SC sub-quota). **NO ST quota in Haryana state counselling** (negligible ST population — same structural gap as Punjab) → ST = qualifying. EXCLUDED: MGT / MINORITY / NRI (not state-quota merit) and horizontal PWBD (32) / ESM_FF (10).
- **RESULT (2026 est, MARKS):** MBBS Gen 566 · Gen-EWS 558 · OBC 557 · SC 486 · ST =qual. BDS Gen 523 · EWS 515 · OBC 511 · SC 440 (1 govt dental college → low confidence).
- **⚠ ROUND CAVEAT: Round I only** → runs STRICT (as AIQ-R1, PB-R2, MP-R1, RJ-R1). Labeled in `source_round`.

## ALL OVERLAP STATES COMPLETE (11 tracks, 2026-07-24)
`neet_2026_matrix_all.csv` = **110 rows / 11 tracks**: All India (AIQ) + Maharashtra, Telangana, Karnataka, Gujarat, Andhra Pradesh, Kerala, Punjab, Madhya Pradesh, West Bengal, Himachal Pradesh. Columns end with `source_round`. Full source-of-truth ledger + back-prop queue in `NEET_SOURCE_OF_TRUTH.md`. Next: Phase 2 (Dropbox-only states) and/or Phase 3 (canonical parser + BQ) — pending Surya.

## B2b qualifying is NATIONAL (clarification, 2026-07-23)
B2b (qualifying marks) is the SAME across AIQ / MH / TG / every state — it's NTA's national "you qualified to be on any merit list" percentile floor (Gen/EWS 213, OBC/SC/ST 177, PwD variants 194/177/178), NOT a per-state cutoff. Only B1a (MBBS) and B1b (BDS) are state-specific. So identical B2b columns across state rows are CORRECT, not a copy error. [2026-07-23]

## COMBINED SHEET
`scripts/neet_matrix_out/neet_2026_matrix_all.csv` — single file, `state` as first column ("All India" = AIQ track, then each state). 30 rows = 3 tracks × 10 category rows. Same 11 columns (dropped AIQ-only `basis`). Append one 10-row block per new state. NOTE: "All India" rows (AIQ, 15%, national AIR, no domicile) are NOT directly comparable within-category to state rows (85%, domicile-protected) — the `state` col is a TRACK label. [2026-07-23]

## Open / to-verify
- Confirm 2026 qualifying numbers are NTA-final not provisional.
- Loosest-govt-MBBS-Open anchor (ours, R1+R3) ≈ AIR 21,190 (Nagaland/Zoram/Nalbari — new/remote govt colleges) — sanity-check this is real, not a parse artifact.
- Cross-check MH 2025 floors against neetugguidance.in MH state page (Surya suggested; not yet done — low priority, floors already corroborated internally).
- NEXT: Karnataka (SC→SCG, ST→STG only per Amogh; KA OBC = 1/2A/2B/3A/3B, deferred).

---

# STATE SLICE — THE NORTH-EAST + REMAINING UTs (final pass, 2026-07-27)

Surya: *"i've been told certain states are important.. espeically north east.. south.. and chandigarh
region... even if one college in the state it is fine.. get some numbers"*, then *"the idea is to put
up the states and UTs and be as honest about sources and truthfulness"* with *"some things can be left
blank.. it is ok"*, and *"yea i think u can ocr... worth doing it... its imp to document these sources"*.
This pass closes the sheet at **all 36 states/UTs + All India**.

## ★ THE STRUCTURAL FINDING: NE states mostly do NOT run a state-college quota

They **nominate** students into seats reserved for that state at colleges **across India** — the
**GoI Central Pool** and **NEC (North Eastern Council)** regional seats. This is Surya's own hunch
(*"note that naglaand has something called NEC.. and puts kids in NEIGRHMS.. wonder some quota"*)
confirmed in the documents:
- **Nagaland (DTE):** *"FINAL LIST OF CANDIDATES SELECTED THROUGH NAGALAND STATE-NEET (UG) 2025
  COUNSELLING FOR **STATE RESERVED SEATS**"*, allotment column literally reads **"GoI Central Pool"**
  → VMMC Safdarjung, LHMC + MAMC Delhi, GMC Nanded, RIMS Imphal, NEIGRIHMS, and one Chhattisgarh seat.
- **Meghalaya (H&FW):** *"...in respect of the **seats allotted to the State of Meghalaya**"* →
  Guwahati MC, Gandhi MC Bhopal, SP MC Bikaner, VMMC Delhi, MGM Indore, Jorhat MC.
- **Arunachal (APDHTE):** 94 MBBS = 85 TRIHMS + 7 RIMS Imphal + 2 Agartala GMC.

⇒ An NE "cutoff" is **the bar to win a state-reserved nomination**, not a college closing rank.
Still the correct number for "will this student get an MBBS seat", which is the whole objective.

**RIMS Imphal — resolved.** I had wrongly excluded it as a central institute. Verified: RIMS is
centrally *run*, but its **85% is administered by Manipur DME** and reserved for Manipur + other
NE-state residents. It IS a genuine state-quota door and is included. (Also: I mis-attributed the
"RIMS is central" claim to Surya; it was mine.)

## OCR METHOD (for the scanned NE sources) — `scripts/ocr_ne_allotments.py`
`pdfplumber page.to_image(resolution=250–300)` → PIL greyscale (+ rotation) → `tesseract --psm 6`
(`--psm 0` for OSD when orientation is unknown). Rows accepted **only** on strict validation (plausible
AIR 4–7 digits + category token + institute token); failures are counted and reported, never guessed.
Institute patterns are **order-sensitive** — `JNIMS` must be matched before `RIMS`/`NIMSR` or substring
collisions mislabel a Manipur row as Nagaland's. `AIR_SANITY_MAX = 600_000` kills OCR digit-mangles
(we saw a spurious 988,279).

## Per-state decisions

### Arunachal Pradesh — `amogh-csv/arunachal-2025-r1-allotment.pdf` (apdhte.nic.in, R1)
28pp with a **clean text layer** (no OCR needed) — the best NE source. 718 rows.
**★ ONLY ONE CATEGORY EXISTS: all 690 allotments are `Cat-I` (APST).** There is no Gen/OBC/SC split in
the document, so **only the ST row is populated** and the rest sit at qualifying. Reporting a "Gen"
figure here would be inventing a pool that the state does not operate.
MBBS worst AIR **208,132 → 403 marks**; BDS **223,728 → 395**. Smooth tail, no straggler cliff.

### Meghalaya — `amogh-csv/meghalaya-2025-mbbs-selected-list.pdf` (meghealth.gov.in, Order Health.189/2025/66)
6pp **scan**, OCR'd at 250dpi. **NEET score printed directly → marks-native.**
- **★ CATEGORY ANSWER (Surya asked: "idk what khasi jantia and garo categories are.. but probably obc"):**
  they are **NOT OBC**. **Khasi & Jaintia** and **Garo** are Meghalaya's indigenous **SCHEDULED TRIBES**
  (its two ST sub-pools). Mapped to **ST**. Blocks: OPEN, KHASI & JAINTIA, GARO, ST/SC.
- **★ BUG I CAUGHT AND FIXED — WAITING LISTS.** Every block is *SELECTED LIST* then *WAITING LIST*, and
  the Order states a waiting candidate is nominated **only if a selected one fails to report**. Waiting
  rows are therefore **not admissions**. My first pass took each block's minimum and silently pulled
  waiting-list scores into the floor: Open would have read **439 (waiting)** instead of 477, and Khasi
  **354 (waiting)** instead of 357. Excluded. Conversely Garo had been cut short at 214 when its
  selected list actually runs deeper.
- **FLOORS:** Open **477** · Khasi&Jaintia 357 · **Garo 214** (ST uses Garo, the deeper tribal pool) ·
  ST/SC block **396**. ⚠ Open 477 is an **UPPER BOUND** — the last two selected rows lost their score
  to OCR, so the true Open floor is somewhere in (439, 477].

### Nagaland — `amogh-csv/nagaland-2025-final-selected-list.pdf` (dte.nagaland.gov.in)
12pp **scan, mixed page rotation** (270° is the working angle). Marks-native. Category = the
candidate's tribe (Chakhesang, Ao, Sumi, Angami, Lotha, Sangtam) → **ST**.
⚠ **PARTIAL: only ~12 rows recovered of 66+** (recovered serial numbers include #1, 3, 4, 57, 58, 66,
so the list demonstrably runs past 66). Middle-page OCR quality is too degraded. Lowest **recovered**
MBBS = 349, BDS = 204 — **the true floor is LOWER**, i.e. this row **over-states** the bar. Flagged
`INDICATIVE / PARTIAL` in the sheet. No waiting-list section in this document (checked).

### Manipur — `amogh-csv/manipur-2025-r2-state-quota-allotment.pdf` (R2 Annexure-A)
OCR'd → 40 validated rows; **govt pool = RIMS + JNIMS + CMC = 30 rows** (**SAHS excluded — private**,
per Surya: *"SAHS is private"*).
- **★ BUG I CAUGHT AND FIXED — an inverted SC floor.** The raw data gives SC closing at AIR **128,070**,
  which is *tighter than* the Gen closing (140,838) — i.e. it would tell an SC student they need MORE
  marks than a General student. That is impossible as a cutoff; it is a **single** lucky allotment
  (**n=1**), not a pool. ST likewise has **n=2**. **Both dropped to qualifying.** Only **Gen (n=10, AIR
  140,838 → 439)** and **OBC (n=17, AIR 224,197 → 394)** have the depth to be reported.
- ⚠ **R2 is mid-counselling** → later rounds close deeper, so these floors run **TIGHT** (conservative).

### Delhi / Puducherry / Chandigarh — merged into the sheet this pass
Built earlier from **our own official data**; see their dedicated sections above. Delhi = MCC
`Seat Type='Delhi University Quota'` (3 colleges); Puducherry = `'Internal -Puducherry UT Domicile'`
(JIPMER); Chandigarh = the official **GMCH-32 admitted-student register** (marks AND AIR per student),
which disproved a third-party UR figure of 588 vs the real **514** — a 74-mark third-party error, and
the standing reason we do not publish unverified third-party numbers for the remaining small UTs.

## The 8 honest blanks
Present in the sheet with empty cutoff cells and the reason in `data_status`:
**Sikkim** (no govt college — SMIMS is private), **Ladakh**, **Lakshadweep** (no medical college) ·
**Goa, Mizoram, Tripura, Andaman & Nicobar, Dadra & Nagar Haveli and Daman & Diu** (1–2 govt colleges
but **no official 2025 document sourced**; third-party only, which we decline to publish given the
Chandigarh 74-mark lesson). For all 8, AIQ is the practical door and we have those numbers.

## SHEET NOW COMPLETE — 370 rows / 37 tracks
`scripts/neet_matrix_out/neet_2026_matrix_all.csv` (rebuilt in place by
`scripts/neet_matrix_merge_all.py` — precedence: official/OCR builders **override**
`smallstates_matrix_final.csv`, whose third-party rows for MN/ML/NL/AR/DL/PD/CH are now discarded).
**All 36 states/UTs + All India**, exactly 10 category rows each; 29 tracks carry numbers, 8 are blank.
Automated checks in the merge script: no missing state, every track exactly 10 rows, and a
**category-ordering check** (no reserved category harder than Gen).
Two surviving order flags are **real, not bugs**: Himachal OBC 493 vs Gen 491 and Chhattisgarh OBC 481
vs Gen 475 — same round, same source; OBC seats are simply scarcer than Gen at the loosest govt
colleges. Left as the data says.

## LADAKH — moved from BLANK to COVERED (2026-07-27, source sent by Surya)

**SOURCE:** `amogh-csv/ladakh-2025-central-pool-selected-list.pdf` — Directorate of Health Services,
UT Ladakh, Notification No. DHSL-(14)-of-2025 dated **22.10.2025**, subject *"Ladakh Centre Pool MBBS &
BDS Seats (Selection of Candidates and Allotment of Colleges) 2025-26"*, issued under MoHFW letter
No. U.14014/16/2022-ME-II. 4pp **scan** → OCR (300dpi greyscale, `--psm 6`).

**★ I HAD THIS WRONG.** The sheet previously said *"Ladakh: NO MEDICAL COLLEGE in the UT"* and left it
blank. The "no college" part is true — but the **conclusion** was wrong. Ladakh runs its **own GoI
Central Pool quota**, nominating its students to colleges across India (LHMC Delhi, MLB Jhansi, LLRM
Meerut, RSDKS Ambikapur, Dumka MC, CCM Durg; BDS at Govt. Dental Indore and KGMU Lucknow). That is a
real door and the only one these students have. **Generalised lesson:** absence of a college is NOT
evidence of absence of a quota — check for a nomination/central-pool notification before blanking a
state. Lakshadweep is now explicitly flagged as an unverified blank for the same reason.

**MARKS-NATIVE + AIR:** Annexure A prints NEET score and NEET AIR per candidate. 9 selected (7 MBBS,
2 BDS; one MBBS row's score was lost to OCR).

**★ WAITING-LIST EXCLUSION — and here it is decisive.** Annexure B (waiting list) top scorer is
**418**, which is ABOVE two ADMITTED candidates (412 and 419). Pooling the annexures would produce an
incoherent floor. Annexure B is also headed **2024-25** while Annexure A is 2025-26. Excluded.
(Third state where this rule mattered: Meghalaya, Ladakh — and checked-and-absent in Nagaland.)

**CATEGORY STRUCTURE:** pools are **Leh vs Kargil × Open vs Female** (district-domicile + gender), plus
"Unreserved / Reserved / Common Seniority list UT-Ladakh". This is **not** the Gen/OBC/SC/ST ladder, so
the single floor is reported on the **Gen** row and the other categories stay at qualifying rather than
inventing a mapping.

**FLOORS (2025 → 2026 est):** MBBS **412 → 438** (worst admitted AIR 187,194) · BDS **372 → 402**
(AIR 267,074). ⚠ Only 9 candidates — one seat moves the floor. Marked INDICATIVE.

**MERGE-SCRIPT BUG FIXED (found by its own checks):** `neet_matrix_merge_all.py` rewrites the sheet it
reads, so re-running it appended the new tracks a second time (520 rows, 15 duplicated tracks). Now
idempotent — it drops every state it owns (`NEW` ∪ `BLANK`) before re-adding. Verified: repeated runs
hold at 370 rows.

**SHEET NOW: 370 rows / 37 tracks — 30 with data, 7 honest blanks.**

## TRIPURA — moved from BLANK to COVERED (2026-07-28, source sent by Surya)

**SOURCE:** `amogh-csv/tripura-2025-r1-allotment.pdf` — Government of Tripura, **TRIPURA MEDICAL
COUNSELLING COMMITTEE (TRMCC)**, No.F.5(6)-DME/NEET/UG/Counselling/2025, Agartala **18 Aug 2025**,
*"Provisional Allotment result of Round-1 of Tripura NEET UG 2025 Counselling"*. Portal
`trmcc.admissions.nic.in`. 27pp **scan** → OCR 300dpi greyscale `--psm 6`.
Parser: **`scripts/parse_tripura_2025.py` (ours)** → `scripts/tripura_2025_out/`.

**★ BEST-STRUCTURED SMALL-STATE SOURCE WE HAVE.** Each row carries **NEET Rank AND NEET Marks** for the
same candidate, plus Category / Sub Category / Allotted Category / Institute / Program / Status. So it
is **marks-native** AND self-checking: the (marks, AIR) pair validates every OCR'd row.

**★★ FOURTH INDEPENDENT VALIDATION OF OUR score_rank MODEL.** Their printed (rank, marks) pairs vs our
curve, top of the list: 565↔6,860 (ratio 0.96) · 558↔9,141 (0.98) · 550↔12,341 (0.99) · 539↔17,736
(0.99) · 538↔18,769 (1.01) · 536↔19,777 (1.00) · 530↔23,976 (1.02) · 526↔26,572 (1.01) ·
522↔29,807 (1.01) · 521↔31,212 (1.03). **Ratios 0.96–1.03.** Joins TN (±1), MP (±1) and Haryana
(mean +0.86, sd 2.39). The model is now validated against **four** independent states' official marks.

**★★★ THE FINDING THAT CHANGES THE NUMBER — TMC IS NOT GOVT.**
Tripura has AGMC Agartala (**govt**) and **TMC / BRAM Teaching Hospital (a SOCIETY / private-status
college that carries a state quota)**. Every naive "closing" landed at TMC, and TMC's **ST seats go down
to 118, 124, 155, 168 marks — BELOW the 177 national qualifying floor.** Those pairs are internally
consistent (168↔AIR 957,617; 124↔1,231,448), so they are **real allotments, not OCR errors**. This is
precisely the private-college depth the govt filter exists to remove. **GOVT POOL = AGMC ONLY.**
⇒ Had we not filtered, Tripura ST would have been published at **118** instead of **297** — a 179-mark
error, and the single largest govt-vs-private contamination found in this project.

**★ CROSS-STATE NE SEATS (relevant beyond Tripura):** Tripura candidates are allotted to **RIMS Imphal
(Manipur)** and **NEIGRIHMS** as well as their own colleges — the NE regional/NEC pattern again, from a
third independent state's document. Recorded per row (`inst_state`, `inst_type`) so doors stay separable.

**MY PARSER BUG (found, fixed — not OCR's fault).** First run recovered only 35% with 37 rows rejected as
"marks/rank inconsistent". Cause: I took "the first number in 100..720" as marks, which grabbed a
fragment of the 10-digit roll or the rank itself. The table order is **Roll | Name | Rank | Marks**, i.e.
rank and marks are an **adjacent pair**. Fixed by stripping the 10-digit roll, then taking the first
adjacent (rank, marks) pair that agrees with our curve → **recovery 35% → 59%**, and OBC/EWS (previously
absent) appeared. Also loosened category patterns: OCR drops "Other" from "Other Backward Class" (match
bare `Backward`), `General-EWS` must be tested before plain `General`, and `\bST\b` needed `(?!\w)` or it
matched inside "INSTITUTE".

**FLOORS — AGMC govt MBBS, R1 (2025 → 2026 est):** OBC **403 → 430** (n=2) · SC **333 → 366** (n=3) ·
ST **297 → 333** (n=3). **Gen and EWS left at qualifying** — AGMC Gen rows are visibly in the PDF
(536/530/526/522) but OCR split `MEDICAL COLLEGE, AGARTALA` onto a separate line from the numbers, so we
have **no verified AGMC Gen closing**. Reported blank rather than guessed. BDS: single AGMC Gen row
(410) → n=1, not published. ⚠ **R1 only** → runs TIGHT; thin n throughout. Marked INDICATIVE/PARTIAL.

**SHEET NOW: 370 rows / 37 tracks — 31 with data, 6 honest blanks.**

## MIZORAM — from BLANK → bad ESTIMATE → GROUND TRUTH (2026-07-28)

This one is worth reading as a method lesson, not just a data entry.

### Step 1: no allotment exists (confirmed, not assumed)
DHTE Mizoram (Higher & Technical Education — **not** DME) runs the state's NEET quota. Its entire NEET
menu on `dhte.mizoram.gov.in` is **four files**: 2025 seat matrix, 2024 seat matrix, 2025 syllabus, a
2024 DigiLocker notice. **No allotment result, for any year.** The 2025 provisional merit list exists
(Scribd mirror, 27 Jun 2025) but is no longer on the official domain. Also checked: the file named
`alloted-candidatelist-08august24-1.pdf` is **CSAB engineering**, not NEET (0 occurrences of
MBBS/BDS/MEDICAL) — a filename that would have misled a less careful pass.

### Step 2: the estimate I built, and why it was wrong
With no allotment, I inferred a bar: official **2026** merit list (381 candidates with NEET scores) +
official seat matrix (**79 MBBS seats** = ZMCH Palkawn 70 + RIMS Imphal 7 + AGMC Agartala 2) → read off
the **79th-ranked score = 435**. I flagged it as an over-estimate and noted the distribution was flat
near the boundary (pos 60→444, 79→435, 100→426), so ±20 seats moved it only ~10 marks.
**Surya pushed back on the whole idea** ("i'm curious how u are arriving at a cutoff number"), which was
the right instinct.

### Step 3: ground truth, and the size of the error
Surya found **ZMCH's own site** publishes the **NMC admitted-student return** as 10 page images
(`zmc.edu.in/pages/list-of-mbbs-2025`, footer `nmc.org.in/.../ugCourseSummaryPrint`, "10/10").
Saved to `amogh-csv/mizoram-zmch-2025-admitted/` (11 URLs, 2 byte-identical → 10 unique pages).
Parser: **`scripts/parse_mizoram_zmch_2025.py`** (ours) → `scripts/mizoram_2025_out/`.
2× LANCZOS upscale + `tesseract --psm 6` → near-perfect OCR; **90 of 100 rows** recovered.

**Real ST closing = 335. My estimate was 435 — 100 MARKS TOO HIGH.**
Exactly the predicted direction (non-reporting, upgrades and students leaving for AIQ/private let seats
cascade far below the naive top-79 boundary) but far larger than the ±10 the flatness analysis implied.
⇒ **LESSON: a seat-count inference is not a substitute for an admitted list.** The flatness check
bounded the wrong thing — it measured sensitivity to the seat *count*, not to the assumption that the
top-N take the seats. That assumption was the actual error, and nothing in the merit list could have
revealed it. Record such numbers as ESTIMATE and replace them the moment real data appears.

### The register, and the two filters that matter
Columns: S.No | Merit No. | Name | Sex | **PwD** | DOB | **Category** | **Sub Category** | 10+2 PCB
marks/max/% | 10+2 English | Entrance Exam Name | **NEET marks /720** | 720 | Entrance % | **Fees
Charged** | Admission Date. Marks-native, per admitted student — same class of source as Chandigarh's
GMCH-32 register.
- **NRI must be excluded.** `Category` = Govt vs NRI, corroborated by the fee column (**Rs 96,850 govt
  vs Rs 17,75,800 NRI**). 14 NRI rows span **133–425 marks**; pooling them would wreck every floor.
- **PwBD must be excluded** (horizontal sub-pool, as everywhere else): 1 row at **154** marks. It also
  *shifts the column layout*, which is how it initially lost its Sub Category to the regex and showed up
  as a mystery sub-qualifying row — the anomaly that led to catching it.

### ★ The AIQ-inside-a-state-college trap
The govt rows split into **ST n=62 closing 335** and **General n=7 (443–535) / OBC n=2 (527) / SC n=4
(272–444)**. The non-ST names — MD Aatif Nazir, Nayancy, Dev Pareek, Sakshi Patidar, Alok Kumar,
Uthjani Das — are **not Mizoram-domicile**. They are the **15% All-India Quota** seats at ZMCH. The
register does not label state-vs-AIQ, so a naive read would have published "Mizoram General = 443",
which is an AIQ bar, not a Mizoram-domicile bar. **Only the ST row is published**, consistent with the
seat matrix (68 of ZMCH's 70 seats are ST; Cat-3/Cat-4 = 1 each). This is a general hazard for any
single-college state whose register mixes doors.

**FLOOR:** MBBS ST **335 → 368** (2026 est), n=62, VERIFIED. **No govt BDS** — all 12 Mizoram BDS seats
are outside the state (RIMS, Guwahati, KGMU Lucknow, Patna, Chandigarh).
Sources saved: `amogh-csv/mizoram-zmch-2025-admitted/` (register), `mizoram-2025-neet-seat-matrix.pdf`,
`mizoram-2026-provisional-merit-list.pdf` (kept as evidence for the seat-matrix/merit-list context).

**SHEET NOW: 370 rows / 37 tracks — 32 with data, 5 honest blanks.**

## REVIEW ROUND — Venu & Amogh's flagged rows (2026-07-28)

Nine rows were queried as implausible. Each was traced back to that state's own raw source. **Two
different problems were hiding behind the same-looking numbers**, and only one was ours.

### Problem 1 (5 rows): "no such quota" was masquerading as a cutoff — FIXED
A state that does not operate a category left the cell falling back to the **national qualifying floor**
(177/213), which reads exactly like a computed cutoff. Same number, completely different meaning. This
was the single most misleading thing in the sheet and accounted for 5 of the 9 queries.

Verified in each state's own raw data (not assumed):
| Row | Evidence | Verdict |
|---|---|---|
| Punjab ST 177 | 199 rows / **18 categories** (Open, EWS, Backward Classes, SC, Border Area, Sports, Riots-Affected, Defence…) — **0 ST rows** | No notified STs in Punjab |
| Haryana ST 177 | 2,213 allotments / **27 category codes** (OPEN_CAT, BCA, BCB, EWS, SC, SC_DEPRIVED…) — **0 ST rows** | Same structural reason |
| Odisha OBC 177 | 1,940 allotments, categories are exactly **GN / EW / SC / ST** | 27% OBC applies to **AIQ**, not the state pool — matches the policy note |
| Tamil Nadu EWS 213 | 8,165 allotments: **BC / MBC&DNC / OC / BCM / SC / SCA / ST** | TN runs its own communal reservation; **never implemented the 10% EWS quota** |
| Himachal EWS 213 | HP R3 source carries **1 EWS row** | No meaningful EWS pool |

**FIX:** `NO_QUOTA` in `neet_matrix_merge_all.py` blanks all 8 cutoff cells and writes
`N/A — NO <X> QUOTA in <state> (verified: …)` into `data_status`. `B2b` is kept (the national
qualifying floor still applies to that candidate; it just isn't a cutoff).

### Problem 2 (4 rows): the numbers were CORRECT — ST pools genuinely close deep
MH ST 339 / GJ ST 295 / WB ST 253 / UK SC 258. Each reproduced from raw data; the govt filter verified
working (the deeper rows — V Pawar, ACPM Dhule, Vedanta, Terna, Parul, Nootan, Swaminarayan — are all
**private** and correctly excluded).
**Why they look low:** ST closes far deeper than SC/OBC in the same round, same source, same filter.
Maharashtra govt colleges: **ST closes AIR 339k vs SC 161k — a 2× gap.** ST seats go unfilled at higher
ranks, so the floor cascades. National spread confirms it is not a MH quirk: **ST floors run 214
(Meghalaya) → 468 (Chandigarh)**, with MH 339 mid-pack beside Mizoram 335 and MP 331.
⇒ **No change. These are real.** Documented so the next reviewer does not re-litigate them.

### Problem 3 (1 row): a one-seat pool below the gate — BLANKED
**Uttarakhand ST**: 5 govt colleges, ST pool is effectively **ONE seat closing past AIR 1,091,883** —
below the national qualifying gate. n=1 is not a floor, it is one student. Blanked via `THIN_POOL`.

### New permanent guard
`neet_matrix_merge_all.py` now asserts: **no NON-PwD cell may sit at/below the national qualifying
gate.** (PwD rows are qualifying by design.) A survivor means either a one-seat pool or private-college
contamination — never a real floor. Currently: **none**. This is what would have caught Uttarakhand ST
and the Tripura/TMC contamination automatically.

Also fixed: the coverage rollup counted a state as "BLANK" if its *first* category was blank, so
blanking Punjab ST made all of Punjab look uncovered. Now a state is "with data" if **any** category
has a real floor. Sheet: **370 rows / 37 tracks — 32 with data, 5 blank.**
