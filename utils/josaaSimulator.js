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

const seatKey = (institute, program, quota, seatType, gender) =>
  [institute, program, quota, seatType, gender].join("");

const pairKey = (institute, program) => `${institute}${program}`;

const GENDER_NEUTRAL = "Gender-Neutral";
const FEMALE_ONLY = "Female-only (including Supernumerary)";

/** Female-only is an ADDITIONAL reserved pool on top of the neutral one, not
 * a restriction to it — a female candidate is eligible for both. A
 * Gender-Neutral profile only ever sees the neutral pool. Neutral is checked
 * first so a female candidate's seat is reported via general merit whenever
 * she qualifies there, falling back to the supernumerary pool only if not. */
const genderPoolsFor = (profileGender) =>
  profileGender === FEMALE_ONLY ? [GENDER_NEUTRAL, FEMALE_ONLY] : [profileGender];

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

/** Which quota (AI/HS/OS/JK/GO/LA) applies to this student at this institute,
 * or null if none of the quotas the institute actually offers match them. */
export function resolveQuota(institute, collegesByName, homeState) {
  const college = collegesByName.get(institute);
  const offered = college?.programs?.quotas_offered || ["AI", "HS", "OS"];
  for (const quota of offered) {
    if (matchesJosaaQuota({ Quota: quota, State: college?.state }, homeState)) {
      return quota;
    }
  }
  return null;
}

/** Look up whichever gender pool actually has a seat for this
 * institute+program at this round, respecting genderPoolsFor()'s priority
 * (neutral before female-only). Returns null if neither pool has a row here,
 * or if no quota this institute offers matches the student's home state. */
function findSeatForChoice(institute, program, round, seatIndex, profile, collegesByName) {
  const quota = resolveQuota(institute, collegesByName, profile.homeState);
  if (!quota) return null;
  const seatType = CATEGORY_TO_SEAT_TYPE[profile.category];

  for (const gender of genderPoolsFor(profile.gender)) {
    const seat = seatIndex.get(seatKey(institute, program, quota, seatType, gender));
    const roundData = seat && seat[round];
    if (roundData) {
      return { quota, gender, opening: roundData.opening, closing: roundData.closing };
    }
  }
  return null;
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
  const needsAdvanced = examSpaceFor(institute, collegesByName) === "JEE Advanced";
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

  for (const row of rows) {
    if (row.round !== 1) continue;
    if (row.seatType !== seatType) continue;
    if (!pools.includes(row.gender)) continue;

    const quota = resolveQuota(row.institute, collegesByName, profile.homeState);
    if (!quota || quota !== row.quota) continue;

    const key = pairKey(row.institute, row.program);
    const existing = byPair.get(key);
    // A female candidate can have both a Gender-Neutral AND a Female-only row
    // for the same institute+program — show the neutral one (the pool she'd
    // actually be evaluated under first), falling back to Female-only only
    // when that's the only pool with a Round 1 row here.
    if (!existing || pools.indexOf(row.gender) < pools.indexOf(existing.gender)) {
      byPair.set(key, {
        institute: row.institute,
        program: row.program,
        quota,
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
    (a, b) => a.institute.localeCompare(b.institute) || a.program.localeCompare(b.program)
  );
  return catalog;
}

/** Parse "Computer Science and Engineering (4 Years, Bachelor of Technology)"
 * into {branch, years, degree} so it can be matched against a college's
 * programs.list entries (which carry the same fields separately). Returns
 * null if the program string doesn't follow the expected shape. */
function parseProgramName(programName) {
  const match = /^(.*)\s\((\d+)\s*Years?,\s*(.*)\)$/.exec(programName || "");
  if (!match) return null;
  return { branch: match[1].trim(), years: Number(match[2]), degree: match[3].trim() };
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

    const seat = findSeatForChoice(choice.institute, choice.program, round, seatIndex, profile, collegesByName);
    if (!seat) continue; // no quota this institute offers matches them, or no row this round in either gender pool

    const rank = studentRankForInstitute(profile, choice.institute, collegesByName);
    if (rank == null) continue; // student lacks the rank this institute needs

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

  const best = bestEligibleAtRound(choices, round, seatIndex, profile, collegesByName, filterFn);
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
 * examSpaceFor). NIRF rank and salary don't have that problem, so those tabs
 * can sort the full mixed list directly.
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
  const results = [];

  for (const item of catalog) {
    const key = pairKey(item.institute, item.program);
    if (key === excludeKey) continue;

    const seat = findSeatForChoice(item.institute, item.program, round, seatIndex, profile, collegesByName);
    if (!seat) continue;

    const rank = studentRankForInstitute(profile, item.institute, collegesByName);
    if (rank == null || seat.closing < rank) continue;

    const college = collegesByName.get(item.institute);
    results.push({
      institute: item.institute,
      program: item.program,
      closingRank: seat.closing,
      nirfRank: college?.nirf?.engineering_rank ?? null,
      medianSalary: college?.placement?.median_salary ?? null,
      exam: examSpaceFor(item.institute, collegesByName),
      listPosition: listPositionByPair.get(key) ?? null,
    });
  }

  return results;
}

export { TOTAL_ROUNDS };
