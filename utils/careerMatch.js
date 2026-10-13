// Career Quiz matching, v2 (riasec_quiz.xlsx "Scoring (draft)" sheet).
// The student rates 30 statements (5 per RIASEC type) from Strongly
// disagree (1) to Strongly agree (5), answers tie-breaker pairs when their
// top types are close, and picks three favourite subjects in order.
//
// 1. profile: each type's average rating, rescaled to 0-100 (the same
//    scale as every career's O*NET-derived scores)
// 2. tie-breaker picks nudge close types apart
// 3. match %: cosine similarity between the whole six-type profile and each
//    career's scores (tested best for students who answer sincerely)
// 4. favourite subjects add a bonus (SUBJECT_BONUS points per subject
//    score unit, at most +10): the list is in one order, interests first
//    with subjects pulling their careers up

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

// a type within this many points of the next is "close": tie-breakers
export const TIE_GAP = 10;
// a tie-breaker pick nudges the chosen type ahead by this much
const TIE_NUDGE = 3;
// match % is compressed (most careers land between 80 and 100), so a few
// points move a career a long way: a career on the 1st-choice subject gains
// 6, one using all three up to 10
const SUBJECT_BONUS = 2;
const RANK_WEIGHT = [3, 2, 1];
const TAG_WEIGHT = [1, 0.75, 0.5];

// ratings: { [statementId]: 1..5 }; skipped statements are simply absent
export const profileOf = (ratings, statements) => {
  const sum = {};
  const n = {};
  statements.forEach((s) => {
    const v = ratings[s.id];
    if (v == null) return;
    sum[s.type] = (sum[s.type] || 0) + v;
    n[s.type] = (n[s.type] || 0) + 1;
  });
  return Object.fromEntries(
    RIASEC.map((k) => [k, n[k] ? ((sum[k] / n[k] - 1) / 4) * 100 : 0])
  );
};

// tiePicks: { [pairId]: winning type }
export const adjustedProfile = (profile, tiePicks = {}) => {
  const out = { ...profile };
  Object.values(tiePicks).forEach((k) => {
    // not capped at 100: two types both at the top still need an order
    if (k in out) out[k] += TIE_NUDGE;
  });
  return out;
};

// nothing stands out: every type within a few points of the others. The
// results then say interests are broad rather than claim a sharp fit.
export const isFlat = (profile) => {
  const v = RIASEC.map((k) => profile[k]);
  return Math.max(...v) - Math.min(...v) <= TIE_GAP;
};

export const ordered = (profile) =>
  [...RIASEC].sort((a, b) => profile[b] - profile[a]);

// Pairs worth asking: among the top 4 types, each pair within TIE_GAP whose
// order changes the top 3 (or its order). At most `max`, closest first.
export const tiebreakersFor = (profile, pairs, max = 5) => {
  const top = ordered(profile).slice(0, 4);
  const close = [];
  for (let i = 0; i < top.length; i += 1)
    for (let j = i + 1; j < top.length; j += 1) {
      const gap = Math.abs(profile[top[i]] - profile[top[j]]);
      if (gap <= TIE_GAP) close.push([top[i], top[j], gap]);
    }
  return close
    .sort((x, y) => x[2] - y[2])
    .map(([a, b]) =>
      pairs.find(
        (p) =>
          (p.a.type === a && p.b.type === b) ||
          (p.a.type === b && p.b.type === a)
      )
    )
    .filter(Boolean)
    .slice(0, max);
};

const cosine = (a, b) => {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] ** 2;
    nb += b[i] ** 2;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
};

// subjects: picked subject names, 1st choice first; tags: the career's
// subjects, strongest first. 0 when it uses none of them.
export const subjectScore = (subjects, tags = []) =>
  subjects.reduce((sum, x, rank) => {
    const t = tags.indexOf(x);
    return t >= 0 ? sum + RANK_WEIGHT[rank] * TAG_WEIGHT[t] : sum;
  }, 0);

export const matchCareers = ({
  profile,
  subjects = [],
  careers,
  careerSubjects = {},
  n = 10,
}) => {
  const mine = RIASEC.map((k) => profile[k]);
  return careers
    .filter((c) => c.riasec?.scores)
    .map((c) => {
      const match = cosine(mine, c.riasec.scores) * 100;
      const subject = subjectScore(subjects, careerSubjects[c.name] || []);
      return { career: c, score: match + SUBJECT_BONUS * subject };
    })
    .sort((x, y) => y.score - x.score)
    .slice(0, n);
};
