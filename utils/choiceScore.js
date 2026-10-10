// Choice-builder ordering (JoSAA). No weights: the student's career interest
// and where they see themselves working pick a plan, a list of groups (their
// branch at IITs in the NIRF top 30, say), and the list runs group by group,
// closing rank first within each.
//
// "IIT" is a JEE Advanced seat; "NIT" is any JEE Main seat (NITs, IIITs,
// GFTIs). NIRF bands use the overall Engineering rank, so "top 30 NITs" are
// the NITs ranked in the overall top 30. A college NIRF doesn't rank is
// outside every band.

// Branch families: the 47 parent branches JoSAA's programmes map to
// (public/data/JEE/josaa_branch_parents.json), grouped the way students
// think of them. An editorial grouping: change it here.
export const BRANCH_FAMILIES = [
  {
    id: "cs",
    label: "Computer Science and related",
    hint: "CS, IT, AI / Data Science, Maths & Computing",
    parents: ["CSIT", "AIML", "MNC", "CYBERSEC"],
  },
  {
    id: "elec",
    label: "Electrical and Electronics",
    hint: "EE, ECE, Instrumentation",
    parents: ["ELEC", "INSTRENG"],
  },
  {
    id: "mech",
    label: "Mechanical and Production",
    hint: "Mechanical, Aerospace, Production, Robotics",
    parents: [
      "MECHENG",
      "INDENG",
      "AERO",
      "SPACEENG",
      "MARINE",
      "ROBOENG",
      "ENGDES",
    ],
  },
  {
    id: "civil",
    label: "Civil, Architecture and Planning",
    hint: "Civil, Environmental, B.Arch, Planning",
    parents: ["CIVILENG", "ENVENG", "ARCH", "PLAN"],
  },
  {
    id: "chem",
    label: "Chemical and Materials",
    hint: "Chemical, Metallurgy, Ceramics, Textile, Petroleum",
    parents: [
      "CHEMENG",
      "MEMS",
      "CERAMIC",
      "TEXTILE",
      "PETROLENG",
      "ENERGYENG",
      "CHEMSCI",
      "INDCHEM",
      "PRINTENG",
      "PHARMAENG",
    ],
  },
  {
    id: "earth",
    label: "Mining and Earth Sciences",
    hint: "Mining, Geology, Geophysics",
    parents: ["MININGENG", "GEO", "EARTHSCI"],
  },
  {
    id: "sciences",
    label: "Pure and Applied Sciences",
    hint: "Physics, Chemistry, Maths, Engineering Physics, Economics",
    parents: ["PHYSICS", "CHEM", "MATH", "ENGPHY", "ENGSCI", "GENSCI", "ECON"],
  },
  {
    id: "bio",
    label: "Biology, Agriculture and Food",
    hint: "Biotech, Biomedical, Agricultural, Food",
    parents: [
      "BIOTECH",
      "BIOENG",
      "BIOMEDENG",
      "BIOSCI",
      "LIFESCI",
      "AGRIENG",
      "FOODENG",
      "DAIRYENG",
    ],
  },
  {
    id: "other",
    label: "Design and other",
    hint: "Design, General Engineering",
    parents: ["DESIGN", "GENENG"],
  },
];

const FAMILY_OF = Object.fromEntries(
  BRANCH_FAMILIES.flatMap((f) => f.parents.map((p) => [p, f.id]))
);
export const familyOf = (parentId) => FAMILY_OF[parentId] || "other";

// What a student wants to do after college, and where (the plans are in
// planFor)
export const INTERESTS = [
  {
    id: "tech",
    label: "Coding and tech",
    hint: "Software, data, AI, building products",
  },
  {
    id: "consulting",
    label: "Consulting or finance",
    hint: "Advising businesses, banking, investing, trading",
  },
  {
    id: "sales",
    label: "Sales or marketing",
    hint: "Working with customers, brands and markets",
  },
  {
    id: "operations",
    label: "Business operations",
    hint: "Running teams, supply chains and projects",
  },
  {
    id: "core",
    label: "Core engineering",
    hint: "Manufacturing plants, construction, energy, design",
  },
  {
    id: "research",
    label: "Higher studies and research",
    hint: "A master's or PhD, labs, academia",
  },
  {
    id: "none",
    label: "No particular interest yet",
    hint: "We'll go by how competitive each seat is",
  },
];

export const WORKPLACES = [
  { id: "company", label: "A big company" },
  { id: "startup", label: "A start-up" },
  { id: "government", label: "A government job" },
  { id: "university", label: "A university" },
];

// CS (and AI, data science, maths & computing): what a coding student is
// steered to, whatever their branch; every other branch counts the same
const CODING_FAMILIES = ["cs"];

const closingRankOf = (r) => {
  const n = parseInt(
    String(r["Closing Rank"] ?? "").replace(/[^0-9]/g, ""),
    10
  );
  return Number.isFinite(n) ? n : null;
};

// The plan for a student: a sort key from a seat's facts, and what it does
// in words. Each key is compared low first; closing rank comes after it.
//   x: { iit (0/1), nirf (overall Engineering rank or null), mine (in the
//   student's branch), coding (CS) }
export const planFor = ({ interest, workplace, families }) => {
  const hasBranch = !!families?.length;
  const top10 = (x) => x.nirf != null && x.nirf <= 10;
  const top30 = (x) => x.nirf != null && x.nirf <= 30;
  const iit30 = (x) => x.iit && top30(x);
  const nit30 = (x) => !x.iit && top30(x);
  // the first group a seat is in, by number; past all of them, "the rest"
  const groups =
    (...tests) =>
    (x) => {
      const i = tests.findIndex((t) => t(x));
      return i < 0 ? tests.length : i;
    };

  // Strictly branch first: every seat in it, by college, before any other
  // branch; then other branches by college
  const branchFirst = (inBranch, name) => ({
    key: groups(
      (x) => inBranch(x) && iit30(x),
      (x) => inBranch(x) && nit30(x),
      (x) => inBranch(x) && x.iit,
      inBranch,
      iit30,
      nit30,
      (x) => x.iit
    ),
    summary: `${name} at IITs in the NIRF top 30, then at NITs in the top 30, then at other IITs, then at other NITs; only then other branches: IITs in the top 30, NITs in the top 30, other IITs, the rest.`,
  });
  const mine = (x) => x.mine;
  const wantsCs = families?.includes("cs");

  if (workplace === "government")
    return {
      key: (x) => [1 - x.iit],
      summary: "All IITs first, then NITs and other colleges.",
    };
  if (["consulting", "sales", "operations"].includes(interest))
    return {
      key: (x) => [
        groups(
          (y) => y.iit && top10(y),
          iit30,
          nit30,
          (y) => y.iit
        )(x),
        x.mine ? 0 : 1,
      ],
      summary:
        "Any branch at IITs in the NIRF top 10, then IITs ranked 11–30, then NITs in the top 30, then other IITs, then the rest" +
        (hasBranch ? "; your branch first in each." : "."),
    };
  if (interest === "tech" && workplace === "startup")
    return {
      key: groups(
        (x) => x.coding && x.iit && top10(x),
        (x) => x.coding && iit30(x),
        (x) => x.coding && nit30(x),
        (x) => x.iit && top10(x),
        iit30,
        nit30
      ),
      summary:
        "CS at IITs in the NIRF top 10, then IITs ranked 11–30, then NITs in the top 30; then other branches the same way; then the rest.",
    };
  if (interest === "tech" && workplace === "company" && wantsCs)
    return branchFirst((x) => x.coding, "CS");
  if (interest === "tech")
    return {
      key: groups(
        (x) => x.coding && iit30(x),
        (x) => x.coding && nit30(x),
        iit30
      ),
      summary:
        "CS at IITs in the NIRF top 30, then at NITs in the top 30, then other branches at top-30 IITs, then the rest.",
    };
  if (interest === "research" && workplace === "university" && hasBranch)
    return {
      key: groups(
        (x) => x.mine && iit30(x),
        (x) => x.mine && nit30(x),
        mine,
        iit30,
        nit30,
        (x) => x.iit
      ),
      summary:
        "Your branch at IITs in the NIRF top 30, then at NITs in the top 30, then at every other college, most competitive first; only then other branches: IITs in the top 30, NITs in the top 30, other IITs, the rest.",
    };
  if (interest === "research")
    return {
      key: groups(
        (x) => x.mine && iit30(x),
        (x) => x.mine && nit30(x),
        iit30,
        nit30
      ),
      summary: hasBranch
        ? "Your branch at IITs in the NIRF top 30, then at NITs in the top 30; then other branches the same way; then the rest."
        : "IITs in the NIRF top 30, then NITs in the top 30, then the rest.",
    };
  if (interest === "core" && workplace === "company" && hasBranch)
    return branchFirst(mine, "Your branch");
  if (interest === "core")
    return {
      key: groups(
        (x) => x.mine && iit30(x),
        (x) => x.mine && nit30(x),
        iit30,
        (x) => x.iit
      ),
      summary: hasBranch
        ? "Your branch at IITs in the NIRF top 30, then at NITs in the top 30, then other branches at top-30 IITs, then other IITs, then the rest."
        : "IITs in the NIRF top 30, then other IITs, then the rest.",
    };
  return {
    key: () => [],
    summary: "Most competitive seats first, by closing rank.",
  };
};

// A sort key for each row: the plan's key, then how competitive the seat
// is, most competitive first. Main and Advanced ranks aren't comparable, so
// a closing rank is measured against the student's own rank in that exam:
// a seat closing at 1.3x their Advanced rank is harder to get than one
// closing at 2.3x their Main rank. Without both ranks (the full list of
// cutoffs), a seat's percentile among its exam's seats stands in.
//   rows: the whole result set, so percentiles don't shift with the view
//   ranks: { "JEE Main": rank, "JEE Advanced": rank }, the student's own
export const buildOrder = (rows, prefs, branchParents, ranks = {}) => {
  const plan = planFor(prefs);
  const mine = new Set(prefs.families || []);
  const byExam = {};
  for (const r of rows) {
    const cr = closingRankOf(r);
    if (cr != null) (byExam[r["Exam"]] = byExam[r["Exam"]] || []).push(cr);
  }
  for (const e of Object.keys(byExam)) byExam[e].sort((a, b) => a - b);
  const pct = (r) => {
    const list = byExam[r["Exam"]];
    const cr = closingRankOf(r);
    if (!list || cr == null) return 1;
    let lo = 0;
    let hi = list.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (list[mid] < cr) lo = mid + 1;
      else hi = mid;
    }
    return list.length > 1 ? lo / (list.length - 1) : 0;
  };
  const ownRank = (exam) => {
    const n = parseInt(String(ranks[exam] ?? "").replace(/[^0-9]/g, ""), 10);
    return n > 0 ? n : null;
  };
  const byOwnRank = Object.keys(byExam).every((e) => ownRank(e));
  const competitiveness = (r) => {
    const cr = closingRankOf(r);
    if (!byOwnRank) return pct(r);
    return cr == null ? Infinity : cr / ownRank(r["Exam"]);
  };
  // a plan's key is a group number or a list of them
  const planKey = (x) => [].concat(plan.key(x));
  const key = (row) => [
    ...planKey({
      iit: row["Exam"] === "JEE Advanced" ? 1 : 0,
      nirf: row["NIRF List"] === "Engineering" ? row["NIRF Rank"] : null,
      ...(() => {
        const parent = branchParents?.[row["Academic Program Name"]]?.id;
        const family = parent ? familyOf(parent) : null;
        return {
          mine: mine.has(family),
          coding: CODING_FAMILIES.includes(family),
        };
      })(),
    }),
    competitiveness(row),
  ];
  key.summary = plan.summary;
  // no groups: closing rank alone
  key.grouped = planKey({ iit: 0, nirf: null }).length > 0;
  return key;
};

export const compareKeys = (a, b) => {
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    if (Math.abs(d) > 1e-9) return d;
  }
  return 0;
};
