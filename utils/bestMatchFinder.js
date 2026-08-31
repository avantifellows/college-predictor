/**
 * "Find Your Best Match" — a standalone discovery search over the Mock
 * Allotment's data (same colleges.json + JoSAA all-rounds file), independent
 * of any particular simulated run. A student answers three questions
 * (branches, location, fees) and gets back reachable institute+program
 * combos ranked by a closing-rank/NIRF/CTC composite score.
 *
 * "Reachable" here means the LAST round's (loosest) closing rank covers the
 * student's rank — this is a discovery tool, not a round-by-round trail, so
 * it checks "could I ever get in" rather than "would I get in this round".
 */

import {
  studentRankForInstitute,
  findSeatForChoice,
  examSpaceFor,
  parseProgramName,
  annualFeeForCategory,
  TOTAL_ROUNDS,
} from "./josaaSimulator";

// The raw data has 229 distinct branch NAME STRINGS (dozens of near-
// duplicates like "Metallurgical Engineering" / "Metallurgy and Materials
// Engineering", plus dual-degree and minor/specialization variants) — far
// too many for a usable checklist. Classified here into ~16 broad families
// by keyword instead, in priority order (first match wins) so a compound
// name like "Electrical and Electronics Engineering" lands in one place.
export const BRANCH_GROUPS = [
  { key: "cse", label: "Computer Science, IT & AI/Data", test: /computer|software|information technology|\bit\b|artificial intelligen|\bai\b|data scien|data analytic|data engineer|cyber|machine learning|\bml\b|robotics|business informatics/i },
  { key: "ece", label: "Electronics & Communication", test: /electronics|communication engineering|telecommunication|vlsi|microelectronics|integrated circuit/i },
  { key: "eee", label: "Electrical Engineering", test: /electrical/i },
  { key: "mech", label: "Mechanical, Industrial & Production", test: /mechanical|mechatronics|manufacturing|industrial|production engineering|automation/i },
  { key: "civil", label: "Civil & Environmental Engineering", test: /civil|construction|environmental/i },
  { key: "chem", label: "Chemical & Petroleum Engineering", test: /chemical engineer|chemical technology|petroleum|polymer/i },
  { key: "aero", label: "Aerospace & Aeronautical Engineering", test: /aerospace|aeronautical|space science|space engineer/i },
  { key: "metallurgy", label: "Metallurgical & Materials Engineering", test: /metallurg|materials scien|materials engineer/i },
  { key: "biotech", label: "Biotechnology & Biomedical Engineering", test: /\bbio/i },
  { key: "mining", label: "Mining & Mineral Engineering", test: /mining|mineral/i },
  { key: "architecture", label: "Architecture, Planning & Design", test: /architecture|planning|\bdesign\b/i },
  { key: "maths", label: "Mathematics & Computational Sciences", test: /mathematic|computational|statistics|quantitative economics/i },
  { key: "sciences", label: "Engineering Physics & Pure Sciences", test: /physics|chemistry|chemical scien|geology|geophysics|earth science/i },
  { key: "textile", label: "Textile Engineering", test: /textile|carpet|handloom/i },
  { key: "naval", label: "Naval Architecture & Ocean Engineering", test: /naval|ocean engineer/i },
  { key: "food", label: "Food, Agricultural & Dairy Engineering", test: /food|agricultur|dairy/i },
  { key: "other", label: "Other / Interdisciplinary Programs", test: /.*/ }, // catch-all, must stay last
];

/** Which BRANCH_GROUPS key a branch name falls under — first regex match
 * wins, so BRANCH_GROUPS' order matters (see the "other" catch-all above). */
export function classifyBranch(branchName) {
  const name = branchName || "";
  return (BRANCH_GROUPS.find((g) => g.test.test(name)) || BRANCH_GROUPS.at(-1)).key;
}

/** Every state actually represented in the catalog (not the generic all-
 * India list examConfig.statesList uses for "where do you live") — picking
 * a state with zero JoSAA colleges in it would be a pointless filter. */
export function getAvailableStates(catalog, collegesByName) {
  const states = new Set();
  for (const item of catalog) {
    const state = collegesByName.get(item.institute)?.state;
    if (state) states.add(state);
  }
  return Array.from(states).sort();
}

// Same "answer it directly instead of guessing from category" idea as the
// Mock Allotment's Fees tab (see components/MockAllotment.js's
// effectiveFeeItem) — "unsure" falls back to the SC/ST/EWS/PwD category
// assumption, "yes"/"no" overrides it with what the student actually said.
function effectiveFee(college, category, waiverAnswer) {
  const fees = college?.fees;
  if (!fees) return { amount: null, waived: false };
  if (waiverAnswer === "unsure") {
    const r = annualFeeForCategory(college, category);
    return { amount: r?.amount ?? null, waived: r?.waived ?? false };
  }
  const amount =
    waiverAnswer === "yes" ? (fees.annual_fee_waived ?? fees.annual_fee) : fees.annual_fee;
  const waived = waiverAnswer === "yes" && fees.annual_fee_waived != null;
  return { amount: amount ?? null, waived };
}

/**
 * Filters the full catalog down to what's reachable AND matches the
 * student's answers. `branchGroupKeys` empty means "no branch filter" (all
 * groups); `stateFilter` is "all" or a Set of state names; `feeBudget` null
 * means no cap. A candidate with no fee data on record is never excluded by
 * the budget (we don't punish missing data, same policy as the Fees tab).
 */
export function findBestMatches({
  catalog,
  seatIndex,
  collegesByName,
  profile,
  branchGroupKeys,
  stateFilter,
  feeWaiverAnswer,
  feeBudget,
}) {
  const results = [];

  for (const item of catalog) {
    const rank = studentRankForInstitute(profile, item.institute, collegesByName);
    if (rank == null) continue;

    const seat = findSeatForChoice(
      item.institute,
      item.program,
      TOTAL_ROUNDS,
      seatIndex,
      profile,
      collegesByName,
      rank
    );
    if (!seat || seat.closing < rank) continue;

    const college = collegesByName.get(item.institute);
    const state = college?.state ?? null;
    if (stateFilter !== "all" && !stateFilter.has(state)) continue;

    const branch = parseProgramName(item.program)?.branch ?? item.program;
    const branchGroup = classifyBranch(branch);
    if (branchGroupKeys.size > 0 && !branchGroupKeys.has(branchGroup)) continue;

    const fee = effectiveFee(college, profile.category, feeWaiverAnswer);
    if (feeBudget != null && fee.amount != null && fee.amount > feeBudget) continue;

    results.push({
      institute: item.institute,
      program: item.program,
      branch,
      branchGroup,
      state,
      closingRank: seat.closing,
      nirfRank: college?.nirf?.engineering_rank ?? null,
      medianSalary: college?.placement?.median_salary ?? null,
      annualFee: fee.amount,
      feeWaived: fee.waived,
      exam: examSpaceFor(item.institute, collegesByName),
    });
  }

  return results;
}

// Closing rank dominates the composite (see MATCH_SCORE_WEIGHTS below) —
// same call the tutorial (avanti-student-tutorial.html) itself makes: its
// reach/match/safety tagging runs on closing rank ALONE, with salary used
// only as a secondary sort/tiebreaker among reachable options, never
// blended into one number. Closing rank is also the most complete field
// (100% coverage, vs ~half for NIRF and CTC) and the one true market-
// revealed-preference signal — it's what thousands of students' own choices
// already priced in, where NIRF is one methodology's opinion and median CTC
// is a single self-reported college-wide average. NIRF and CTC still count,
// as validators, just not as equal partners.
const MATCH_SCORE_WEIGHTS = { closingRank: 0.5, nirfRank: 0.25, medianSalary: 0.25 };

/**
 * Percentile rank (0 = worst in this set, 1 = best) for one metric across
 * `items`, keyed by array index. Percentile rank, not min-max, on purpose —
 * min-max lets a single outlier (one absurdly loose cutoff, one
 * eyebrow-raising salary figure) compress everyone else into a narrow band;
 * percentile only cares about ORDER, which is how composite indices like
 * NIRF's own methodology (and QS/THE) combine heterogeneous parameters.
 * Ties share one score (fractional ranking) rather than being split by
 * array order — essential here since NIRF rank and median CTC are
 * college-level, so every branch at one institute ties exactly.
 */
function percentileScores(items, key, higherIsBetter) {
  const present = items
    .map((item, index) => ({ index, value: item[key] }))
    .filter((x) => x.value != null)
    .sort((a, b) => a.value - b.value);

  const scores = new Map();
  if (present.length === 0) return scores;
  if (present.length === 1) {
    scores.set(present[0].index, 1);
    return scores;
  }

  let i = 0;
  while (i < present.length) {
    let j = i;
    while (j + 1 < present.length && present[j + 1].value === present[i].value) j += 1;
    const avgPosition = (i + j) / 2; // 0 (lowest value) .. length-1 (highest value)
    const percentile = avgPosition / (present.length - 1);
    for (let k = i; k <= j; k += 1) {
      scores.set(present[k].index, higherIsBetter ? percentile : 1 - percentile);
    }
    i = j + 1;
  }
  return scores;
}

/**
 * Composite 0–1 "match score" — a weighted average of percentile scores on
 * {closing rank 50%, NIRF 25%, median CTC 25%}, re-normalized over whichever
 * of the three an item actually has data for (missing NIRF/CTC redistributes
 * their weight onto what IS present, rather than padding the average with a
 * 0 or diluting it down like an equal-weight mean would).
 */
export function scoreMatches(items) {
  const closing = percentileScores(items, "closingRank", false);
  const nirf = percentileScores(items, "nirfRank", false);
  const salary = percentileScores(items, "medianSalary", true);

  return items.map((item, index) => {
    const parts = [
      closing.has(index) && { weight: MATCH_SCORE_WEIGHTS.closingRank, score: closing.get(index) },
      nirf.has(index) && { weight: MATCH_SCORE_WEIGHTS.nirfRank, score: nirf.get(index) },
      salary.has(index) && { weight: MATCH_SCORE_WEIGHTS.medianSalary, score: salary.get(index) },
    ].filter(Boolean);
    const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0);
    const matchScore =
      totalWeight > 0
        ? parts.reduce((sum, p) => sum + p.weight * p.score, 0) / totalWeight
        : 0;
    return { ...item, matchScore };
  });
}
