# How we built the NEET 2026 min-marks matrix

**What the sheet answers:** *"With X marks in NEET 2026, in category C, in state S — can I expect a
government MBBS or BDS seat?"*

This document explains how we got those numbers. It is meant to be read top to bottom once. By the
end of the methodology section you should be able to guess what we did for any given state — and the
state notes then only confirm it or flag the exception.

Companion files: `neet_2026_matrix_all.csv` (the sheet), `NEET_2026_MATRIX_DECISIONS.md` (the full
provenance log, ~10× longer), `NEET_STATE_COVERAGE.md` (one-line-per-state summary).

---

## 1. The one hard problem

**We have no 2026 cutoffs.** 2026 counselling has not happened. All the rich data is **2025**.

So every number in the sheet is built the same way:

```
2025 closing rank  →  2025 marks  →  2026 marks
   (what happened)     (converted)    (adjusted for an easier paper)
```

Three steps, three assumptions. The rest of this document is those three assumptions and what we do
when a state's data misbehaves.

---

## 2. Rank → marks: one curve, fitted on real pairs

Most states publish **closing ranks**, not marks. Students think in marks. So we need a converter.

We fitted a curve on **32,093 real (marks, rank) pairs** from 2025 — students whose marks *and* All
India Rank are both published (Telangana, MP and Punjab merit lists). It is a degree-4 polynomial in
log(rank), trustworthy between 150 and 638 marks.

**Why you can trust it:** four states publish *both* marks and rank per student, so we can check the
curve against ground truth it never saw.

| State | Check | Result |
|---|---|---|
| Tamil Nadu | their own marks column | within ±1 mark |
| Madhya Pradesh | `closing_neet` column | within ±1 mark |
| Haryana | 2,213 students, AIR 6.7k–1.1M | mean error **+0.86**, sd 2.39 |
| Tripura | 10 top-of-list pairs | ratios 0.96–1.03 |

That is as validated as this kind of thing gets. Everything downstream rests on it.

---

## 3. 2025 → 2026: a curve, not a flat number

NEET 2026 was **easier**, so the same rank is worth **more marks**. The question is how much more.

We had only **185 real 2026 (marks, rank) pairs**. Too few to fit a fresh curve, enough to anchor a
shift. What they show: the inflation is **near zero at the top and grows as you go down**. A 700-marks
student gains almost nothing; a 400-marks student gains a lot. So it is a curve.

**The rule we use:**

```
2026 marks = 2025 marks + 0.085 × (720 − 2025 marks)
```

| 2025 marks | → 2026 | gain |
|---|---|---|
| 600 | 610 | +10 |
| 530 | **546** | +16 |
| 500 | 519 | +19 |
| 420 | 446 | +26 |
| 300 | 336 | +36 |

A 530 in 2025 becomes ~546 in 2026.

We also assume seats grow slightly (**+0.8%** state, **+5.3%** AIQ) — worth 1–2 marks, not more.

---

## 4. Two different doors: 15% AIQ and 85% state quota

One more thing shapes how to read the sheet, and it is the most common source of confusion.

Every government medical seat in India is split:

- **15% All India Quota (AIQ)** — national pool, run by MCC, ranked on All India Rank. No domicile.
  Open to everyone.
- **85% State Quota** — your home state's seats, domicile required. Run by the state.

A student applies to **both**. They are separate competitions with separate cutoffs, and the sheet's
`state` column is a **track label**, not a place: the `All India` row is the AIQ door; every other row
is that state's 85% door.

**The intuition most readers arrive with — "state quota must be easier" — is usually right, but not
always.** Our 2026 General MBBS estimates, against the AIQ bar of **548**:

| | State Gen | vs AIQ 548 |
|---|---|---|
| Telangana | 444 | **−104** |
| Gujarat | 502 | −46 |
| Karnataka | 512 | −36 |
| Maharashtra | 521 | −27 |
| Uttar Pradesh | 536 | −12 |
| Jharkhand | 547 | −1 |
| **Tamil Nadu** | **551** | **+3** |
| **Bihar** | **553** | **+5** |
| **Rajasthan** | **563** | **+15** |
| **Haryana** | **566** | **+18** |
| **Kerala** | **570** | **+22** |
| **Delhi** | **591** | **+43** |

So a Telangana student's home-state door looks ~100 marks easier than the national one, while a Kerala
or Delhi student's looks *harder*. Both directions are real, but before reading any of it as a fact
about the state, check what produced the number:

**Most of Telangana's gap is the round, not the state.** Our Telangana data is **mop-up** — the final
round, after every upgrade and vacancy has cascaded down. AIQ's is **Round 1**. Comparing them is
comparing the loosest round against the strictest one. Telangana genuinely is more generous than AIQ,
but nowhere near 100 marks' worth; much of that gap would close if we had both states at the same
round.

**The states that close *above* AIQ are the more interesting ones**, because round depth cannot
explain a gap in that direction — it works *against* it. Kerala (Phase 3 final) and Delhi (R1+R3) are
both **later** rounds than AIQ's Round 1, so they had every chance to look softer, and still came out
harder. That gap is structural:

- **Delhi's** 85% pool is only **three colleges** (MAMC, UCMS, LHMC — AIIMS and VMMC are central, not
  in it). A tiny, highly-desired pool with a huge applicant base closes very high.
- **Kerala's** state pool draws an unusually strong and NEET-focused applicant base, so its own
  domicile competition runs harder than the national one for the top categories.

The general rule: **a gap in the "state is easier" direction may just be round depth; a gap in the
"state is harder" direction is usually structural** — few colleges, or a strong local applicant pool.

**Two consequences:**

1. **Never rank states against each other, or against All India, without reading `source_round`.**
   Later rounds close deeper. Our data spans R1 (strict) to mop-up (loosest), so a Round-1 state looks
   harsher than a mop-up state even when reality is identical. Telangana's 444 is partly *real* and
   partly *because it is mop-up data*.
2. **For a student, the relevant number is the lower of their two doors** — and for the five states
   with no data at all (§12), AIQ is the only door we can speak to.

---

## 5. "Government seat" needs a filter, and it is the highest-stakes decision we make

Cutoffs are only meaningful for **government** colleges. Private and deemed colleges admit far lower
scorers because they cost 10–50× more. Mixing them destroys the number.

We keep private colleges in the parsed data and exclude them at the last step. How we identify govt
varies by what the state gives us — in order of preference:

1. **The document says so.** Rajasthan literally tags `(Govt. Seat)` vs `(Mgmt. Seat)`.
2. **Fee-based.** Karnataka: govt fees are ~10× lower, unambiguous.
3. **Name-based.** "GMC", "Government", known institution names. Weakest — used only where nothing
   better exists, and cross-checked against a govt-college roster.

**What it costs when this goes wrong — the sharpest example in the project.** Tripura has two
colleges: AGMC (government) and TMC/BRAM (a *society* college). TMC's ST seats went down to **118
marks** — below the national qualifying floor. Reading "lowest admitted" without the filter gives
Tripura ST = **118**. With AGMC only: **297**. A **179-mark** error.

Two subtler versions of the same trap:

- **AIQ hiding inside a state college.** Mizoram's ZMCH register shows "General" students at 443–535
  marks with non-Mizoram names. Those are **15% All-India-Quota** seats, not Mizoram's state quota.
  Published as a Mizoram General cutoff, they would mislead every Mizoram student.
- **NRI seats.** Mizoram's register also has NRI admits from **133 marks** (fee ₹17.76 lakh vs
  ₹96,850). Excluded.

---

## 6. Which seat is the "cutoff"? Median of the five loosest colleges

A state has many govt colleges. The last student admitted **anywhere** in the state is the true
mathematical floor — but it is usually one freak seat at one remote college, and it is not a bar
anyone should plan against.

**Our rule: take the 5 loosest colleges for that category, use the median.**

Worked example — **Kerala, one category**, five loosest govt colleges by closing rank:

```
AIR 746,931   ← one outlier college, far deeper than the rest
AIR 442,141
AIR 431,111   ← median  → the number we publish
AIR 397,783
AIR 373,368
```

Using the single deepest gives a floor **87 marks lower** than the median. That one college would
have set the bar for the whole category. The median ignores it without discarding it.

Where the loosest five are tightly clustered (Maharashtra: 503/503/505/506/507) the rule changes
almost nothing — 2 marks. It only bites where it should.

**Direction of the error:** this makes cutoffs *harder* than the absolute truth. Deliberate. We would
rather tell a student "you might not make it" and be wrong, than the reverse.

---

## 7. Categories: every state invents its own

There is no national category list. Each state runs its own. We map everything onto **Gen, EWS, OBC,
SC, ST** (+ 5 PwD variants) and take the **median of the sub-groups**.

| State's own categories | We report |
|---|---|
| Andhra/Telangana: SC1, SC2, SC3 | median → **SC** |
| Andhra: BCA, BCB, BCC, BCD, BCE | median → **OBC** |
| Tamil Nadu: BC, BCM, MBC&DNC | median → **OBC** |
| Haryana: BCA, BCB | median → **OBC** |
| Kerala: Ezhava, Muslim, LC + 6 more | median → **OBC** |
| Karnataka: 1, 2A, 2B, 3A, 3B | **seat-weighted** median → OBC (2A is ~15% of seats, dominant) |

Median, not the loosest — a tiny sub-community with one seat should not define the whole category.
(This was the group decision; Venu preferred the highest sub-category, Priyanka wanted "does not
over-qualify people".)

**Three category rules worth knowing:**

- **Some states simply do not have a category at all.** Punjab has no ST quota; Tamil Nadu has no
  EWS. That is not a data gap — see §10.
- **PwD and the other horizontal sub-pools** are handled separately — see §8.

---

## 8. Sub-pools we exclude, and why

Beyond private colleges (§5), a state's allotment list mixes in competitions that are not open merit.
These are excluded from every base-category floor:

**NRI · Management · Orphan · Sports · Defence · NCC · Ex-serviceman · war-widow · Green-Card · EarMark**

Each is a separate, much shallower contest. Mizoram's NRI admits start at **133 marks** against a govt
ST floor of 335; Rajasthan's PwD/ex-serviceman/war-widow seats close near **AIR 1.1 million**. Leaving
any of them in would drag a category floor down by tens or hundreds of marks.

**PwD is the special case.** We do not compute a PwD cutoff at all — we publish the **qualifying
mark**. In nearly every state the PwD pool is small enough that it closes *below* the national
qualifying floor, which means the binding constraint is not the cutoff, it is qualifying in the first
place. Saying "you need 194" is honest; computing a PwD cutoff from three seats would not be.

---

## 9. BDS: same pipeline, no shortcuts

Every rule above runs **independently for BDS**. We do not derive BDS from MBBS — no ratio, no fixed
offset. Same source, same govt filter, same median-of-5, same conversion and shift, computed separately
on dental colleges.

That matters because a shortcut would have been tempting: BDS lands **~32 marks below MBBS** in the
median state. But the spread is 5 to 54 marks, so any single offset would be badly wrong somewhere.

| | MBBS → BDS (2025, General) |
|---|---|
| Uttar Pradesh | 519 → 514 (−5) |
| All India | 534 → 512 (−22) |
| Maharashtra | 503 → 471 (−32) |
| Kerala | 556 → 512 (−44) |
| Delhi | 579 → 525 (−54) |

**The direction to hold in your head: BDS is the fallback.** Students prefer MBBS, so dental seats fill
later and close deeper. Where a state has many govt dental colleges the gap is wide; where it has one
prestigious dental faculty the gap is narrow (UP's −5 is a single college, KGMU Lucknow).

**Two BDS-specific traps:**

- **The govt filter needs to be program-aware.** An early version excluded anything with "dental" in
  the name while matching MBBS keywords — which deleted the *government* dental colleges and left BDS
  empty. Fixed in Maharashtra, then hit again in Gujarat.
- **Private dental colleges contaminate more easily,** because there are more of them and they fill
  much lower. UP's BDS floor was **232 marks** until we found "Dental College, Azamgarh" — 98
  allotments closing at **AIR 1,305,726** — tagged as government. UP's real govt dental college is
  KGMU Lucknow, closing at ~514. The tell was that General sat 282 marks *below* OBC, which is
  impossible for a merit bar.

**9 states have MBBS numbers but no govt BDS floor at all** — Uttarakhand, Chandigarh, Puducherry and
the six NE states. Mostly because there is no government dental college in the state (Mizoram's 12 BDS
seats are all at colleges *outside* Mizoram). Those cells are blank, not zero.

---

## 10. When a number looks wrong

This is the section to read before flagging something. A surprising number is almost always one of
four things — three of them real.

**(a) The quota does not exist.** Cells are **blank**, marked `N/A` in `data_status`:

| | | verified by |
|---|---|---|
| Punjab, Haryana | no **ST** quota | 0 ST rows in the official sources |
| Odisha | no **OBC** in state quota | categories are GN/EW/SC/ST only |
| Tamil Nadu | no **EWS** | TN runs its own communal reservation |
| Himachal | no meaningful **EWS** | one row in source |

Previously these showed **177 or 213** — the qualifying floor — which read exactly like a cutoff. Same
number, opposite meaning. Now blank. *This accounted for 5 of 9 rows flagged in review.*

**(b) A private or AIQ seat leaked in.** See §5. Tripura ST 118, Mizoram General 443.

**(c) The pool is genuinely thin.** One seat is not a floor. Uttarakhand ST was a single seat closing
past **AIR 1,091,883** — below the qualifying gate. Blanked. Manipur SC had **n=1** and produced an SC
floor *tighter than Gen*, which is impossible as a bar; dropped.

**(d) It is real and just counter-intuitive.** These we keep:

- **ST closes far deeper than SC.** Maharashtra govt: ST at AIR 339k, SC at 161k — 2× gap, same round,
  same source. ST seats go unfilled at higher ranks so the floor cascades. Nationally ST runs
  **214 → 468**. A low ST number is usually correct.
- **OBC occasionally tighter than Gen.** Himachal 493 vs 491, Chhattisgarh 481 vs 475. Real — OBC
  seats are scarcer at the loosest colleges.
- **A state quota above the national one.** Happens where a state's applicant pool is unusually
  strong; the state's 85% door can be harder than the 15% national door for some categories.

**A permanent guard now enforces this:** no non-PwD cell may sit at or below the national qualifying
floor. If one does, it is a thin pool or contamination — never a real cutoff. Currently: none.

---

## 11. How well does it work?

Back-tested against **73 real Avanti students** who got MBBS seats in 2025, in states we cover:

- **52 clear (72%)** · 10 borderline (±15 marks) · 11 below our predicted floor
- Median gap: **+20 marks** — students cleared our bar by 20 more than needed

So we **under-predict admissions**. By category: General runs ~5 marks *high* (we are strictest where
we have most data); SC +33 and ST +36 (conservative). Causes: several states are R1-only, and
median-of-5 is deliberately cautious.

**This is the intended direction.** Target was "70% close, underestimation is fine."

---

## 12. State notes

**32 of 37 tracks carry numbers.** All 36 states/UTs + All India appear in the sheet; 5 are blank with
reasons. Read §1–10 and most states need no comment. These are the ones that do.

### The clean ones — nothing to explain
**Tamil Nadu** is the best data in the country: closing **marks** published directly, no conversion,
through-R3. **Madhya Pradesh, Maharashtra, Gujarat, Andhra, Telangana, Karnataka, Kerala, Punjab,
West Bengal, Bihar, UP, Chhattisgarh, Assam, Himachal, J&K** all follow §1–9 exactly: state cutoffs →
govt filter → median-of-5 → convert → shift.

### States needing a bridge
**Odisha, Kerala, J&K** publish *state* ranks, not All India Ranks. Unusable until converted. Odisha
became usable only because its merit list gave us **5,817 (state-rank, AIR) pairs** to build a bridge.

### States where we fixed someone's parser
- **Jharkhand** — the upstream parser read the wrong column (off-by-one), giving Gen 248 < SC 419.
  Re-parsed from source: 613 rows recovered.
- **Uttar Pradesh** — `[PPP]` colleges were tagged government. Excluded (Gen was coming out 321 < EWS 518).
- **Chhattisgarh** — the summary file was **stale** vs raw (one college 180k vs the real 24k). Rebuilt from raw.
- **Assam** — 150-mark candidates were sitting in UR seats. Added a score guard.
- **Bihar** — two **private** colleges (KMC Katihar, NMC Sasaram) were in the govt list. Removed.
- **Haryana** — only **2,213 of 7,595** rows are real allotments; the rest are applicants with no seat.

### Single-college UTs
**Chandigarh** — best small source we have: an admitted-student register with marks *and* rank per
student. It disproved a third-party figure of 588 (real: **514**), which is why we do not publish
unverified third-party numbers anywhere. **Delhi** — only the 3-college DU quota (AIIMS, VMMC etc. are
central); an elite pool, floors far above other states. **Puducherry** — JIPMER's UT-domicile quota;
odd-looking EWS/ST values are real sparse-pool behaviour.

### The North-East: a different system entirely
Most NE states do **not** run a normal state-college quota. They **nominate** students into seats
reserved for that state at colleges **across India** — GoI Central Pool and NEC regional seats.
Nagaland's allotment column literally reads *"GoI Central Pool"*, placing students at VMMC and MAMC
Delhi, GMC Nanded, RIMS Imphal. Meghalaya's order covers *"seats allotted to the State of Meghalaya"*
at colleges in Assam, MP, Rajasthan, Delhi.

**So an NE number is the bar to win a nomination, not a college closing rank** — still the right
number for "will this student get a seat".

- **Ladakh** — no medical college at all, yet runs its **own** Central Pool quota. *Lesson: "no
  college" does not mean "no quota."* Only 9 selected candidates.
- **Mizoram** — ~98% of seats are ST, so only ST is published. Ground truth from ZMCH's admitted
  register. (An earlier estimate of 435 from a merit list + seat count was **100 marks too high** —
  see the provenance doc.)
- **Arunachal** — the source has **one category only** (`Cat-I` = APST). No Gen/OBC/SC split exists,
  so we publish only ST rather than invent pools the state does not run.
- **Meghalaya** — Khasi & Jaintia and Garo are **Scheduled Tribes**, not OBC. Waiting-list rows
  excluded: the order nominates them only if a selected candidate fails to report.
- **Manipur** — RIMS is centrally *run* but its 85% is a genuine Manipur state quota. SAHS is private,
  excluded. SC (n=1) and ST (n=2) too thin to publish.
- **Nagaland** — rotated scan, **only ~12 of 66+ rows** recovered. Its floor **over-states** the bar.
- **Tripura** — see §5. Govt = AGMC only.

### The 5 blanks
**Sikkim** (no *government* college — SMIMS is private) and **Lakshadweep** (no college) are
permanent. **Goa, Andaman & Nicobar, Dadra & Nagar Haveli and Daman & Diu** are single-college and we
could not find an official document — only third-party figures, which we do not publish. Together
under **1% of national seats**. For all five, AIQ is the practical door.
