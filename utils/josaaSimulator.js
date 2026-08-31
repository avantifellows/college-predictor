/**
 * JoSAA mock-allotment simulator.
 *
 * Data sources (see docs/SIMULATION_DATA.md for the full write-up):
 *  - public/data/JEE/josaa_2025_all_rounds.json — every seat x all 6 rounds,
 *    integer-coded (lookup arrays + index rows) to keep the file small.
 *  - public/data/colleges/colleges.json — one row per institute, used for
 *    (a) which rank space an institute uses (JEE Main vs JEE Advanced),
 *    (b) which quotas it actually offers, and (c) the NIRF/salary critique.
 *
 * This module is pure data/logic (no React) so it can be unit-tested and
 * reused outside pages/mock-allotment.js.
 */

import { matchesJosaaQuota } from "../examConfig";

const ALL_ROUNDS_URL = "/data/JEE/josaa_2025_all_rounds.json";
const COLLEGES_URL = "/data/colleges/colleges.json";
const TOTAL_ROUNDS = 6;

// category value (as used by examConfig.js's josaaConfig) -> Seat Type label
// used in the JoSAA data files.
export const CATEGORY_TO_SEAT_TYPE = {
  open: "OPEN",
  open_pwd: "OPEN (PwD)",
  obc_ncl: "OBC-NCL",
  obc_ncl_pwd: "OBC-NCL (PwD)",
  sc: "SC",
  sc_pwd: "SC (PwD)",
  st: "ST",
  st_pwd: "ST (PwD)",
  ews: "EWS",
  ews_pwd: "EWS (PwD)",
};

// Categories that get the full tuition-fee waiver (colleges.json's
// fees.annual_fee_waived) at IITs/NITs: SC, ST, EWS, and any PwD variant.
// OBC-NCL and General/Open (non-PwD) don't get an automatic waiver, so they
// pay fees.annual_fee, the standard rate.
const WAIVED_FEE_CATEGORIES = new Set([
  "sc",
  "sc_pwd",
  "st",
  "st_pwd",
  "ews",
  "ews_pwd",
  "open_pwd",
  "obc_ncl_pwd",
]);

/** Which annual tuition figure applies to this student's category at this
 * college — the waived rate for SC/ST/EWS/PwD, the standard rate otherwise.
 * Falls back to the standard rate (and reports `waived: false`) when the
 * college has no annual_fee_waived on record, even for a qualifying
 * category — `waived` reflects which figure was actually used, not just
 * category eligibility, so the UI never mislabels the standard fee as
 * waived. Returns null if the college has no fees data on record at all. */
export function annualFeeForCategory(college, category) {
  const fees = college?.fees;
  if (!fees) return null;
  const qualifiesForWaiver = WAIVED_FEE_CATEGORIES.has(category);
  const waived = qualifiesForWaiver && fees.annual_fee_waived != null;
  const amount = waived ? fees.annual_fee_waived : fees.annual_fee;
  return amount == null ? null : { amount, waived };
}

const seatKey = (institute, program, quota, seatType, gender) =>
  [institute, program, quota, seatType, gender].join("");

const pairKey = (institute, program) => `${institute}${program}`;

const GENDER_NEUTRAL = "Gender-Neutral";
export const FEMALE_ONLY = "Female-only (including Supernumerary)";

/** Female-only is an ADDITIONAL reserved pool on top of the neutral one, not
 * a restriction to it — a female candidate is eligible for both. A
 * Gender-Neutral profile only ever sees the neutral pool. Neutral is checked
 * first so a female candidate's seat is reported via general merit whenever
 * she qualifies there, falling back to the supernumerary pool only if not. */
const genderPoolsFor = (profileGender) =>
  profileGender === FEMALE_ONLY
    ? [GENDER_NEUTRAL, FEMALE_ONLY]
    : [profileGender];

let allRoundsPromise = null;
let collegesPromise = null;

/**
 * Fetch + decode the integer-coded all-rounds file into plain row objects.
 * Preparatory ("P"-suffixed rank) rows are dropped here: they're a separate
 * rank space and are never comparable to a main-list rank (see
 * docs/SIMULATION_DATA.md). Cached in-module so repeated calls (e.g. moving
 * between wizard steps) don't re-fetch/re-decode the 2MB file.
 */
export async function loadAllRoundsData() {
  if (!allRoundsPromise) {
    allRoundsPromise = fetch(ALL_ROUNDS_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load JoSAA round data.");
        return res.json();
      })
      .then((raw) => {
        const prepIndexes = new Set(raw.preparatory_row_indexes || []);
        const rows = [];
        raw.rows.forEach((r, idx) => {
          if (prepIndexes.has(idx)) return;
          rows.push({
            institute: raw.institutes[r[0]],
            program: raw.programs[r[1]],
            quota: raw.quotas[r[2]],
            seatType: raw.seat_types[r[3]],
            gender: raw.genders[r[4]],
            round: r[5],
            openingRank: r[6],
            closingRank: r[7],
          });
        });
        return rows;
      });
  }
  return allRoundsPromise;
}

/** Fetch + index colleges.json by display_name (the join key against the
 * institute strings in the all-rounds file — verified 1:1 for all 128). */
export async function loadCollegesData() {
  if (!collegesPromise) {
    collegesPromise = fetch(COLLEGES_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load college data.");
        return res.json();
      })
      .then((list) => new Map(list.map((c) => [c.display_name, c])));
  }
  return collegesPromise;
}

/** Group decoded rows into a seat -> {round: {opening, closing}} index. */
export function buildSeatIndex(rows) {
  const index = new Map();
  for (const row of rows) {
    const key = seatKey(
      row.institute,
      row.program,
      row.quota,
      row.seatType,
      row.gender
    );
    let byRound = index.get(key);
    if (!byRound) {
      byRound = {};
      index.set(key, byRound);
    }
    byRound[row.round] = {
      opening: row.openingRank,
      closing: row.closingRank,
    };
  }
  return index;
}

/** EVERY quota (AI/HS/OS/JK/GO/LA) that applies to this student at this
 * institute — not just the first. Seven institutes (BIT Mesra/Patna/Deoghar,
 * Assam University, ICT-IOC Bhubaneswar, IUST Kashmir, Puducherry Tech) offer
 * BOTH AI and HS pools, and real JoSAA considers a candidate under all pools
 * they're eligible for; picking just the first match (always AI, since AI
 * matches everyone) silently hid those institutes' home-state pools. */
export function resolveQuotas(institute, collegesByName, homeState) {
  const college = collegesByName.get(institute);
  const offered = college?.programs?.quotas_offered || ["AI", "HS", "OS"];
  return offered.filter((quota) =>
    matchesJosaaQuota({ Quota: quota, State: college?.state }, homeState)
  );
}

/** The seat this student is evaluated against for one institute+program at
 * one round, across EVERY applicable (quota x gender) pool — JoSAA considers
 * a candidate in all pools they're eligible for, so eligibility is "any pool
 * admits", not "the first pool with a row admits".
 *
 * Selection, when `rank` is known: among pools that ADMIT (closing >= rank),
 * prefer Gender-Neutral over Female-only (a female candidate's seat is
 * reported via general merit whenever she qualifies there), then the loosest
 * closing. When no pool admits (or rank is unknown), the loosest pool is
 * returned so callers' own closing-vs-rank check fails uniformly.
 * Returns null only when no pool has a row this round at all. */
export function findSeatForChoice(
  institute,
  program,
  round,
  seatIndex,
  profile,
  collegesByName,
  rank = null
) {
  const quotas = resolveQuotas(institute, collegesByName, profile.homeState);
  if (quotas.length === 0) return null;
  const seatType = CATEGORY_TO_SEAT_TYPE[profile.category];

  const pools = genderPoolsFor(profile.gender);
  const candidates = [];
  for (const gender of pools) {
    for (const quota of quotas) {
      const seat = seatIndex.get(
        seatKey(institute, program, quota, seatType, gender)
      );
      const roundData = seat && seat[round];
      if (roundData) {
        candidates.push({
          quota,
          gender,
          opening: roundData.opening,
          closing: roundData.closing,
        });
      }
    }
  }
  if (candidates.length === 0) return null;

  const pick = (list) =>
    list.reduce((best, c) => {
      if (!best) return c;
      const genderCmp = pools.indexOf(c.gender) - pools.indexOf(best.gender);
      if (genderCmp !== 0) return genderCmp < 0 ? c : best;
      return c.closing > best.closing ? c : best;
    }, null);

  const admitting =
    rank != null ? candidates.filter((c) => c.closing >= rank) : [];
  return pick(admitting.length > 0 ? admitting : candidates);
}

/** Which rank space an institute is compared in — JEE Advanced for IITs, JEE
 * Main for everyone else. Two completely different candidate pools with
 * different totals, so a rank of 3,000 in one is NOT comparable to a rank of
 * 3,000 in the other — callers that display closing ranks across institutes
 * (the missed-options critique) need this to avoid mixing the two scales. */
export function examSpaceFor(institute, collegesByName) {
  const college = collegesByName.get(institute);
  return (college?.entrance_exams || []).includes("JEE Advanced")
    ? "JEE Advanced"
    : "JEE Main";
}

/** Which rank the student should be compared against for this institute.
 * Returns null if the student doesn't have the rank this institute needs
 * (e.g. didn't qualify JEE Advanced). */
export function studentRankForInstitute(profile, institute, collegesByName) {
  const needsAdvanced =
    examSpaceFor(institute, collegesByName) === "JEE Advanced";
  const raw = needsAdvanced ? profile.advRank : profile.mainRank;
  if (raw === undefined || raw === null || raw === "") return null;
  const rank = Number(raw);
  return Number.isFinite(rank) && rank > 0 ? rank : null;
}

/**
 * Build the browseable catalog of Institute+Program choices available to a
 * student's category/gender/home-state, as of Round 1 (when JoSAA choice
 * filling actually happens — a seat that only appears from Round 2 onward
 * was never a fillable choice).
 */
export function buildCatalog(rows, profile, collegesByName) {
  const seatType = CATEGORY_TO_SEAT_TYPE[profile.category];
  const pools = genderPoolsFor(profile.gender);
  const byPair = new Map();

  const quotasByInstitute = new Map();
  const quotasFor = (institute) => {
    let q = quotasByInstitute.get(institute);
    if (!q) {
      q = resolveQuotas(institute, collegesByName, profile.homeState);
      quotasByInstitute.set(institute, q);
    }
    return q;
  };

  for (const row of rows) {
    if (row.round !== 1) continue;
    if (row.seatType !== seatType) continue;
    if (!pools.includes(row.gender)) continue;
    if (!quotasFor(row.institute).includes(row.quota)) continue;

    const key = pairKey(row.institute, row.program);
    const existing = byPair.get(key);
    // One entry per institute+program. Preference among the rows that reach
    // here (multiple quotas and, for a female candidate, both gender pools):
    // Gender-Neutral over Female-only (the pool she'd be evaluated under
    // first), then the loosest closing across quotas.
    const better =
      !existing ||
      pools.indexOf(row.gender) < pools.indexOf(existing.gender) ||
      (row.gender === existing.gender &&
        row.closingRank > existing.closingRankR1);
    if (better) {
      byPair.set(key, {
        institute: row.institute,
        program: row.program,
        quota: row.quota,
        gender: row.gender,
        openingRankR1: row.openingRank,
        closingRankR1: row.closingRank,
      });
    }
  }

  const catalog = Array.from(byPair.values());
  // Alphabetical, not by cutoff — a mock is supposed to make students search
  // and judge for themselves, the way JoSAA's own choice list does. Sorting
  // hardest-to-easiest would hand them the difficulty ranking for free.
  catalog.sort(
    (a, b) =>
      a.institute.localeCompare(b.institute) ||
      a.program.localeCompare(b.program)
  );
  return catalog;
}

/** Parse "Computer Science and Engineering (4 Years, Bachelor of Technology)"
 * into {branch, years, degree} so it can be matched against a college's
 * programs.list entries (which carry the same fields separately). Returns
 * null if the program string doesn't follow the expected shape. */
export function parseProgramName(programName) {
  const match = /^(.*)\s\((\d+)\s*Years?,\s*(.*)\)$/.exec(programName || "");
  if (!match) return null;
  return {
    branch: match[1].trim(),
    years: Number(match[2]),
    degree: match[3].trim(),
  };
}

/** Look up the branch-level indicative closing rank for a program from
 * colleges.json (this is the one field with 128/128 coverage, unlike NIRF/
 * salary which are college-level and only ~half-covered). */
export function findIndicativeRank(college, programName) {
  const parsed = parseProgramName(programName);
  if (!parsed || !college?.programs?.list) return null;
  const entry = college.programs.list.find(
    (p) =>
      p.branch === parsed.branch &&
      p.years === parsed.years &&
      p.degree === parsed.degree
  );
  return entry ? entry.indicative_closing_rank : null;
}

/** For an ordered list of choices, find the best (earliest-preference)
 * choice the student is eligible for in a given round, or null if none.
 * `filterFn(choice)` can narrow which choices are even considered — used by
 * "slide" mode to restrict the search to the currently-held institute — while
 * `index` still reflects the choice's real position in the original list, so
 * preference comparisons against a previous round's result stay meaningful. */
function bestEligibleAtRound(
  choices,
  round,
  seatIndex,
  profile,
  collegesByName,
  filterFn = () => true
) {
  for (let index = 0; index < choices.length; index += 1) {
    const choice = choices[index];
    if (!filterFn(choice)) continue;

    const rank = studentRankForInstitute(
      profile,
      choice.institute,
      collegesByName
    );
    if (rank == null) continue; // student lacks the rank this institute needs

    const seat = findSeatForChoice(
      choice.institute,
      choice.program,
      round,
      seatIndex,
      profile,
      collegesByName,
      rank
    );
    if (!seat) continue; // no quota this institute offers matches them, or no row this round in any pool

    if (seat.closing >= rank) {
      return {
        index,
        choice,
        round,
        opening: seat.opening,
        closing: seat.closing,
        quota: seat.quota,
        gender: seat.gender,
      };
    }
  }
  return null;
}

/** Round 1 has no "previous seat" yet — it's just the best eligible choice,
 * same as any other exam predictor. This is where the mock's trail starts. */
export function getRoundOneResult(choices, profile, seatIndex, collegesByName) {
  return bestEligibleAtRound(choices, 1, seatIndex, profile, collegesByName);
}

/**
 * Advance from a held `previousProvisional` (or null, if nothing was held
 * yet) into `round`, under one of three real-JoSAA modes:
 *
 *  - "float": search the WHOLE preference list for anything ranked higher
 *    than what's currently held — may jump to a different institute.
 *  - "slide": search ONLY other branches at the SAME institute as the
 *    currently-held seat — you keep your college, only the branch can
 *    improve. Requires an existing `previousProvisional` to slide within.
 *  - "freeze" isn't handled here — freezing just stops calling this at all.
 *
 * Either way the result can only improve on or match `previousProvisional`,
 * never regress — matches the data (cutoffs loosen ~100% of the time R1→R6),
 * so a seat once held is never taken away, only upgraded or kept.
 */
export function advanceRound(
  choices,
  profile,
  seatIndex,
  collegesByName,
  round,
  previousProvisional,
  mode
) {
  const filterFn =
    mode === "slide" && previousProvisional
      ? (choice) => choice.institute === previousProvisional.choice.institute
      : () => true;

  const best = bestEligibleAtRound(
    choices,
    round,
    seatIndex,
    profile,
    collegesByName,
    filterFn
  );
  const provisional =
    best && (!previousProvisional || best.index < previousProvisional.index)
      ? best
      : previousProvisional || null;

  return { round, provisional, mode };
}

/**
 * At the final held round, find every reachable Institute+Program combo
 * EXCEPT the one actually allotted — the pool behind the "you may have
 * gotten a better option" critique. This deliberately does NOT exclude the
 * student's other listed choices: a choice they ranked below what they got,
 * that was also reachable, is exactly the "you had this and put it too low"
 * case, and is annotated with `listPosition` (1-based) so the UI can call
 * that out rather than presenting it as something they never considered.
 *
 * Each result also carries `exam` (JEE Main / JEE Advanced) — the caller
 * must not rank-sort IIT and non-IIT results against each other on raw
 * closing rank; the two exams' candidate pools aren't the same scale (see
 * examSpaceFor). NIRF rank, salary, and fees don't have that problem, so
 * those tabs can sort the full mixed list directly.
 *
 * NIRF/CTC/fees are also all compared against what the student actually
 * got (`nirfBetter`, `ctcBetter`, `feeSavings`) — without that, "you may
 * have gotten a better option" would happily list an institute with a
 * *worse* NIRF rank or a *higher* fee than the student's own result just
 * because it was reachable. `feeSavings` is signed (positive = cheaper than
 * what they got) rather than a boolean, so the UI can show the actual
 * rupee amount, not just a yes/no.
 *
 * `rawFeeStandard`/`rawFeeWaived` (and the `winningFeeStandard`/
 * `winningFeeWaived` pair, repeated on every result) are the two fee
 * figures straight off colleges.json, with no category-based waiver
 * assumption applied — the Fees tab lets a student directly answer "am I
 * fee-waiver eligible?" instead of trusting the SC/ST/EWS/PwD-only
 * assumption `annualFee`/`feeWaived` bake in, and needs both raw numbers
 * (for the option AND for what the student's own result would cost) to
 * recompute `feeSavings` consistently under that self-reported answer.
 */
export function findMissedBetterOptions(
  catalog,
  choices,
  winningChoice,
  round,
  seatIndex,
  profile,
  collegesByName
) {
  const excludeKey = pairKey(winningChoice.institute, winningChoice.program);
  const listPositionByPair = new Map(
    choices.map((c, i) => [pairKey(c.institute, c.program), i + 1])
  );

  // If the student's OWN college has no NIRF rank or salary on record (true
  // for ~half of institutes), treat that baseline as the worst possible
  // value rather than leaving it null — otherwise nirfBetter/ctcBetter below
  // would always resolve to null (a real value can't be "better than
  // unknown"), and the NIRF/CTC tabs would show nothing at all for any
  // student whose allotment happens to be at a non-ranked institute. NIRF
  // rank 1 is best, so worst-case is the largest int; salary's worst-case is
  // the smallest.
  const winningCollege = collegesByName.get(winningChoice.institute);
  const winningNirf =
    winningCollege?.nirf?.engineering_rank ?? Number.MAX_SAFE_INTEGER;
  const winningSalary =
    winningCollege?.placement?.median_salary ?? Number.MIN_SAFE_INTEGER;
  const winningFee = annualFeeForCategory(winningCollege, profile.category);

  const results = [];

  for (const item of catalog) {
    const key = pairKey(item.institute, item.program);
    if (key === excludeKey) continue;

    const rank = studentRankForInstitute(
      profile,
      item.institute,
      collegesByName
    );
    if (rank == null) continue;

    const seat = findSeatForChoice(
      item.institute,
      item.program,
      round,
      seatIndex,
      profile,
      collegesByName,
      rank
    );
    if (!seat || seat.closing < rank) continue;

    const college = collegesByName.get(item.institute);
    const fee = annualFeeForCategory(college, profile.category);
    const nirfRank = college?.nirf?.engineering_rank ?? null;
    const medianSalary = college?.placement?.median_salary ?? null;

    results.push({
      institute: item.institute,
      program: item.program,
      closingRank: seat.closing,
      nirfRank,
      medianSalary,
      annualFee: fee?.amount ?? null,
      feeWaived: fee?.waived ?? false,
      rawFeeStandard: college?.fees?.annual_fee ?? null,
      rawFeeWaived: college?.fees?.annual_fee_waived ?? null,
      winningFeeStandard: winningCollege?.fees?.annual_fee ?? null,
      winningFeeWaived: winningCollege?.fees?.annual_fee_waived ?? null,
      exam: examSpaceFor(item.institute, collegesByName),
      listPosition: listPositionByPair.get(key) ?? null,
      nirfBetter: nirfRank != null ? nirfRank < winningNirf : null,
      ctcBetter: medianSalary != null ? medianSalary > winningSalary : null,
      feeSavings:
        fee?.amount != null && winningFee?.amount != null
          ? winningFee.amount - fee.amount
          : null,
    });
  }

  return results;
}

export { TOTAL_ROUNDS };
