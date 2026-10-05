/**
 * "Analyse & Improve Your List" for MHT-CET — the same critique as JoSAA's
 * (utils/listAnalyzer.js): tag each of the student's choices reach/match/
 * safety, score the list's overall balance, and recommend what's missing.
 *
 * Reuses `tagForRank` from utils/listAnalyzer.js (same REACH_RATIO/
 * MATCH_RATIO thresholds — no reason for MHT-CET to judge "reach" or "safety"
 * any differently). The rest is a deliberately separate, smaller module
 * rather than forcing the JoSAA version to branch for a structurally
 * different shape: MHT-CET has ONE rank space (not a JEE Main/Advanced
 * split) and no NIRF/salary/fee enrichment to sort recommendations by — its
 * catalog entries already carry a final-round `closingRank` directly (see
 * utils/mhtcetSimulator.js), so there's no seatIndex/collegesByName lookup
 * step here at all.
 */

import { tagForRank } from "./listAnalyzer";
import { pairKey } from "./mhtcetSimulator";

export function analyzeMhtcetList({ choices, catalog, rank }) {
  const evaluated = choices.map((choice) => ({
    ...choice,
    tag:
      choice.closingRank != null
        ? tagForRank(choice.closingRank, rank)
        : null,
  }));

  const nReach = evaluated.filter((c) => c.tag === "reach").length;
  const nMatch = evaluated.filter((c) => c.tag === "match").length;
  const nSafety = evaluated.filter((c) => c.tag === "safety").length;
  const tagged = nReach + nMatch + nSafety;

  // Exact rubric from utils/listAnalyzer.js (ported from
  // avanti-student-tutorial.html's resultsHTML()) — kept identical rather
  // than re-derived, since it's a fixed scoring formula, not a JoSAA-specific
  // decision.
  let balanceScore = 20;
  if (nSafety >= 1) balanceScore += 35;
  if (nMatch >= 1) balanceScore += 25;
  if (nReach >= 1) balanceScore += 10;
  if (tagged > 0 && nReach === tagged) balanceScore = 15;
  if (tagged > 0 && nSafety === tagged) balanceScore = 45;
  balanceScore = tagged > 0 ? Math.min(95, balanceScore) : 0;

  // Everything in the catalog not already on the list, tagged the same way —
  // the pool the recommendations below draw from.
  const inListKeys = new Set(
    choices.map((c) => pairKey(c.institute, c.program))
  );
  const candidates = [];
  for (const item of catalog) {
    if (item.closingRank == null) continue;
    const key = pairKey(item.institute, item.program);
    if (inListKeys.has(key)) continue;
    candidates.push({
      institute: item.institute,
      program: item.program,
      closingRank: item.closingRank,
      tag: tagForRank(item.closingRank, rank),
    });
  }
  const byClosingRankAsc = (list) =>
    [...list].sort((a, b) => a.closingRank - b.closingRank);

  const recommendations = [];

  if (evaluated.length > 0) {
    if (nSafety === 0) {
      let cands = byClosingRankAsc(
        candidates.filter((c) => c.tag === "safety")
      ).slice(0, 2);
      if (cands.length === 0) {
        // Nothing qualifies as safe: fall back to the loosest (highest
        // closing rank) options available, regardless of tag.
        cands = [...candidates]
          .sort((a, b) => b.closingRank - a.closingRank)
          .slice(0, 2);
      }
      recommendations.push({
        type: "warning",
        title: "No safety net",
        text: `Every program on your list closes at a rank ${
          nMatch ? "better than or near" : "better than"
        } yours. If the rounds don't go your way, you could end with no seat. Keep your reaches — and add a safety:`,
        candidates: cands,
      });
    } else if (nReach === 0 && nMatch === 0) {
      recommendations.push({
        type: "info",
        title: "Room to aim higher",
        text: "Every program on your list is comfortably below your expected rank. A higher choice at the top costs you nothing — consider adding one:",
        candidates: byClosingRankAsc(
          candidates.filter((c) => c.tag !== "safety")
        ).slice(0, 2),
      });
    } else {
      recommendations.push({
        type: "good",
        title: "Balanced list",
        text: `Your list combines ${
          nReach ? nReach + " reach, " : ""
        }${nMatch} match and ${nSafety} safety — aspiration on top, solid ground below.`,
        candidates: [],
      });
    }
  }

  // "Recommended for you" — whatever hasn't already been suggested above,
  // isn't a reach, sorted by closing rank.
  const shown = new Set();
  recommendations.forEach((r) =>
    r.candidates.forEach((c) => shown.add(pairKey(c.institute, c.program)))
  );
  const fits = byClosingRankAsc(
    candidates.filter(
      (c) => !shown.has(pairKey(c.institute, c.program)) && c.tag !== "reach"
    )
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
