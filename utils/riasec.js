// Career Quiz matching: a port of Amogh's riasec_match_logic.py (the
// "Quiz-to-Career Matching" spec). The student's picks are tallied per
// RIASEC letter, turned into a 0-100 profile, and every career is scored by
// cosine similarity with its own RIASEC scores (careers.json `riasec`).

export const RIASEC = ["R", "I", "A", "S", "E", "C"];

export const RIASEC_TYPES = {
  R: {
    name: "Realistic",
    theme: "Hands-on work with tools, machines and the physical world",
  },
  I: {
    name: "Investigative",
    theme: "Research, analysis and figuring things out",
  },
  A: {
    name: "Artistic",
    theme: "Creating, self-expression and original ideas",
  },
  S: { name: "Social", theme: "Helping, teaching and working with people" },
  E: { name: "Enterprising", theme: "Leading, persuading and business" },
  C: { name: "Conventional", theme: "Organising, detail and structured work" },
};

// answers: { [questionId]: letter }. Skipped questions are simply absent,
// so a partly answered quiz still gives a comparable profile.
export const tallyOf = (answers) => {
  const tally = Object.fromEntries(RIASEC.map((k) => [k, 0]));
  Object.values(answers).forEach((letter) => {
    if (letter in tally) tally[letter] += 1;
  });
  return tally;
};

export const tallyToProfile = (tally) => {
  const total = RIASEC.reduce((s, k) => s + (tally[k] || 0), 0);
  return Object.fromEntries(
    RIASEC.map((k) => [
      k,
      total ? Math.round(((tally[k] || 0) / total) * 1000) / 10 : 0,
    ])
  );
};

const cosine = (a, b) => {
  let dot = 0;
  let na = 0;
  let nb = 0;
  RIASEC.forEach((k, i) => {
    dot += a[k] * b[i];
    na += a[k] ** 2;
    nb += b[i] ** 2;
  });
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
};

// the student's top letters, Holland-style ("ICS")
export const topCode = (profile, n = 3) =>
  [...RIASEC]
    .sort((x, y) => profile[y] - profile[x])
    .slice(0, n)
    .join("");

// the two letters where student and career agree most strongly
const sharedPair = (profile, scores) =>
  RIASEC.map((k, i) => [k, profile[k] * scores[i]])
    .sort((x, y) => y[1] - x[1])
    .slice(0, 2)
    .map(([k]) => k);

// A profile with nothing standing out: every letter within a few points of
// an even split. Such students get lower scores everywhere, so the results
// say their interests are broad rather than claim a confident top match.
export const isFlat = (profile) => {
  const vals = RIASEC.map((k) => profile[k]);
  return Math.max(...vals) - Math.min(...vals) <= 10;
};

// top n careers, best first, each with its similarity and reason
export const recommendCareers = (answers, careers, n = 10) => {
  const profile = tallyToProfile(tallyOf(answers));
  const scored = careers
    .filter((c) => c.riasec?.scores)
    .map((c) => {
      const pair = sharedPair(profile, c.riasec.scores);
      return {
        career: c,
        similarity: cosine(profile, c.riasec.scores),
        shared: pair,
        reason: `Strong match on ${RIASEC_TYPES[pair[0]].name} and ${
          RIASEC_TYPES[pair[1]].name
        }`,
      };
    })
    .sort((x, y) => y.similarity - x.similarity);
  return { profile, code: topCode(profile), matches: scored.slice(0, n) };
};

// Near-ties (within 0.01 of the group's first) form one group, shown as
// equally good fits rather than a strict ranking the data doesn't support.
export const groupNearTies = (matches, gap = 0.01) => {
  const groups = [];
  matches.forEach((m) => {
    const g = groups[groups.length - 1];
    if (g && g[0].similarity - m.similarity <= gap) g.push(m);
    else groups.push([m]);
  });
  return groups;
};
