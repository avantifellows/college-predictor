/**
 * MHT-CET mock-allotment simulator.
 *
 * Unlike JoSAA (utils/josaaSimulator.js), this does NOT play round by round —
 * per product decision, one "final round" outcome is enough for a practice
 * mock. So there's no freeze/float/slide trail here, just: build the list of
 * choices reachable for this profile, then find the first (most-preferred)
 * one the student's rank actually clears.
 *
 * Data source: MHT-CET's raw file (public/data/MHTCET/mhtcet_data.json) is
 * 23 MB and is never sent to the browser — the live predictor filters it
 * SERVER-SIDE via pages/api/exam-result.js, using mhtCetConfig's field
 * definitions and eligibility rules (TFWS, the female horizontal
 * reservation, home-university seat logic, PWD/Defense — see examConfig.js).
 * This module reuses that same endpoint instead of duplicating those rules
 * or shipping a new dataset: a query with every profile field EXCEPT rank
 * returns the full multi-round catalog for that profile (mhtCetConfig's rank
 * filter passes every row when `rank` is absent), already filtered down from
 * 23 MB to a few hundred/thousand rows.
 *
 * WHICH ROUND we read is a deliberate choice, measured against the data
 * rather than assumed. CAP publishes R1-R4, but a seat rarely appears in
 * all of them: coverage is R1 52%, R2 73%, R3 29%, R4 41% (Open/GN
 * engineering, 2,154 seats), and only 17% of seats have both an R1 and an
 * R4 row.
 *
 * The intuition from JoSAA — later round = looser cutoff, because toppers
 * leave — does NOT hold here. Where both rounds exist, R4 is TIGHTER than
 * R1 for 296 of 384 seats, median -29%; the same holds across categories
 * and for Pharmacy. MHT-CET's later rounds are largely a different, smaller
 * pool (vacancies and institute-level rounds), not a looser pass over the
 * same seats.
 *
 * So we read each seat's EARLIEST round, normally R1: it is the round every
 * student actually fills choices for, it has the cleanest coverage, and it
 * answers the question the mock is asked ("with this rank and this list,
 * what do I get?"). Reading the last round instead made the mock quietly
 * PESSIMISTIC — telling a student they would miss a seat they would in fact
 * have been allotted in round 1.
 */

const EXAM_NAME = "MHT CET";

export const pairKey = (institute, program) => `${institute}|${program}`;

const roundNumber = (roundLabel) => {
  const n = parseInt(String(roundLabel || "").replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};

/** Fetch this profile's full (all-rounds) catalog from the existing
 * predictor API and collapse it to one entry per Institute+Program pair —
 * the row from that pair's own EARLIEST available round (see the note at
 * the top of this file for why earliest, not latest). Returns a flat array,
 * sorted alphabetically like JoSAA's buildCatalog (not by cutoff — a mock is
 * supposed to make students search and judge for themselves). Each entry:
 * `{ institute, program, closingRank, round }`. */
export async function loadMhtcetCatalog(profile) {
  const params = new URLSearchParams({
    exam: EXAM_NAME,
    stream: profile.stream,
    category: profile.category,
    gender: profile.gender,
    homeState: profile.homeState,
    isPWD: profile.isPWD,
    isDefenseWard: profile.isDefenseWard,
  });

  const res = await fetch(`/api/exam-result?${params.toString()}`);
  if (!res.ok) {
    let message = "Could not load MHT CET data.";
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // response wasn't JSON — keep the default message
    }
    throw new Error(message);
  }

  const rows = await res.json();
  if (!Array.isArray(rows)) {
    throw new Error("Unexpected MHT CET data format.");
  }

  const byPair = new Map();
  for (const row of rows) {
    const institute = row.Institute;
    const program = row["Academic Program Name"];
    if (!institute || !program) continue;

    const key = pairKey(institute, program);
    const round = roundNumber(row.Round);
    const existing = byPair.get(key);
    // keep the EARLIEST round on record for this seat (round 0 means the
    // source had no parseable round, so a real round always wins over it)
    if (existing && (existing.round || Infinity) <= (round || Infinity)) {
      continue;
    }

    const closingRank = parseInt(row["Closing Rank"], 10);
    byPair.set(key, {
      institute,
      program,
      closingRank: Number.isFinite(closingRank) ? closingRank : null,
      round,
    });
  }

  return Array.from(byPair.values()).sort(
    (a, b) =>
      a.institute.localeCompare(b.institute) ||
      a.program.localeCompare(b.program)
  );
}

/** The student's ordered choices ARE catalog entries (added straight from
 * the browsable catalog, same as JoSAA's choices), so each already carries
 * its own round-1 `closingRank` — no second lookup needed. Returns the
 * first (most-preferred) choice the rank clears, or null if none are
 * reachable. */
export function getAllotmentResult(choices, rank) {
  if (!Number.isFinite(rank) || rank <= 0) return null;
  for (let index = 0; index < choices.length; index += 1) {
    const choice = choices[index];
    if (choice.closingRank != null && choice.closingRank >= rank) {
      return { index, choice, closingRank: choice.closingRank };
    }
  }
  return null;
}
