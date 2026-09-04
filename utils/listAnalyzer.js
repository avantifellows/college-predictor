/**
 * "Analyse & Improve Your List" — evaluates the choices a student has
 * ALREADY built in Choice Filling, rather than searching fresh ones (that's
 * Find Your Best Match, see bestMatchFinder.js).
 *
 * This is a direct port of avanti-student-tutorial.html's resultsHTML()
 * algorithm (tagOf, the balance score, and the recommendation logic) onto
 * this app's own rank + closing-rank data, keeping ONLY the parts of that
 * algorithm that run on data this app actually collects. The tutorial also
 * has "stay near home", "expected salary", and "financial situation"
 * questions that drive three more of its recommendations ("Outside your
 * state", "Below your income expectation", "Paying for it") — this app's
 * Student Info step doesn't ask any of those, so those three are left out
 * rather than approximated. The tutorial's "female-only seats work in your
 * favour" recommendation is left out too, for a different reason: unlike
 * the tutorial's static demo data (one flat closing rank per program, no
 * gender-pool modeling), this app's own closingRank already resolves the
 * better of the Gender-Neutral/Female-only pools before a tag is ever
 * computed (see findSeatForChoice in josaaSimulator.js) — so the "some
 * REACH picks may be closer than they look" caveat doesn't apply here;
 * a REACH tag already means neither pool admitted.
 *
 * "Reachable" is checked at the LAST round (loosest), same reasoning as
 * bestMatchFinder.js — this evaluates the list overall, not a specific
 * round of a specific simulated run.
 */

import {
  studentRankForInstitute,
  findSeatForChoice,
  TOTAL_ROUNDS,
} from "./josaaSimulator";

// Same ratios and thresholds as the tutorial's tagOf(): closing rank
// noticeably TIGHTER than your rank is a stretch (reach); moderately looser
// is comfortable (match); looser still is a near-certain admit (safety).
const REACH_RATIO = 0.95;
const MATCH_RATIO = 1.6;

export function tagForRank(closingRank, rank) {
  if (closingRank < rank * REACH_RATIO) return "reach";
  if (closingRank <= rank * MATCH_RATIO) return "match";
  return "safety";
}

const pairKey = (institute, program) => `${institute}|${program}`;

/** Closing rank at the final round, or null if there's no seat row for this
 * institute+program at all under the student's category/quota/gender —
 * the ONE case the tutorial's static sample data never has to represent
 * (every one of its programs always has a cut), so tag stays null only
 * here, never for a merely-tight "reach" pick. */
function closingRankAtFinalRound(institute, program, seatIndex, profile, collegesByName, rank) {
  const seat = findSeatForChoice(
    institute,
    program,
    TOTAL_ROUNDS,
    seatIndex,
    profile,
    collegesByName,
    rank
  );
  return seat ? seat.closing : null;
}

/**
 * Evaluates the student's current choice list: tags each choice reach/
 * match/safety (tutorial's tagOf, exactly), scores the list's overall
 * balance (0–95, tutorial's exact formula), and generates the subset of the
 * tutorial's recommendations that this app's collected profile can actually
 * support — sourced from `catalog` (everything eligible for this profile)
 * minus what's already on the list, same as the tutorial's `avail`.
 */
export function analyzeList({ choices, catalog, seatIndex, collegesByName, profile }) {
  const evaluated = choices.map((choice) => {
    const rank = studentRankForInstitute(profile, choice.institute, collegesByName);
    const closingRank =
      rank != null
        ? closingRankAtFinalRound(choice.institute, choice.program, seatIndex, profile, collegesByName, rank)
        : null;
    return {
      ...choice,
      rank,
      closingRank,
      tag: closingRank != null ? tagForRank(closingRank, rank) : null,
    };
  });

  const nReach = evaluated.filter((c) => c.tag === "reach").length;
  const nMatch = evaluated.filter((c) => c.tag === "match").length;
  const nSafety = evaluated.filter((c) => c.tag === "safety").length;
  const tagged = nReach + nMatch + nSafety;

  // Exact rubric from the tutorial's resultsHTML().
  let balanceScore = 20;
  if (nSafety >= 1) balanceScore += 35;
  if (nMatch >= 1) balanceScore += 25;
  if (nReach >= 1) balanceScore += 10;
  if (tagged > 0 && nReach === tagged) balanceScore = 15;
  if (tagged > 0 && nSafety === tagged) balanceScore = 45;
  balanceScore = tagged > 0 ? Math.min(95, balanceScore) : 0;

  // avail — every eligible+reachable-data program not already on the list,
  // tagged the same way as the student's own choices. Unlike the earlier
  // version of this function, a "reach" program (closing rank tighter than
  // the student's rank) is NOT excluded here — the tutorial recommends
  // reach picks too (see "Room to aim higher"); only a program with no seat
  // row at all is left out.
  const inListKeys = new Set(choices.map((c) => pairKey(c.institute, c.program)));
  const candidates = [];
  for (const item of catalog) {
    const key = pairKey(item.institute, item.program);
    if (inListKeys.has(key)) continue;
    const rank = studentRankForInstitute(profile, item.institute, collegesByName);
    if (rank == null) continue;
    const closingRank = closingRankAtFinalRound(
      item.institute,
      item.program,
      seatIndex,
      profile,
      collegesByName,
      rank
    );
    if (closingRank == null) continue;
    const college = collegesByName.get(item.institute);
    candidates.push({
      institute: item.institute,
      program: item.program,
      closingRank,
      nirfRank: college?.nirf?.engineering_rank ?? null,
      medianSalary: college?.placement?.median_salary ?? null,
      tag: tagForRank(closingRank, rank),
    });
  }
  const bySalaryDesc = (list) =>
    [...list].sort((a, b) => (b.medianSalary ?? 0) - (a.medianSalary ?? 0));

  const recommendations = [];

  if (evaluated.length > 0) {
    if (nSafety === 0) {
      let cands = bySalaryDesc(candidates.filter((c) => c.tag === "safety")).slice(0, 2);
      if (cands.length === 0) {
        // Tutorial's fallback when NOTHING qualifies as safe: the loosest
        // (highest closing rank) options available, regardless of tag.
        cands = [...candidates].sort((a, b) => b.closingRank - a.closingRank).slice(0, 2);
      }
      recommendations.push({
        type: "warning",
        title: "No safety net",
        text: `Every program on your list closes at a rank ${nMatch ? "better than or near" : "better than"} yours. If the rounds don't go your way, you could end with no seat. Keep your reaches — and add a safety that still pays well:`,
        candidates: cands,
      });
    } else if (nReach === 0 && nMatch === 0) {
      recommendations.push({
        type: "info",
        title: "Room to aim higher",
        text: "Every program on your list is comfortably below your expected rank. A higher choice at the top costs you nothing — consider adding one:",
        candidates: bySalaryDesc(candidates.filter((c) => c.tag !== "safety")).slice(0, 2),
      });
    } else {
      recommendations.push({
        type: "good",
        title: "Balanced list",
        text: `Your list combines ${nReach ? nReach + " reach, " : ""}${nMatch} match and ${nSafety} safety — aspiration on top, solid ground below.`,
        candidates: [],
      });
    }
  }

  // "Recommended for you" — the tutorial's catch-all: whatever hasn't
  // already been suggested above, isn't a reach, sorted by salary.
  const shown = new Set();
  recommendations.forEach((r) => r.candidates.forEach((c) => shown.add(pairKey(c.institute, c.program))));
  const fits = bySalaryDesc(
    candidates.filter((c) => !shown.has(pairKey(c.institute, c.program)) && c.tag !== "reach")
  );
  if (fits.length > 0) {
    recommendations.push({
      type: "good",
      title: "Recommended for you",
      text: "Looking beyond your list — these programs fit your expected rank. Worth considering:",
      candidates: fits.slice(0, 3),
    });
  }

  return { evaluated, nReach, nMatch, nSafety, balanceScore, recommendations };
}
