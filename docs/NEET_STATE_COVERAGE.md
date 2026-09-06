# NEET 2026 matrix — state & UT coverage at a glance

One row per state/UT. What we have, where it came from, and what we assumed.
(Full detail lives in `NEET_2026_MATRIX_DECISIONS.md` — this page is the summary.)

**Reading the columns**
- **Source** — whose data: *Ours* (our parser), *Dropbox* (Amogh's pipeline), or *Official PDF* (we parsed the board's own document).
- **Round** — which counselling round the cutoff is from. Later rounds = looser cutoffs. **This matters when comparing states.**
- **Rank → marks** — did we convert a state rank into All-India Rank, or was the data already in AIR/marks?
- **Category notes** — how that state's own categories were mapped to Gen/EWS/OBC/SC/ST.
- **Outlier handling** — what we excluded so one odd seat didn't distort the floor.

---

## ✅ Covered — 31 states/UTs + All India (32 tracks)

**Every one of India's 36 states/UTs is now in the sheet.** 31 carry numbers; the remaining 5 are
present as blank rows with the reason written into the `data_status` column (blank ≠ zero).

| State / UT | Source | Round | Rank → marks | Category notes | Outlier handling |
|---|---|---|---|---|---|
| **All India (AIQ)** | Ours | R1 (strict) | AIR — direct | Standard 5 | National-quota filter only |
| **Andhra Pradesh** | Ours (+Dropbox BDS) | R3 final | AIR — direct | SC = median of SC1/2/3; OBC = median of BCA–BCE | PH/CAP/NCC/SG pools excluded |
| **Assam** | Dropbox raw | R1 + merit list | AIR — direct | ST = median of ST(P) + ST(H) | **Score-guard fix** — parser had put score-150 candidates in UR seats |
| **Bihar** | Dropbox | R3 revised | AIR — direct | OBC = median of BC + EBC | **2 private colleges removed** from their govt list |
| **Chhattisgarh** | Dropbox **raw** | R1+R2 | AIR — direct | Standard 5 | Their summary file was **stale**; "Special ST" (1 seat) excluded |
| **Gujarat** | Ours | R3 final | AIR — direct | OBC = SE (Gujarat's SEBC) | GMERS counted as govt; private-with-govt-quota excluded |
| **Haryana** | **Official PDF** (ours) | **R1 only (strict)** | **Marks — direct** | OBC = median of BCA + BCB; SC = median of SC + SC-Deprived; **no ST quota** | Only "Allotted" rows kept (2,213 of 7,595); MGT/NRI/PwD excluded |
| **Himachal** | Dropbox | R3 final | AIR — direct | No EWS in HP counselling | Only 6 colleges — thin |
| **Jammu & Kashmir** | Dropbox | R1/R3 | **UT merit list → marks** | Open Merit = Gen; RBA/ALC/P&B are J&K-only quotas, excluded | Thin reserved pools |
| **Jharkhand** | **Official PDF** (ours) | R1+R3 | **Marks — direct** | OBC = median of BC-I + BC-II | **Re-parsed from source** — their parser read the wrong column |
| **Karnataka** | Dropbox | R3 | AIR — direct | OBC = seat-weighted median of 1/2A/2B/3A/3B; EWS ≈ GM | **Fee-based govt filter** — their tag included private colleges |
| **Kerala** | Ours | Phase 3 final | AIR — direct | OBC = median of 9 communities (Ezhava, Muslim, LC…) | Sparse communities diluted by median |
| **Madhya Pradesh** | Ours | **R1 (strict)** | AIR — direct | Standard 5 | Horizontal /X/ pools only |
| **Maharashtra** | Ours | R3 final | AIR — direct | OBC = literal OBC (SEBC/NT/VJ deferred) | Orphan/EarMark pools excluded |
| **Odisha** | **Official PDF** (ours) | R3 | **State rank → AIR** (our 5,817-pair bridge) | **No OBC in state quota** (policy) | SGS/NRI + Green-Card/PC/Ex-serviceman excluded |
| **Punjab** | Ours | **R2 (strict)** | AIR — direct | **No ST quota** | NRI row mislabelled "Open" removed; private-with-govt-quota excluded |
| **Rajasthan** | **Official PDF** (ours) | **R1 only (strict)** | AIR — direct | OBC = median of OBC + MBC; ST = median of ST + Sahariya | **PwD/Ex-serviceman/war-widow excluded** — they close near AIR 1.1M |
| **Tamil Nadu** | Dropbox | Through R3 | **Marks — direct** | OBC = median of BC/BCM/MBC; SC = median of SC + SCA; **no EWS** | Cleanest state — no conversion needed |
| **Telangana** | Ours (+Dropbox BDS) | **Mop-up (loosest)** | AIR — direct | SC = median of SC1/2/3; OBC = median of BCA–BCE | PHO/CAP/MRC pools excluded |
| **Uttar Pradesh** | Dropbox | R1+R2+R3 | AIR — direct | Standard 5; looser of boys/girls | **PPP colleges excluded** — their parser wrongly called them govt |
| **Uttarakhand** | Dropbox | R3 | AIR — direct | Standard 5 | Only 5 colleges; ST = 1 seat → very thin |
| **West Bengal** | Ours | **R1 (strict)** | AIR — direct | OBC = median of OBC-A + OBC-B | Management-quota rows excluded |

### Small UTs and the North-East — added last, weaker data, read the caveats

These use **single-college or nomination-based** pools, so `median-of-5-loosest` degenerates. They are
marked **INDICATIVE** in the sheet, never VERIFIED. They are still worth having: for a student in these
states this *is* the door they walk through.

| State / UT | Source | Round | Rank → marks | Category notes | Caveat that matters |
|---|---|---|---|---|---|
| **Delhi** | **Ours — official MCC** | R1+R3 | AIR — direct | Standard 5 | Only the **3-college DU quota** (MAMC/UCMS/LHMC + MA Dental). AIIMS/VMMC/ABVIMS/BSA are central. Elite pool — floors far above other states. |
| **Chandigarh** | **Official PDF** (ours) | Final admitted list | **Marks AND AIR per student** | Standard 5 | Best small-UT source we have. Third-party claimed UR **588**; the official register says **514** — third-party discarded. ST = 1 student. |
| **Puducherry** | **Ours — official MCC** | R1+R3 | AIR — direct | Standard 5 | JIPMER internal UT-domicile quota. Odd EWS/ST values are **real** sparse-pool behaviour, reproduced from official rows. |
| **Manipur** | **Official PDF, OCR'd** | **R2 (mid-round)** | AIR — direct | Standard 5 | Govt = RIMS/JNIMS/CMC (**SAHS is private, excluded**). Gen n=10, OBC n=17. **SC (n=1) and ST (n=2) left blank** — one allotment is not a floor. R2 → later rounds go deeper, so these run **tight**. |
| **Arunachal Pradesh** | **Official PDF** (ours) | R1 | AIR — direct | **Only one category exists** | Every row is `Cat-I` (APST). There is **no Gen/OBC/SC split** in the source, so only the ST row is filled. |
| **Ladakh** | **Official PDF, OCR'd** | Final selected list | **Marks — direct** | **No Gen/OBC/SC/ST ladder** — pools are Leh/Kargil × Open/Female (district-domicile) | **No college in the UT** — this is Ladakh's own **GoI Central Pool** nomination quota. Only **9 selected candidates**. Waiting list excluded — its top scorer (418) outranks two *admitted* candidates. |
| **Mizoram** | **Official admitted register** (ours) | Final admitted list | **Marks per admitted student** | ST is the state quota (68 of ZMCH's 70 seats) | **ZMCH publishes its NMC return as page images.** Ground truth. NRI rows (133–425, fee ₹17.76L) and 1 PwBD row excluded. **General/OBC/SC rows (443–535, non-Mizoram names) are 15% AIQ seats at ZMCH, not state-quota floors.** No govt BDS in the state. |
| **Tripura** | **Official PDF, OCR'd** | **R1 only (strict)** | **Marks AND AIR per candidate** | Standard 5 | **GOVT = AGMC only.** TMC/BRAM is a **society** college whose ST seats reach **118–168 marks — below the national qualifying floor** — excluded. Thin (OBC n=2, SC n=3, ST n=3). **Gen/EWS blank**: AGMC Gen rows exist in the PDF but OCR split their institute token. |
| **Meghalaya** | **Official PDF, OCR'd** | Final selected list | **Marks — direct** | **Khasi & Jaintia and Garo are Scheduled Tribes**, not OBC | **Waiting-list rows excluded** — the Order nominates them only if a selected candidate fails to report. Gen **477 is an upper bound** (2 selected rows lost their score to OCR). ST uses the deeper Garo block. |
| **Nagaland** | **Official PDF, OCR'd** | Final selected list | **Marks — direct** | Category = tribe → ST | **PARTIAL: ~12 of 66+ rows recovered** from a rotated scan, so the **true floor is LOWER** than shown. Treat as an over-estimate of the bar. |

**Applies to every state:** floor = **median of the 5 loosest government colleges** (not the single deepest seat); PwD rows = qualifying marks; private colleges excluded.

### ⚠ The North-East works differently — don't read these as ordinary state cutoffs

Most NE states do **not** run a normal "state college" quota. They **nominate** their students into
seats reserved for that state at colleges **across India** — the **GoI Central Pool** and **NEC (North
Eastern Council)** regional seats. Straight from the documents:

- **Nagaland**: *"...SELECTED THROUGH NAGALAND STATE-NEET (UG) 2025 COUNSELLING FOR **STATE RESERVED
  SEATS**"*, with an allotment column reading **"GoI Central Pool"** → students placed at VMMC
  Safdarjung, LHMC and MAMC Delhi, GMC Nanded, RIMS Imphal, NEIGRIHMS.
- **Meghalaya**: *"...in respect of the **seats allotted to the State of Meghalaya**"* → Guwahati MC,
  Gandhi MC Bhopal, SP MC Bikaner, VMMC Delhi, MGM Indore, Jorhat MC.
- **Arunachal**: 94 MBBS allotments = 85 TRIHMS (own state) + 7 RIMS Imphal + 2 Agartala GMC.

So an NE number is **the bar to win a state-reserved nomination**, not a state-college closing rank.
That is still exactly the right number for "will this student get an MBBS seat".

**Manipur is the exception** and behaves like a normal state: RIMS / JNIMS / CMC run an 85% Manipur
state quota. RIMS is centrally *run*, but its 85% is administered by Manipur DME and reserved for
Manipur and other NE-state residents — verified, and the reason we did **not** exclude it as central.

---

## ⬜ Blank — present in the sheet, but with no numbers (5)

These appear in `neet_2026_matrix_all.csv` with **empty cutoff cells** and the reason in `data_status`.
We chose blank over a guess: a wrong number here would silently mis-advise a student.

### No medical college, and no nomination quota found

⚠ **"No college" does NOT automatically mean "no data"** — Ladakh has no medical college yet runs its
own GoI Central Pool nomination quota, which we only found because Surya sent the notification. The
same may well be true of Lakshadweep; it is a **search gap, not a proven absence**.

| State / UT | Why |
|---|---|
| **Sikkim** | **No government** medical college (only SMIMS, private) — no state govt quota. |
| **Lakshadweep** | No medical college. Believed to be central-pool nominations only — **we have not found the nomination list**, so this is unverified (see the Ladakh precedent). |

### One or two colleges, and **no official document sourced**

We could only find third-party figures for these. Chandigarh is the cautionary tale — third-party said
UR 588, the official register said 514, a 74-mark error. So we do not publish unverified third-party
numbers.

| State / UT | Govt colleges | What's needed to fill it |
|---|---|---|
| **Goa** | 1 (GMC Bambolim) | The DTE Goa 2025 allotment/admitted list |
| **Andaman & Nicobar** | 1 (ANIIMS) | ANIIMS 2025 UT-pool list |
| **Dadra & Nagar Haveli and Daman & Diu** | 1 (NAMO MC, Silvassa) | 2025 UT-pool allotment list |

**For all 5: All-India Quota is the practical door**, and we have those numbers — **Gen 548 · EWS 542 · OBC 547 · SC 476 · ST 457** (2026 estimate).

---

## ⚠ "N/A" vs a low cutoff — read this before flagging a number

Some states **do not operate** a category at all. Those cells are now **blank**, marked
`N/A — NO <X> QUOTA…` in `data_status`. They are not cutoffs and never were:

| State | Category | Why |
|---|---|---|
| **Punjab** | ST | No ST quota in state counselling (0 ST rows in the official source) |
| **Haryana** | ST | No ST quota (0 ST rows across 2,213 allotments) |
| **Odisha** | OBC | State quota is GN/EW/SC/ST only — 27% OBC applies to **AIQ**, not the state pool |
| **Tamil Nadu** | EWS | TN runs its own communal reservation (BC/MBC&DNC/OC/BCM/SC/SCA/ST); never implemented EWS |
| **Himachal** | EWS | No meaningful EWS pool (single row in source) |
| **Uttarakhand** | ST | **Blanked** — one-seat pool closing past AIR 1.09M, below the qualifying gate. n=1 is not a floor |

**And some genuinely-low ST numbers are correct.** ST pools close much deeper than SC/OBC — in
Maharashtra's govt colleges ST closes at AIR 339k vs SC at 161k, from the same round and source.
Nationally ST floors run **214 (Meghalaya) → 468 (Chandigarh)**. A low ST number is usually real.

---

## Caveats worth knowing

1. **Rounds differ between states.** AIQ/Rajasthan/Haryana/MP/WB are Round 1 and Manipur is Round 2 (cutoffs look *stricter*); Telangana is mop-up (looks *looser*). Comparing states directly is only fair once you account for this — that's what the `source_round` column is for.
2. **Every 2026 number is an estimate.** 2026 counselling hasn't happened. These are 2025 actuals carried forward using measured exam-difficulty and seat-growth adjustments.
3. **Thin states are less reliable.** Uttarakhand, Himachal and Jammu & Kashmir have few colleges and sparse reserved-category pools — treat their SC/ST/EWS numbers with more caution. The NE states and small UTs are thinner still (see their table above).
4. **Two states have OBC closing slightly tighter than Gen** — Himachal (OBC 493 vs Gen 491) and Chhattisgarh (481 vs 475). This is **real**, not a bug: it comes from the same round of the same source, and reflects OBC seats being scarcer than Gen seats at the loosest govt colleges. Left as the data says.
5. **A blank is not a zero.** Eight states/UTs carry empty cutoff cells with the reason in `data_status`. Treat those students as AIQ-only.
6. **Direction of error is deliberate.** Where we had to choose, we chose the *conservative* (harder) bar — median-of-5-loosest rather than the single deepest seat, R1 data where later rounds weren't available. A back-test against 73 real Avanti 2025 students showed a median gap of **+20 marks**, i.e. we under-predict who gets in. That's the safer side to be wrong on.
