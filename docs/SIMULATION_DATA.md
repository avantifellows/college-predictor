# Data for the counselling simulator

For the choice-filling / freeze-float simulator. Two files, both already in this
repo, plus the caveats that matter for the critique feature.

**The predictor is untouched.** It keeps showing a single round with no round
selector. This is additional data, not a change to what students see today.

---

## 1. `public/data/JEE/josaa_2025_all_rounds.json` — all six rounds

72,183 rows: every (institute × program × quota × seat type × gender) seat in
each of JoSAA 2025's six rounds. 1.99 MB (0.57 MB gzipped).

Rebuild with `python3 scripts/build_josaa_all_rounds.py`.

### It is integer-coded — dereference before use

Written as lookup arrays plus integer rows, because the naive shape (one object
per row, full strings) is **19.6 MB**: a 66-character institute name and a
66-character program name would be repeated 72,183 times between them. This is
2.0 MB for the same data.

```js
const d = await (await fetch('/data/JEE/josaa_2025_all_rounds.json')).json();

const rows = d.rows.map((r) => ({
  institute:    d.institutes[r[0]],
  program:      d.programs[r[1]],
  quota:        d.quotas[r[2]],
  seat_type:    d.seat_types[r[3]],
  gender:       d.genders[r[4]],
  round:        r[5],
  opening_rank: r[6],
  closing_rank: r[7],
}));
```

`d.columns` states that field order. `d.institutes` has 128 entries,
`d.programs` 253.

### Cutoffs loosen across rounds — the simulator's core mechanic

Measured on the 11,942 seats present in all six rounds:

| | |
|---|---|
| Loosen monotonically R1 → R6 | **99%** |
| R6 at least as loose as R1 | **100%** |
| Median loosening R1 → R6 | **399 ranks** |
| Seats moving more than 1,000 ranks | **4,226 (35%)** |
| p90 / p99 loosening | 5,997 / 34,729 ranks |

So "hold your seat and you may upgrade later" is genuinely modelable, and about a
third of seats have real headroom.

Two things to expect:

- **The very top does not move.** IIT Bombay CSE (AI/OPEN/Gender-Neutral) is 66 in
  all six rounds — it is the hardest seat in the country. Movement lives in the
  tail, which is where most students are. IIT Tirupati CSE goes
  4620 → 4620 → 4648 → 4648 → 4855 → 5034.
- **A seat can vanish between rounds.** R1 has 12,274 rows and R6 has 11,944; not
  every seat appears in every round. Do not assume a seat exists in round *n+1*
  because it existed in round *n*.

### Preparatory ranks

`d.preparatory_row_indexes` lists 769 rows whose rank carries a `P` suffix — a
**separate rank space** for preparatory-course candidates, not comparable with
main-list ranks. Exclude them from any rank comparison. The digits are preserved
so they are usable if you specifically want them.

Also note ranks are **integers here but strings in the source CSVs**. Sorting the
raw strings puts `33833` before `4162`; that is already handled.

### Rank spaces differ by institute

IIT ranks are **JEE Advanced**; NIT / IIIT / GFTI ranks are **JEE Main**. A
student holds one or the other, so never compare an IIT closing rank against an
NIT one, and make the simulator ask which exam the rank comes from.

### Quotas are not uniform

`AI` (all-India) covers IITs. NITs and GFTIs use `HS` (home state) and `OS`
(other state) instead and have **no `AI` rows at all** — 34 of 128 institutes are
in that position. `GO`, `JK`, `LA` are Goa, J&K and Ladakh supernumerary quotas.
Filtering on `AI` alone silently drops every NIT.

---

## 2. `public/data/colleges/colleges.json` — for the critique feature

One row per college (128 JoSAA institutes) with the fields a critique needs:

| axis | field | coverage |
|---|---|---|
| "I want a top-ranked college" | `nirf.engineering_rank`, `nirf.rank_history` (6 years, with score) | 60 / 128 |
| "I want high salary" | `placement.median_salary`, `placement.percentage_with_outcome` | 59 / 128 |
| "I want to stay near home" | `state`, `district` | 111 / 128 |
| "was my branch a reach or a safety" | `programs.list[].indicative_closing_rank` | **128 / 128** |

Built by `scripts/build_colleges_data.py`; checked by
`scripts/audit_colleges_data.py` (~20 invariants, exits non-zero on failure).

### Caveats that will otherwise make the critique overclaim

**Salary and rank are per-college, never per-branch.** NIRF has no branch
dimension at all, so a CSE student and a Civil student at the same institute get
the same figure. `placement.is_branch_specific` is `false` to make this explicit.
So the critique can say "you wanted a high-earning college and got one", not
"your branch earns well".

**Use `percentage_with_outcome`, not `percentage_placed`.** NIRF's
`percentage_placed` counts **jobs only**, so a graduate who went to an MS or PhD
counts as not placed. That understates research-heavy institutes badly — IIT
Bombay reads 73.8% where 100% of its graduates had an outcome, IIT Tirupati 55.6%
vs 90.7%. Median understatement across the 59 colleges is 10 points, up to 35 at
the tail. `percentage_with_outcome` = (placed + higher studies) / cohort, and
NIRF's own figure is preserved untouched beside it.

**Rank and score can disagree, and score is the better signal.** Rank is ordinal
— it moves when *other* colleges move. IIT Ropar's NIRF score rose 55.95 → 59.66
since 2020 while its rank fell #25 → #32: it improved, the field improved faster.
`rank_history` carries both.

**Coverage is uneven, so plan the empty path.** Fewer than half of colleges have a
rank or salary. A critique that assumes those fields exist will fail on most
colleges. NAAC is worse and structurally so: IITs, NITs and IIITs are statutorily
exempt from NAAC accreditation, so `naac.not_applicable_reason` is set rather than
the grade being merely missing.

**32 colleges have `aishe_code: null`** — the identity crosswalk has not matched
them yet (mostly IIITs and off-campuses). They carry a provisional
`josaa:<slug>` `college_id` that will become the AISHE code once matched, so do
not persist slug ids as durable keys.

---

## Rebuilding either file

```bash
# all-rounds cutoffs (needs external_data_sources/josaa/raw/2025_R{1..6}.csv)
python3 scripts/build_josaa_all_rounds.py

# college enrichment (needs BigQuery access)
python3 scripts/build_colleges_data.py
python3 scripts/audit_colleges_data.py
```

The raw JoSAA CSVs come from JoSAA's own archive
(`openingclosingrankarchieve.aspx`) and are the same data behind
`josaa_fact_cutoffs` in BigQuery. They are also mirrored to
`gs://avantifellows-external-data/josaa/raw/`.
