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
 * A seat can vanish between CAP rounds the same way JoSAA's docs describe
 * (docs/SIMULATION_DATA.md) — so "final round" here means, per seat, the
 * highest Round number that seat actually has a row for, not a single global
 * round number (MHT-CET's rounds don't even cover every stream evenly: e.g.
 * B.Design mostly only has R2-R4 on record).
 */

const EXAM_NAME = "MHT CET";

export const pairKey = (institute, program) => `${institute}|${program}`;

const roundNumber = (roundLabel) => {
  const n = parseInt(String(roundLabel || "").replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};

/** Fetch this profile's full (all-rounds) catalog from the existing
 * predictor API and collapse it to one entry per Institute+Program pair —
 * the row from that pair's own last available round. Returns a flat array,
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
    if (existing && existing.round >= round) continue; // keep the LATEST round on record for this seat

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
 * its own final-round `closingRank` — no second lookup needed. Returns the
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
