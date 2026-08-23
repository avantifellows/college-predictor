# NEET-UG College Predictor — Data-Quality Audit: Prioritized Engineering Report

Scope: 10 state sources. 20 confirmed bugs, 4 refuted claims. Two bug classes dominate and are cross-cutting; fixing them clears the large majority of anomalies.

---

## CRITICAL

### C1. Contaminated MAX-AIR aggregation → impossible 300k–1.3M closing ranks (Maharashtra, Telangana, Andhra)
The single most damaging defect. Per-bucket closing rank is computed as the raw `max()` of allotted AIRs with no outlier guard, so one mis-attributed / special-pool candidate poisons the whole bucket. Government-college reserved (and even OPEN) cutoffs come out 20–100x too large — physically near the ~1.1M NEET-qualified total.

- **maharashtra** — `06_parse_maharashtra.py` L22, L88, L128–129. 591/2157 rows (27%) > 300k, up to 1,310,921. GSMC Mumbai SC=372774, GMC Nagpur ORPHAN=988830 (this exact value is literally the worst-outlier candidate, confirmed against web), while same college OPEN=11360 is sane. The `bare` flagless bucket (classify_category L64–84) is the catch-all sink: any row whose Female/Home/EM sub-flag fails to detect lands there. Right-to-left token scan at L72 mis-picks allotted-seat tokens.
- **telangana** — `07_parse_telangana.py` L65 `if air > buckets.get(key,0)`. 147/1055 (13.9%) > 300k. Osmania OPEN=439,096 (real ≈18,913), Suryapet OPEN=1,315,471. Female pools especially poisoned (T-source finding 3: Osmania BCD Female=1,276,915 vs male 40,135) because tiny pools let one outlier dominate.
- **andhra** — `05_parse_andhra.py` L48, L76–77. 62/354 (18%) > 300k. AMC Vizag OC=881,082 (real ≈9,703), Guntur OC=1,162,298. **Distinct deeper root cause:** parser reads only the vertical category `toks[3]` and *discards `toks[4]`, the horizontal sub-reservation* (PH/CAP/NCC/Sports/GEN). PH/CAP/Sports candidates (AIR ~0.9–1.3M in tiny pools) collapse into the vertical `OC` bucket, then `max()` picks the special-pool worst rank as the OC cutoff. EWS/BCC pools are clean precisely because they have no horizontal sub-tail — confirms the mechanism.

**Fix.** Replace raw `max()` with an outlier-robust closing rank (drop top 1–2% / IQR fence / high percentile) plus a govt-college sanity ceiling (~250k) that clips-or-flags for manual review. For **andhra specifically**, capture `toks[4]` and either restrict the vertical cutoff to the GEN/open sub-pool or emit sub-pool-tagged buckets (`OC`, `OC (PH)`, `OC (CAP)`). Anchor post-fix spot checks: Osmania OPEN ≈15–20k, Kakatiya ≈10–15k, AMC Vizag OC ≈10k, Guntur OC ≈12–32k. Note: some source PDFs are `~/Downloads` symlinks unreadable in-sandbox — confirm contaminant rows on a machine with PDF access before shipping.

### C2. Seat-Type collapse in the assembler → Management/NRI/Municipal seats mislabeled "State Quota" (Gujarat critical; also WB/Punjab/Himachal high)
`generate_neet_data.py` hardcodes `seat_type = "All India" if is_national else "State Quota"`, discarding the per-row Seat Type the parsers correctly emit. This is the top cross-cutting bug — see the dedicated section below. Gujarat is rated critical because absurd NRI/Management ranks (Zydus Mgmt 1,096,994; GMERS Gotri NRI 858668) become "State Quota" rows a student can match by AIR and mistake for a genuine cheap state seat.

---

## HIGH

### H1. Seat-Type collapse (cross-cutting — see dedicated section) — Gujarat, West Bengal, Punjab, Himachal, MP
### H2. andhra — no allowlist on sub-token `toks[4]` (`05_parse_andhra.py` L40–48, L76–77). Second axis of the C1/andhra defect; contamination hits every vertical category with a horizontal sub-pool (BCA 7/35, BCD 8/32, SC1 8/33, ST 5/35). Fix folded into C1.
### H3. telangana — four distinct Govt Medical Colleges collapse into one bare "GOVT MEDICAL COLLEGE" (`generate_neet_data.py` `split_institute()` ~L120, guard `len(city.split()) <= 2`). GMBK + GJBP + GASF + GYDT all have 3-word city segments, so `looks_like_city` fails and the name falls back to `parts[0]`. Telangana CSV has no Address column, so `r.get('Address')` is None (L159) and the code takes the split_institute fallback (L164) instead of trusting the clean parser name. Student sees one garbled college with 3–4 contradictory cutoffs/category. **Fix:** give the Telangana parser an (even empty) Address column so the assembler trusts the parser's already-clean `NAME, CITY` string; or relax the word-count guard / match on trailing comma-city regardless of word count.
### H4. kerala — NRI quota split by leaked footnote asterisk: `NR` (33 rows) vs `NR *` (5 rows) (`09_parse_kerala.py` L83, pivot key L94). All 5 `NR *` colleges also have an `NR` bucket. **Fix:** `cat = re.sub(r'[\s*]+$','',(r[6] or '')).strip()` before bucketing.
### H5. kerala — NRI/management/community-nominee codes (NR, NR*, MM, NM, NC, AC) stored in the social-Category field (`09_parse_kerala.py` L83; Seat Type hardcoded 'State Quota' L117). All appear only at private colleges (0 govt), with pay-to-fill ranks up to 1.3M. **Fix:** map these codes to Seat Type 'NRI'/'Management' and exclude/tag them so a general-merit AIR query doesn't surface them.

---

## MEDIUM

### M1. maharashtra — EM (EarMarking/Minority) mislabeled 'EWS-Minority' (`06_parse_maharashtra.py` L54, L74–75, L145). 404 rows. EM = minority-institution EarMarked (religious/linguistic) seats, *not* EWS — and real EWS rows exist separately, so this conflates two distinct things. **Fix:** rename flag/label to 'Minority (EarMarked)'; keep distinct from central EWS; check for collapsed EMR/EMD sub-tokens.
### M2. mp_2025 — NRI quota as a social category (16 rows) (`04_parse_flat_states.py` L31 category=col12, L74, L82). NRI is a real seat quota (~15% at MP private colleges), ranks 700k–1.1M are legitimate for pay seats, but the classification is wrong. **Fix:** route NRI/MGMT/institute-quota tokens to Seat Type, keep out of the category facet.
### M3. mp_2025 — parser's GOVT/Private Seat Type discarded downstream (`04_parse_flat_states.py` L31 quota=col9, written L90; overwritten to constant 'State Quota' by assembler). Predictor can't distinguish govt from private/NRI. **Fix:** preserve CSV Seat Type (part of C2 assembler fix), or add an Institution Type field.
### M4. punjab — NRI carried as Category with mismatched 'Govt. Quota' seat type at GMC Patiala (`04_parse_flat_states.py`, category=col11 vs quota=col10, no reconciliation). CR=1,094,655. Pollutes the Punjab state-category dropdown with a fake 'NRI' category. **Fix:** when category token is a known quota marker (NRI/MGMT/Minority), route to Seat Type / reconcile to 'NRI Quota'.
### M5. himachal — NRI as social category, IGMC Shimla Category='NRI' (`08_parse_himachal.py` L64, CATEGORY_FIX L33 maps 'nri'->'NRI'). Compounded by the C2 assembler collapse. **Fix:** remove 'nri' from CATEGORY_FIX; set Seat Type='NRI Quota', normalize category to General.
### M6. himachal — line-wrap truncation splits 'Himachal Dental College, Sunder Nagar' → phantom '…Sunder' (`08_parse_himachal.py` L61, `_norm` doesn't canonicalize; key L69). One SC/BDS row (305269) filed under a separate institute identity. **Fix:** add institute-name canonicalization / alias map before building the bucket key. Low blast radius.
### M7. karnataka — Round hardcoded 'R3' but PDF is the Mop-Up round (`03_parse_karnataka.py` L71). BMCRI GM=3478 matches the published *mop-up* figure, not R3. Ranks are correct for the round; only the label (and CSV filename `..._r3_...`) is wrong. **Fix:** read the actual phase from the PDF header; correct the filename.
### M8. andhra — `anomaly_scan.py` reports 0 anomalies despite 18% impossibly-high rows. Scanner lacks (a) a govt-college AIR ceiling rule and (b) intra-college monotonicity (open ≤ best reserved). **Fix:** add both rules. (Tooling gap, not a data bug, but it let C1/andhra pass silently — same blind spot masked kerala and andhra manual-only findings.)

---

## LOW

### L1. karnataka — institute address/pincode leaks into Institute name; enrichment truncates inconsistently (`03_parse_karnataka.py` L47, key L53). Raw college cell (name+address) used as Institute and in the bucket key — latent dup-bucket risk. **Fix:** reuse shared `_institute.split_institute`; key buckets on the stable KEA code (M001) instead of the raw name string; store clean Institute + separate Address.
### L2. punjab — case-variant seat-type labels 'Christian Minority' vs 'CHRISTIAN MINORITY' (`04_parse_flat_states.py` L73, no case normalization). Currently masked by the C2 collapse; becomes a real split the moment C2 is fixed. **Fix:** normalize quota token casing (title-case / canonical map) at L73 — do it *alongside* the C2 fix to avoid introducing a new dup.

---

## CROSS-CUTTING PATTERNS (shared fixes)

### CC1. Assembler discards parser Seat Type — the biggest single lever
`college-predictor/scripts/generate_neet_data.py` **L156/157** (line varies slightly per source snapshot: L155 himachal, L156 gujarat/punjab, L157 westbengal):
```
seat_type = "All India" if is_national else "State Quota"
```
This one line ignores the per-row `Seat Type` column that the parsers correctly populate, causing **five** of the confirmed bugs and the bulk of the "duplicate bucket" anomalies:

| Source | Symptom | Anomalies cleared |
|---|---|---|
| gujarat | Mgmt/NRI/Municipal → State Quota (critical) | 46 R3-dup |
| punjab | 7 seat types → State Quota | 49 R3-dup |
| westbengal | Mgmt/NRI → State Quota | 16 R3-dup |
| himachal | HP/Mgmt/NRI Quota → State Quota | 6 R3-dup |
| mp_2025 | GOVT/Private lost | (M3) |

**One shared fix:** for non-national sources honor the CSV column —
```python
seat_type = "All India" if is_national else ((r.get("Seat Type") or "").strip() or "State Quota")
```
Parsers already include quota in their pivot keys, so no re-parse is needed. The UI cross-state filter keys on `'All India'` vs non-`'All India'`, so any non-national label preserves home-state gating. This eliminates ~117 dup anomalies at once. Note the interaction with **L2**: normalize seat-type casing in the parser at the same time, or Punjab gains a new Christian-Minority split.

### CC2. Contaminated MAX-AIR aggregation
Same code shape in three parsers: `06_parse_maharashtra.py`, `07_parse_telangana.py:65`, `05_parse_andhra.py:76-77` — raw `max()` per bucket with no outlier trimming or ceiling. **Shared fix:** a common robust-closing-rank helper (percentile/IQR + govt-college ceiling) applied across all three parsers, rather than three bespoke patches. Andhra additionally needs the `toks[4]` sub-pool capture.

### CC3. Quota tokens landing in the social-Category axis
NRI/Management/Minority/Institute-Quota codes emitted as social categories in **six** sources: maharashtra (I.Q., EM), kerala (NR/MM/NM/NC/AC), mp (NRI), punjab (NRI), himachal (NRI). **Shared fix:** a single canonical quota-token classifier used by all parsers that routes known quota markers to Seat Type and keeps them out of the category facet + the per-state category dropdown (`neet_state_categories.json`).

---

## NOT BUGS (real-world quirks — do not chase)

- **karnataka — "silent row loss, ~318 of thousands of rows recovered."** REFUTED. The PDF has exactly 967 student rows (SL.NO contiguous 1→967, zero gaps); extract_tables recovers all 967, skip=0; 967→318 buckets is legitimate aggregation. Flagship colleges appear once because this is a single R3 mop-up delta.
- **karnataka — BMCRI/Mysore "missing reserved categories."** REFUTED. Mop-up round only ~596 vacant seats; govt flagships filled in R1/R2. Clean monotonic desirability gradient rules out random row loss. GM values web-confirmed. Reserved cutoffs are supplied via the AIQ source.
- **karnataka — quota/minority tokens (NRI/OTH/OPN/GMP/…) in Category column.** REFUTED as a *bug* — it is a documented deliberate design ("labeled state codes, no fabricated state→central mapping"). AIQ rows filter by central category; state-quota rows use the optional Home-State Category dropdown that intentionally surfaces raw KEA codes. UX opacity only. (Contrast: MP/Punjab/Himachal NRI *are* bugs because NRI is a quota wrongly in the category axis, not a legitimate KEA social-peer code.)
- **kerala — special-reservation codes (PD/XS/SD/DA/PT/…) in Category field.** REFUTED. Real KEAM quota codes, faithfully recorded; deep ranks are genuine tiny-pool tails. State-quota rows aren't filtered by central category; codes are pickable in the Home-State dropdown by design. Residual UX weakness only (a student who leaves the state-category blank sees these mixed in), not a parser/data defect.

---

## FIX PLAN (ordered by impact ÷ effort)

1. **CC1 — assembler Seat Type one-liner** (`generate_neet_data.py` L156). Lowest effort, huge impact: clears ~117 dup anomalies across gujarat/punjab/westbengal/himachal + fixes MP seat type. Ship first. *Do together with L2 (Punjab casing normalize) to avoid a regression.*
2. **CC2/C1 — robust closing-rank helper + govt ceiling** across maharashtra/telangana/andhra. Highest correctness impact (the ranks are currently unusable), medium effort. Regenerate `NEETUG.json`; validate against the web anchors listed in C1.
3. **andhra `toks[4]` sub-pool capture** (`05_parse_andhra.py`). Do with #2; without it AP recontaminates. Add an assertion/log for unseen sub-tokens.
4. **CC3 — shared quota-token classifier**: fixes maharashtra I.Q., kerala NR-family, mp/punjab/himachal NRI in one taxonomy layer. Medium effort; also cleans the state-category dropdowns.
5. **kerala footnote strip (H4)** — one-line regex; do inside the CC3 pass.
6. **telangana college-name collapse (H3)** — add Address column to parser 07 (preferred) so assembler trusts clean names.
7. **maharashtra EM→Minority rename (M1)** and **himachal institute canonicalization (M6)** — targeted, low blast radius.
8. **karnataka round label (M7)** + **karnataka name/address split & code-keyed buckets (L1)** — labeling/hygiene; lowest urgency.
9. **anomaly_scan.py (M8)** — add govt-AIR-ceiling and open≤best-reserved monotonicity rules so C1-class and dup-class defects can't pass silently again. Do before regenerating so it gates the re-run.

Suggested sequencing: **1 → (9 as a gate) → 2+3 → 4+5 → 6 → 7 → 8.**
