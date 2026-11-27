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
// parent ids are data-sources/branch_taxonomy.csv parents (as of the Oct
// 2026 branch-sheet merges); rerun scripts/build_josaa_branch_parents.py and
// check every parent it prints sits in a family when the taxonomy changes
export const BRANCH_FAMILIES = [
  {
    id: "cs",
    short: "CS",
    label: "Computer Science and related",
    hint: "CS, IT, AI / Data Science, Maths & Computing",
    parents: ["CSIT", "AIML", "MNC"],
  },
  {
    id: "elec",
    short: "electrical and electronics",
    label: "Electrical and Electronics",
    hint: "EE, ECE, Instrumentation",
    parents: ["ELEC", "INSTRENG"],
  },
  {
    id: "mech",
    short: "mechanical",
    label: "Mechanical and Production",
    hint: "Mechanical, Aerospace, Production, Robotics",
    parents: ["MECHENG", "INDENG", "AERO", "MARINE", "ROBOENG", "ENGDES"],
  },
  {
    id: "civil",
    short: "civil and architecture",
    label: "Civil, Architecture and Planning",
    hint: "Civil, Environmental, B.Arch, Planning",
    parents: ["CIVILENG", "ENVENG", "ARCH", "PLAN"],
  },
  {
    id: "chem",
    short: "chemical and materials",
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
      "PAPERENG",
      "PHARMAENG",
    ],
  },
  {
    id: "earth",
    short: "mining and earth sciences",
    label: "Mining and Earth Sciences",
    hint: "Mining, Geology, Geophysics",
    parents: ["MININGENG", "GEO"],
  },
  {
    id: "sciences",
    short: "pure sciences",
    label: "Pure and Applied Sciences",
    hint: "Physics, Chemistry, Maths, Engineering Physics, Economics",
    parents: ["PHYSICS", "CHEM", "MATH", "ENGPHY", "GENSCI", "ECON"],
  },
  {
    id: "bio",
    short: "biology and biotech",
    label: "Biology, Agriculture and Food",
    hint: "Biotech, Biomedical, Agricultural, Food",
    parents: [
      "BIOTECH",
      "BIOENG",
      "BIOMEDENG",
      "BIO",
      "LIFESCI",
      "AGRIENG",
      "FOODENG",
      "DAIRYENG",
    ],
  },
  {
    id: "other",
    short: "design",
    label: "Design and other",
    hint: "Design, General Engineering, dual degrees with MBA",
    parents: ["DESIGN", "GENENG", "MBADUAL"],
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

// When a better college has a different branch: which wins. Asked only
// after a branch is picked; buildOrder says what each does.
export const PRIORITIES = [
  {
    id: "college",
    label: "The college",
    hint: () => "A better college, even in a different branch",
  },
  {
    id: "branch",
    label: "The branch",
    hint: (branch) =>
      `${branch || "My branch"}, even at a lower-ranked college`,
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
// The college-first order, used wherever the college leads: consulting,
// sales and operations, no particular interest with a big company in mind,
// a start-up with no branch picked, and anyone who says the college
// matters more than the branch. Every branch at the top 5
// IITs, then the rest of the top 10, then IITs ranked 11–30, then the top
// 30 NITs (and any other college NIRF puts in its top 30 for the course,
// like SPA Delhi for B.Arch); everything else after that.
//   x: { iit (0/1 or boolean), nirf (the course's NIRF rank or null) }
export const collegeFirstGroup = (x) => {
  const n = x.nirf;
  if (n == null || n > 30) return 4;
  if (!x.iit) return 3;
  return n <= 5 ? 0 : n <= 10 ? 1 : 2;
};

export const planFor = ({ interest, workplace, families, priority }) => {
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

  // the branch in a sentence ("civil and architecture"), for `line`
  const branch =
    BRANCH_FAMILIES.find((f) => f.id === families?.[0])?.short || "your branch";
  const Branch = branch.charAt(0).toUpperCase() + branch.slice(1);

  // Strictly branch first: every seat in it, by college, before any other
  // branch; then other branches by college
  const branchFirst = (inBranch, name, line) => ({
    line,
    branchFirst: true,
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
      line: "IITs are shown first, since you want a government job.",
    };
  // careers that hire mostly from the best-known campuses: the college-first
  // order, their branch first inside each group
  const collegeFirst = (line) => ({
    key: (x) => [collegeFirstGroup(x), x.mine ? 0 : 1],
    summary:
      "Any branch at IITs in the NIRF top 5, then the other top-10 IITs, then IITs ranked 11–30, then NITs in the top 30, then the rest" +
      (hasBranch ? "; your branch first in each." : "."),
    line,
  });
  if (["consulting", "sales", "operations"].includes(interest))
    return collegeFirst(
      `The top 5 IITs are shown first, since ${
        {
          consulting: "consulting and finance firms",
          sales: "sales and marketing teams",
          operations: "operations teams",
        }[interest]
      } hire mostly from them.`
    );
  // no particular interest yet, but a big company in mind: big companies
  // hire most from the best-known campuses. If they picked a branch and say
  // it matters more than the college, their branch at the top 30 IITs
  // comes first (top 5, rest of the top 10, 11-30), above other branches
  // even at the top 5 IITs; then the college-first order, their branch first
  // in each group. This plan settles "the branch" itself (ownsPriority), so
  // buildOrder doesn't also put their whole branch first.
  if (interest === "none" && workplace === "company") {
    const line =
      "The top 5 IITs are shown first, since big companies hire most from the best-known campuses.";
    if (hasBranch && priority === "branch")
      return {
        ownsPriority: true,
        key: (x) => [
          x.mine && x.iit && top30(x) ? 0 : 1,
          collegeFirstGroup(x),
          x.mine ? 0 : 1,
        ],
        summary:
          "Your branch at IITs in the NIRF top 30 (top 5, then 6–10, then 11–30); then any branch at IITs in the top 5, the other top-10 IITs, IITs 11–30, NITs in the top 30, the rest; your branch first in each.",
        line,
        priorityLine: `${Branch} at the top 30 IITs is shown above other branches at the top 5 IITs.`,
      };
    return collegeFirst(line);
  }
  // a start-up with no branch picked: the campus matters most
  if (workplace === "startup" && !hasBranch)
    return collegeFirst(
      "The top 5 IITs are shown first, since start-ups hire mostly from the best-known campuses."
    );
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
      line: "CS at the top IITs is shown first, since start-ups hire many coders from there.",
    };
  if (interest === "tech" && workplace === "company" && wantsCs)
    return branchFirst(
      (x) => x.coding,
      "CS",
      "CS at good colleges is shown first, since you want a coding job."
    );
  if (interest === "tech")
    return {
      key: groups(
        (x) => x.coding && iit30(x),
        (x) => x.coding && nit30(x),
        iit30
      ),
      summary:
        "CS at IITs in the NIRF top 30, then at NITs in the top 30, then other branches at top-30 IITs, then the rest.",
      line: "CS at the top IITs and NITs is shown first, since you want a coding job.",
    };
  if (interest === "research" && workplace === "university" && hasBranch)
    return {
      branchFirst: true,
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
      line: `${Branch} is shown first, since research builds on your subject.`,
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
      line: hasBranch
        ? `${Branch} at the top IITs and NITs is shown first, for the best labs and teachers.`
        : "Top IITs and NITs are shown first, for the best labs and teachers.",
    };
  if (interest === "core" && workplace === "company" && hasBranch)
    return branchFirst(
      mine,
      "Your branch",
      `${Branch} is shown first, since core companies hire by branch.`
    );
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
      line: hasBranch
        ? `${Branch} at the top IITs and NITs is shown first, since core companies recruit most there.`
        : "Top IITs are shown first, since core companies recruit most there.",
    };
  return {
    key: () => [],
    summary: "Most competitive seats first, by closing rank.",
    line: "Harder-to-get seats are shown first, since you haven't picked a career yet.",
  };
};

// The NIRF rank that fits the course: the Engineering list for any
// programme, and for a B.Arch / B.Plan also the Architecture and Planning
// list (SPA Delhi is #8 there and in no Engineering list). null when NIRF
// doesn't rank the college in a list that fits.
const DESIGN_DEGREE = /Bachelor of (Architecture|Planning)/i;
export const nirfOf = (row) => {
  const rank = row["NIRF Rank"] ?? null;
  if (rank == null) return null;
  if (row["NIRF List"] === "Engineering") return rank;
  if (
    row["NIRF List"] === "Architecture and Planning" &&
    DESIGN_DEGREE.test(row["Academic Program Name"] || "")
  )
    return rank;
  return null;
};
// ranked by NIRF, but only in a list that doesn't fit the course (JNU and
// four central universities, in the University list): not the same scale
// as Engineering, so no NIRF band, but not "unranked" either
export const rankedInOtherList = (row) =>
  (row["NIRF Rank"] ?? null) != null && nirfOf(row) == null;

// IIT / NIT / IIIT / GFTI. IIEST Shibpur counts as an NIT, the way JoSAA
// groups it (the predictor's College Type already says "Gen 2 NIT").
export const instituteKind = (row) => {
  if (row["Exam"] === "JEE Advanced") return "IIT";
  const type = String(row["College Type"] || "");
  const name = String(row["Institute"] || "");
  if (
    /NIT/.test(type) ||
    /National Institute of Technology|Engineering Science and Technology/i.test(
      name
    )
  )
    return "NIT";
  if (
    type === "IIIT" ||
    /Indian Institute of Information Technology/i.test(name)
  )
    return "IIIT";
  return "GFTI";
};

// Two rules that hold whatever the plan says:
//   A  an IIT in the NIRF top 10 sits above every NIT and IIIT
//   B  every IIT and NIT sits above any IIIT or GFTI outside the NIRF top
//      50 (or not ranked; a college ranked only in a list that doesn't fit
//      the course is left out of this rule, see rankedInOtherList)
// They only ever hold a seat back; nothing else is reordered. In particular
// a top-10 IIT is NOT pushed above other IITs or GFTIs: CS at a top-30 IIT
// stays above Civil at a top-10 IIT when the plan puts CS first.
const isTop10Iit = (row) => {
  const n = nirfOf(row);
  return instituteKind(row) === "IIT" && n != null && n <= 10;
};
const belowTop10Iits = (row) => ["NIT", "IIIT"].includes(instituteKind(row));
const isIitOrNit = (row) => ["IIT", "NIT"].includes(instituteKind(row));
export const belowIitsAndNits = (row) => {
  const n = nirfOf(row);
  return (
    ["IIIT", "GFTI"].includes(instituteKind(row)) &&
    !(n != null && n <= 50) &&
    !rankedInOtherList(row)
  );
};

// rows in plan order -> the same rows with A and B applied. Walking the
// plan's order, a row that must sit below seats still to come pulls just
// those seats up to sit right above it, in their own plan order; every
// other row keeps its place. (Holding the row back instead would let
// whatever comes next slip above it too: Civil at a top-30 IIT jumping
// ahead of CS at a top-30 NIT while the NIT seat waits for the top-10 IITs.)
export const applyRules = (ordered) => {
  const placed = new Set();
  const out = [];
  const place = (row) => {
    if (placed.has(row)) return;
    placed.add(row);
    out.push(row);
  };
  // the rows each rule can pull up, as indices into `ordered`, and how far
  // into each list everything is already placed
  const pullable = [isTop10Iit, isIitOrNit].map((test) => ({
    idx: ordered.flatMap((r, i) => (test(r) ? [i] : [])),
    done: 0,
  }));
  // place every not-yet-placed row of a list, in plan order
  const pullUp = (list) => {
    while (list.done < list.idx.length) {
      const j = list.idx[list.done];
      list.done += 1;
      placeWithRules(ordered[j]);
    }
  };
  const placeWithRules = (row) => {
    if (placed.has(row)) return;
    if (belowIitsAndNits(row)) pullUp(pullable[1]);
    if (belowTop10Iits(row)) pullUp(pullable[0]);
    place(row);
  };
  ordered.forEach((row) => placeWithRules(row));
  return out;
};

// one seat, across the predictor's filtered views of the same result set
const seatId = (r) =>
  [
    r["Institute"],
    r["Academic Program Name"],
    r["Quota"],
    r["Seat Type"],
    r["Gender"],
    r["Exam"],
  ].join("|");

// When the career answer and the college-or-branch answer pull apart, the
// career wins: it says who actually hires. Returns the priority buildOrder
// uses (which may differ from what they answered) and which conflict, if any.
//   careerCollege  consulting / sales / operations + "the branch": these
//                  employers hire from all branches at top colleges, so the
//                  college-first order stands
//   careerBranch   core engineering + "the college": core companies hire by
//                  branch, so their branch goes first. (Research + "the
//                  college" is not a conflict: students often switch fields
//                  for a master's or PhD, and the college's labs and faculty
//                  matter as much as the branch.)
//   codingNotCs    coding + a branch other than CS: flagged in the note only;
//                  the branch is their explicit pick, so the order keeps it
export const resolvePriority = (prefs) => {
  const family = BRANCH_FAMILIES.find((f) => f.id === prefs.families?.[0]);
  const asked = family ? prefs.priority || null : null;
  const { interest, workplace } = prefs;
  if (
    asked === "branch" &&
    workplace !== "government" &&
    ["consulting", "sales", "operations"].includes(interest)
  )
    return { priority: null, asked, conflict: "careerCollege" };
  if (asked === "college" && interest === "core")
    return { priority: "branch", asked, conflict: "careerBranch" };
  if (asked && interest === "tech" && family.id !== "cs")
    return { priority: asked, asked, conflict: "codingNotCs" };
  return { priority: asked, asked, conflict: null };
};

// How a JEE Advanced rank compares with a JEE Main rank: the same student's
// Main CRL rank is about 1.6x their Advanced CRL rank (median 1.66, steady
// at 1.5-1.7 from Advanced rank 2k to 30k; 753 JNV students with both
// ranks in 2024 and 2025, avantifellows.external_data_sources
// .jnv_fact_jee_results). So an IIT seat closing at Advanced 10,000 is
// compared as if it closed at Main 16,000.
export const ADV_TO_MAIN_RANK = 1.6;

// A seat's closing rank on the JEE Main scale (lower = harder to get)
const mainScaleRank = (row) => {
  const cr = closingRankOf(row);
  if (cr == null) return Infinity;
  return row["Exam"] === "JEE Advanced" ? cr * ADV_TO_MAIN_RANK : cr;
};

// A sort key for each row: the plan's key, then how hard the seat is to
// get, hardest first, with Advanced closing ranks put on the Main scale
// (ADV_TO_MAIN_RANK). The same for every student: it doesn't depend on
// their own ranks.
//   rows: the whole result set, the order is worked out over all of it
//
// College or branch (prefs.priority, only with a branch picked) settles
// what the plan and the two rules would otherwise fight over:
//   college  the college-first groups lead (collegeFirstGroup: top 5 IITs,
//            the rest of the top 10, IITs 11–30, top-30 NITs, the rest);
//            within a group the plan's order (their branch first, where the
//            plan says so), then the two rules
//   branch   every seat in their branch before any other; the plan's order
//            and the two rules apply inside each half, so a top-10 IIT in
//            another branch never jumps their branch at an NIT
export const buildOrder = (rows, prefs, branchParents) => {
  // the priority after conflicts are settled (resolvePriority)
  const { priority } = resolvePriority(prefs);
  const plan = planFor({ ...prefs, priority });
  const mine = new Set(prefs.families || []);
  // "the branch" puts their whole branch first, unless the plan settles it
  const branchSplit = priority === "branch" && !plan.ownsPriority;
  const familyOfRow = (row) => {
    const parent = branchParents?.[row["Academic Program Name"]]?.id;
    return parent ? familyOf(parent) : null;
  };
  const isMine = (row) => mine.has(familyOfRow(row));
  const collegeBand = (row) =>
    collegeFirstGroup({
      iit: instituteKind(row) === "IIT",
      nirf: nirfOf(row),
    });
  // a plan's key is a group number or a list of them
  const planKey = (x) => [].concat(plan.key(x));
  const planOrderKey = (row) => [
    ...(priority === "college" ? [collegeBand(row)] : []),
    ...(branchSplit ? [isMine(row) ? 0 : 1] : []),
    ...planKey({
      iit: row["Exam"] === "JEE Advanced" ? 1 : 0,
      nirf: nirfOf(row),
      mine: isMine(row),
      coding: CODING_FAMILIES.includes(familyOfRow(row)),
    }),
    mainScaleRank(row),
  ];
  // the plan's order over the whole result set, then the two rules (inside
  // each half, when the branch comes first); a row's key is its place in
  // that order
  const keyed = rows.map((row, i) => ({ row, k: [...planOrderKey(row), i] }));
  keyed.sort((a, b) => compareKeys(a.k, b.k));
  const sorted = keyed.map((x) => x.row);
  const ordered = branchSplit
    ? [
        ...applyRules(sorted.filter(isMine)),
        ...applyRules(sorted.filter((r) => !isMine(r))),
      ]
    : applyRules(sorted);
  const position = new Map();
  ordered.forEach((row, i) => {
    const id = seatId(row);
    if (!position.has(id)) position.set(id, i);
  });
  const key = (row) => [position.get(seatId(row)) ?? rows.length];
  key.summary = plan.summary;
  // no groups: closing rank alone (the two rules aside)
  key.grouped = planKey({ iit: 0, nirf: null }).length > 0;
  return key;
};

// The order in a few one-line steps, for the "Why this order" walk-through
// shown with the list after the quiz. Each step is true of what buildOrder
// does with these answers. A step's text may hold "{NIRF}", where the note
// puts a "What is NIRF?" link.
//   1  which wins, college or branch (or, with no branch picked, the
//      career plan's line); where their answers conflict, what we did and
//      why (resolvePriority)
//   2  the trade-off between college and branch for their career, or the
//      coding-without-CS conflict
//   3  the top-10 IIT rule
//   4  their states, when they picked any
export const explainOrder = (prefs) => {
  const { priority, conflict } = resolvePriority(prefs);
  const plan = planFor({ ...prefs, priority });
  const family = BRANCH_FAMILIES.find((f) => f.id === prefs.families?.[0]);
  const states = prefs.states || [];
  const branch = family?.short;
  const Branch = branch && branch.charAt(0).toUpperCase() + branch.slice(1);
  const steps = [];
  // the whole branch goes first, unless the plan settles "the branch" itself
  const branchSplit = priority === "branch" && !plan.ownsPriority;
  if (conflict === "careerCollege")
    steps.push(
      `${
        {
          consulting: "Consulting firms",
          sales: "Sales and marketing teams",
          operations: "Operations teams",
        }[prefs.interest]
      } recruit from all branches at top-ranked colleges, so those are shown on top, even though you prefer ${branch}.`
    );
  else if (conflict === "careerBranch")
    steps.push(
      `Core engineering companies hire by branch, so ${branch} is shown on top, even though you prefer a better college.`
    );
  else if (priority === "branch")
    steps.push(
      plan.priorityLine ||
        `${Branch} at lower-ranked colleges is shown above other branches at higher-ranked colleges.`
    );
  else if (priority === "college")
    steps.push(
      `Other branches at higher-ranked colleges are shown above ${branch} at lower-ranked colleges.`
    );
  else steps.push(plan.line);
  if (conflict === "codingNotCs")
    steps.push(
      priority === "branch"
        ? `Most coding jobs go to CS students, but you picked ${branch}, so ${branch} stays on top. Consider adding CS seats too.`
        : `Most coding jobs go to CS students, so CS is shown above ${branch} at the top colleges.`
    );
  else if (priority && !conflict) {
    const tradeoff =
      prefs.workplace === "government"
        ? "Government jobs are filled through exams like GATE, where your branch matters"
        : {
            core: "Core engineering jobs depend on your branch",
            tech: "Coding jobs favour CS, but better colleges draw better recruiters",
            research:
              "Research builds on your branch, but better colleges have better labs",
            consulting:
              "Consulting and finance firms care more about your college",
            sales: "Sales and marketing jobs care more about your college",
            operations: "Business operations jobs care more about your college",
          }[prefs.interest] || "College and branch both shape your career";
    steps.push(`${tradeoff}, so there's a tradeoff. Choose carefully.`);
  }
  steps.push(
    `${
      branchSplit ? "Within your branch, and again for the rest, top" : "Top"
    } 10 {NIRF} IITs are ranked above ${
      branchSplit ? "" : "all "
    }NITs and IIITs, because along with great placements, they also offer a strong alumni network and research environment.`
  );
  if (states.length)
    steps.push(
      states.length > 2
        ? "Colleges from your selected states are shown on top."
        : `Colleges in ${states.join(" and ")} are shown on top.`
    );
  return steps;
};

export const compareKeys = (a, b) => {
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    if (Math.abs(d) > 1e-9) return d;
  }
  return 0;
};
