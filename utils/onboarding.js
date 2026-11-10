import { PREDICTOR_EXAMS } from "./predictorRoutes";
import { CV_URL } from "./siteMap";

// "Get started": a few questions (class, stream + state, exam), then the
// homepage becomes a short plan of the site's own tools in the order that
// student needs them. Every step is a page that already exists, opened
// pre-filtered; nothing here is new data.
//
// answers = { cls, stream, state, exams: [...], used: [...], skipped }
//   cls     "10" (Class 10 or below) | "11" | "12" | "drop" | "college" | "none"
//   stream  "pcm" | "pcb" | "pcmb" | "commerce" | "arts" | "unsure"
//   exams   predictor keys (JoSAA, NEETUG, KCET, ...), main one first, or
//           ["unsure"]. Answers saved before 6 Nov 2026 hold one `exam`
//           instead; examsOf reads both
//   used    what the student has really done on the site, recorded by the
//           page where it happens (useRecordUse): "predictor:<key>" (results
//           shown), "mock:josaa" / "mock:mhtcet" (a round run), "career-quiz"
//           (results reached), "exam:<exam id>" (its page opened)
//
// A plan step is done when one of its `uses` is in `used` ("exam:*": any
// exam page but those in `usesExcept`), or (`star`) the
// signed-in student has starred one of that kind. Opening a step is not
// doing it.
//
// Class 12 and gap-year students get the admission plan (predict, mock,
// backups) while results and counselling are on (15 April to 30 September)
// and the preparation plan (cutoffs, backup exams, their cutoffs) the rest of
// the year. Class 11 always prepares.
//
// A guest's answers stay in this browser. A signed-in student's are saved
// with their account (/api/me), and until they answer, their Avanti profile
// stands in (class, stream, state), so the plan is there on first visit.

export const CLASSES = [
  { id: "10", label: "Class 10 or below" },
  { id: "11", label: "Class 11" },
  { id: "12", label: "Class 12" },
  { id: "drop", label: "Finished Class 12", sub: "Taking a year to prepare" },
  { id: "college", label: "In college" },
  { id: "none", label: "Not a student", sub: "Parent, teacher or counsellor" },
];

export const STREAMS = [
  { id: "pcm", label: "Science (PCM)", sub: "Physics, Chemistry, Maths" },
  { id: "pcb", label: "Science (PCB)", sub: "Physics, Chemistry, Biology" },
  { id: "pcmb", label: "Science (PCMB)", sub: "Maths and Biology both" },
  { id: "commerce", label: "Commerce" },
  { id: "arts", label: "Arts / Humanities" },
  { id: "unsure", label: "Not decided yet" },
];

// the careers tab's class-12 stream filter
const CAREER_STREAM = {
  pcm: "Science (PCM)",
  pcb: "Science (PCB)",
  pcmb: "Science (PCM)",
  commerce: "Commerce",
  arts: "Arts",
};

// the state's own entrance exam, where Futures has its cutoffs (OJEE, JAC
// Delhi and UPTAC fill seats on JEE Main ranks: see JEE_STATE_COUNSELLINGS)
const STATE_EXAM = {
  Maharashtra: "MHT CET",
  Karnataka: "KCET",
  "Andhra Pradesh": "AP EAPCET",
  Telangana: "TGEAPCET",
  "West Bengal": "WBJEE",
  Kerala: "KEAM",
  Gujarat: "GUJCET",
  "Tamil Nadu": "TNEA",
};
// state counsellings that take a JEE Main rank, by the student's state
const JEE_STATE_COUNSELLINGS = {
  Delhi: ["JEE Main-JAC"],
  Chandigarh: ["JAC Chandigarh"],
  Punjab: ["JAC Chandigarh"],
  "Uttar Pradesh": ["UPTAC", "HBTU"],
  Odisha: ["OJEE"],
  "West Bengal": ["WBJEE JEE Main"],
};

// what the plan says about each exam. `rank` completes "with your ___";
// `page` is its Exams-tab card; `mock` its seat-allotment simulator
const EXAM_INFO = {
  JoSAA: {
    name: "JEE",
    sub: "JEE Main and Advanced",
    rank: "JEE Main rank",
    page: "jee-main-paper-1",
    mock: { href: "/josaa", name: "JoSAA", use: "mock:josaa" },
  },
  NEETUG: { name: "NEET", sub: "NEET-UG", rank: "NEET rank", page: "neet-ug" },
  BITSAT: {
    name: "BITSAT",
    sub: "BITS Pilani, Goa and Hyderabad",
    rank: "BITSAT score",
    page: "bitsat",
  },
  CUET: {
    name: "CUET",
    sub: "DU, BHU and other central universities",
    rank: "CUET scores",
    page: "cuet-ug",
  },
  CLAT: {
    name: "CLAT",
    sub: "National law universities",
    rank: "CLAT rank",
    page: "clat",
  },
  "MHT CET": {
    name: "MHT CET",
    rank: "MHT CET rank",
    page: "mht-cet",
    mock: { href: "/mhtcet", name: "MHT CET", use: "mock:mhtcet" },
  },
  KCET: { name: "KCET", rank: "KCET rank", page: "kea-cet" },
  "AP EAPCET": {
    name: "AP EAPCET",
    rank: "AP EAPCET rank",
    page: "ap-eapcet-e-category",
  },
  TGEAPCET: { name: "TG EAPCET", rank: "TG EAPCET rank", page: "tg-eapcet-e" },
  WBJEE: { name: "WBJEE", rank: "WBJEE rank", page: "wbjee" },
  KEAM: { name: "KEAM", rank: "KEAM rank", page: "keam" },
  GUJCET: { name: "GUJCET", rank: "GUJCET merit rank", page: "gujcet" },
  TNEA: {
    name: "TNEA",
    sub: "Admission on your Class 12 marks",
    rank: "Class 12 marks",
    page: null,
  },
};
export const examName = (key) => EXAM_INFO[key]?.name || key;

// the streams a predictor key's cutoffs hold (utils/predictorRoutes.js)
const streamsOfKey = (key) => {
  for (const e of PREDICTOR_EXAMS) {
    const c = e.counsellings.find((x) => x.key === key);
    if (c) return c.streams || e.streams || [];
  }
  return [];
};
const SCIENCE_MATHS = ["Engineering", "Architecture"];
const SCIENCE_BIO = [
  "Medical",
  "Nursing",
  "Pharma",
  "Agriculture",
  "Veterinary Science",
];
const fits = (key, streams) =>
  streamsOfKey(key).some((s) => streams.includes(s));

/** The exams to offer for a stream and home state, main ones first. */
export function examOptions(stream, state) {
  const own = STATE_EXAM[state];
  const keys = {
    pcm: ["JoSAA", own && fits(own, SCIENCE_MATHS) && own, "BITSAT", "CUET"],
    pcb: ["NEETUG", own && fits(own, SCIENCE_BIO) && own, "CUET"],
    pcmb: ["JoSAA", "NEETUG", own, "BITSAT", "CUET"],
    commerce: ["CUET", "CLAT"],
    arts: ["CUET", "CLAT"],
  }[stream];
  return (keys || [])
    .filter(Boolean)
    .map((key) => ({
      id: key,
      label: EXAM_INFO[key].name,
      sub:
        EXAM_INFO[key].sub ||
        (key === own ? `${state}'s own entrance exam` : ""),
    }))
    .concat({ id: "unsure", label: "Not sure yet" });
}

// ── the questions ─────────────────────────────────────────────────────────
const SCHOOL = ["11", "12", "drop"];
// before the class is picked, show the longest path (class, stream, exam)
export const asksStream = (a) => !a.cls || SCHOOL.includes(a.cls);
// until the stream is known, assume an exam question follows (the progress
// bar shouldn't grow mid-way)
export const asksExam = (a) => asksStream(a) && a.stream !== "unsure";

/** The questions this student is asked, in order. */
export const stepsFor = (a) =>
  ["class", asksStream(a) && "stream", asksExam(a) && "exam"].filter(Boolean);

/** The question after `step`, or null when the plan comes next. */
export function nextStep(step, a) {
  const steps = stepsFor(a);
  return steps[steps.indexOf(step) + 1] || null;
}

/** Is the question answered (so Continue can go on)? */
export function answered(step, a) {
  if (step === "class") return !!a.cls;
  if (step === "stream") return !!a.stream && !!a.state;
  if (step === "exam") {
    const ids = examOptions(a.stream, a.state).map((o) => o.id);
    const ex = examsOf(a);
    return ex.length > 0 && ex.every((k) => ids.includes(k));
  }
  return false;
}

/** The exams answer: an array, from either the new or the old shape. */
export const examsOf = (a) =>
  Array.isArray(a?.exams) ? a.exams : a?.exam ? [a.exam] : [];

/**
 * Tick or untick one exam. "Not sure yet" stands alone; the rest keep the
 * order they're offered in, so the main exam comes first.
 */
export function toggleExam(a, id) {
  const ids = examOptions(a.stream, a.state).map((o) => o.id);
  const cur = examsOf(a);
  let next;
  if (id === "unsure") next = cur.includes("unsure") ? [] : ["unsure"];
  else {
    const set = new Set(cur.filter((k) => k !== "unsure"));
    if (set.has(id)) set.delete(id);
    else set.add(id);
    next = ids.filter((k) => set.has(k));
  }
  const n = { ...a, exams: next };
  delete n.exam;
  return n;
}

/** A new answer, dropping later answers it makes meaningless. */
export function withAnswer(a, key, value) {
  const n = { ...a, [key]: value };
  if (key === "cls" && !SCHOOL.includes(value)) {
    delete n.stream;
    delete n.exams;
    delete n.exam;
  }
  if (key === "stream" || key === "state") {
    // keep only the exams this stream and state still offer
    const ids = examOptions(n.stream, n.state).map((o) => o.id);
    const kept = examsOf(n).filter((k) => ids.includes(k));
    delete n.exam;
    if (kept.length) n.exams = kept;
    else delete n.exams;
  }
  return n;
}

// ── the Avanti profile as answers ─────────────────────────────────────────
// profile.class: 9..12, 13 = dropper; profile.stream: engineering / medical
// / clat / ca / foundation (utils/portalSession.js STREAM_OPTIONS)
export function answersFromProfile(p) {
  if (!p) return {};
  const a = {};
  const cls = Number(p.class);
  if (cls && cls <= 10) a.cls = "10";
  else if (cls === 11 || cls === 12) a.cls = String(cls);
  else if (cls === 13) a.cls = "drop";
  if (p.stream === "foundation" && !a.cls) a.cls = "10";
  if (p.state) a.state = p.state;
  if (SCHOOL.includes(a.cls)) {
    const s = {
      engineering: ["pcm", "JoSAA"],
      medical: ["pcb", "NEETUG"],
      ca: ["commerce", null],
    }[p.stream];
    if (s) {
      a.stream = s[0];
      if (s[1]) a.exams = [s[1]];
    }
    if (p.stream === "clat") a.exams = ["CLAT"]; // stream unknown: asked
  }
  return a;
}

/** Enough answers to build a plan without asking anything? */
export function complete(a) {
  if (!a || !a.cls) return false;
  return stepsFor(a).every((s) => answered(s, a));
}

// ── the plan ──────────────────────────────────────────────────────────────
const q = (params) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
  ).toString();
  return s ? `?${s}` : "";
};
const scholarships = (grade, state) => ({
  id: "scholarships",
  star: "scholarship",
  // a scholarship's details opened, or its source visited
  uses: ["scholarship"],
  title: "Find scholarships",
  line: "Scholarships you can apply for",
  href: `/scholarships${q({ grade, state })}`,
});
const careerQuiz = {
  id: "career-quiz",
  uses: ["career-quiz"],
  title: "Take the Career Quiz",
  line: "Careers that fit what you enjoy",
  href: "/career-quiz",
};
const careers = (stream) => ({
  id: "careers",
  star: "career",
  // any career's page opened
  uses: ["career:*"],
  title: "Explore careers",
  line: CAREER_STREAM[stream]
    ? `Careers you can go into after ${CAREER_STREAM[stream]}`
    : "What each career is about and how to get there",
  href: `/careers${q({ stream: CAREER_STREAM[stream] })}`,
});
const exploreExams = (a) => ({
  id: "exams",
  star: "exam",
  // any exam's page opened
  uses: ["exam:*"],
  title: "See entrance exams",
  line: a.state
    ? `Exams open to students in ${a.state}`
    : "Dates, eligibility and paper pattern",
  href: `/exams${q({ where: a.state })}`,
});
// JoSAA's home-state field takes the state's name as it is
const predict = (key, state) => ({
  id: "predict",
  uses: [`predictor:${key}`],
  title: "Predict your colleges",
  line: `Colleges you can get with your ${EXAM_INFO[key].rank}`,
  href: `/predictor${q({
    exam: key,
    homeState: key === "JoSAA" ? state : undefined,
  })}`,
});

// other exams worth a rank for this student, as predictor keys: the other
// exams they picked first, then what their main exam's rank also opens
function backupsFor(a) {
  const [main, ...picked] = examsOf(a);
  const own = STATE_EXAM[a.state];
  let more = [];
  if (main === "JoSAA") {
    const viaJee = JEE_STATE_COUNSELLINGS[a.state] || [];
    more = [...viaJee, own, "BITSAT"];
  } else if (main === "NEETUG")
    more = own && fits(own, SCIENCE_BIO) ? [own] : [];
  else if (main === "BITSAT" || main === own) more = ["JoSAA"];
  else if (main === "CUET" && a.stream === "arts") more = ["CLAT"];
  else if (main === "CLAT") more = ["CUET"];
  return [...new Set([...picked, ...more].filter(Boolean))].filter(
    (k) => k !== main
  );
}
const COUNSELLING_LABEL = {
  "JEE Main-JAC": "JAC Delhi",
  "JAC Chandigarh": "JAC Chandigarh",
  UPTAC: "UPTAC",
  HBTU: "HBTU Kanpur",
  OJEE: "OJEE",
  "WBJEE JEE Main": "WBJEEB",
};
const listText = (xs) =>
  xs.length > 1
    ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`
    : xs[0];

/**
 * Where a backups step goes: straight to the predictor when there's one
 * exam, else /backups, which lists them and lets the student pick.
 * `view` "full" opens the whole cutoff list instead of the rank form.
 */
export function backupHref(keys, state, view) {
  if (keys.length === 1)
    return view
      ? cutoffsHref(keys[0], state)
      : `/predictor${q({ exam: keys[0] })}`;
  return `/backups${q({ exams: keys.join(","), state, view })}`;
}

/** One backup exam, described for the /backups page. */
export function backupOption(key, a) {
  const viaJee = Object.values(JEE_STATE_COUNSELLINGS).some((xs) =>
    xs.includes(key)
  );
  return {
    key,
    name: COUNSELLING_LABEL[key] || examName(key),
    line: viaJee
      ? "Takes your JEE Main rank"
      : key === STATE_EXAM[a.state]
      ? `${a.state}'s own entrance exam`
      : EXAM_INFO[key]?.sub || "",
  };
}

function backupStep(a) {
  const keys = backupsFor(a);
  if (!keys.length) return null;
  const viaJee = examsOf(a)[0] === "JoSAA" && COUNSELLING_LABEL[keys[0]];
  const names = keys.map((k) => COUNSELLING_LABEL[k] || examName(k));
  return {
    id: "backup",
    uses: keys.map((k) => `predictor:${k}`),
    title: "Plan backup options",
    line: viaJee
      ? `${listText(names.slice(0, 2))} also take your JEE Main rank`
      : `Colleges through ${listText(names.slice(0, 2))}`,
    href: backupHref(keys, a.state),
  };
}

const SCHOLARSHIP_GRADE = { 10: "10", 11: "11", 12: "12", drop: "12_pass" };

/**
 * Results and counselling season (15 April to 30 September): JEE Main
 * session 2 results come mid-April, and MCC and state counselling rounds
 * run into September. Class 12 students get the admission plan then, and
 * the preparation plan the rest of the year.
 */
export function resultsSeason(now = new Date()) {
  const m = now.getMonth(); // 0 = January
  const d = now.getDate();
  return (m === 3 && d >= 15) || (m >= 4 && m <= 8);
}

// full cutoff list for an exam (JoSAA's home-state field takes the state's
// name as it is)
export const cutoffsHref = (key, state) =>
  `/predictor${q({
    exam: key,
    view: "full",
    homeState: key === "JoSAA" ? state : undefined,
  })}`;

/**
 * The homepage for these answers: a hero (headline, main action, a second
 * action) and the plan's steps. `kind` names the variant. `season` is
 * "results" or "prep" (default: from today's date).
 */
export function planFor(a, season) {
  if (!a || a.skipped || !a.cls || a.cls === "none") return { kind: "explore" };
  const grade = SCHOLARSHIP_GRADE[a.cls];

  if (a.cls === "college") {
    const cv = {
      id: "cv",
      // an outside site: opening it from the plan is all we can see
      uses: ["cv"],
      title: "Build your CV",
      line: "A clean resume in minutes",
      href: CV_URL,
      external: true,
    };
    return {
      kind: "college",
      chip: ["In college"],
      title: "Your plan",
      hero: {
        before: "See which ",
        em: "careers",
        after: " match your interests",
        cta: {
          id: "career-quiz",
          label: "Take the Career Quiz",
          href: "/career-quiz",
        },
        second: { ...cv, label: "Make my CV" },
      },
      // know which careers fit first, then write the CV for them
      steps: [careerQuiz, cv, scholarships("UG")],
    };
  }

  const exams = examsOf(a).filter((k) => k !== "unsure");
  const streamLabel = STREAMS.find((s) => s.id === a.stream)?.label;
  const chip = [
    CLASSES.find((c) => c.id === a.cls)?.label,
    a.stream && a.stream !== "unsure" ? streamLabel : null,
    exams.length ? exams.map(examName).join(", ") : null,
    a.state,
  ].filter(Boolean);

  // younger students, or no exam in mind yet: interests first
  if (a.cls === "10" || !exams.length) {
    const young = a.cls === "10";
    return {
      kind: "discover",
      chip,
      title: "Your plan",
      hero: {
        before: "See which ",
        em: "careers",
        after: " match your interests",
        cta: {
          id: "career-quiz",
          label: "Take the Career Quiz",
          href: "/career-quiz",
        },
      },
      steps: [
        careerQuiz,
        careers(a.stream),
        young ? null : exploreExams(a),
        scholarships(grade, a.state),
      ].filter(Boolean),
    };
  }

  const main = exams[0];
  const info = EXAM_INFO[main];
  const inSeason =
    (season || (resultsSeason() ? "results" : "prep")) === "results";

  // preparing (Class 11 all year; Class 12 before results): know the rank
  // each college asks, then the exams that back the main one up
  if (a.cls === "11" || !inSeason) {
    const backups = backupsFor(a);
    const names = backups.map((k) => COUNSELLING_LABEL[k] || examName(k));
    return {
      kind: "prepare",
      chip,
      title: "Your plan",
      hero: {
        before: "See ",
        em: `${info.name} cutoffs`,
        after: " for your target colleges",
        cta: {
          id: "cutoffs",
          label: `See ${info.name} cutoffs`,
          href: cutoffsHref(main, a.state),
        },
        second: info.page && {
          id: "exam",
          label: `About ${info.name}`,
          href: `/exams/${info.page}`,
        },
      },
      steps: [
        {
          id: "cutoffs",
          uses: [`predictor:${main}`],
          title: `See ${info.name} cutoffs`,
          line: "Cutoffs for the colleges you're aiming for",
          href: cutoffsHref(main, a.state),
        },
        {
          id: "backup-exams",
          star: "exam",
          // opening another exam's page counts (guests can't star); the
          // main exam's own page doesn't
          uses: ["exam:*"],
          usesExcept: info.page ? [`exam:${info.page}`] : [],
          title: "See backup exam options",
          line: "Other exams that can get you into a good college",
          href: `/exams${q({ where: a.state })}`,
        },
        backups.length && {
          id: "backup-cutoffs",
          uses: backups.map((k) => `predictor:${k}`),
          title: "See backup exam cutoffs",
          line: `Cutoffs for ${listText(names.slice(0, 2))}`,
          href: backupHref(backups, a.state, "full"),
        },
        scholarships(grade, a.state),
      ].filter(Boolean),
    };
  }

  // results are out: predict, practise, and line up backups
  const p = predict(main, a.state);
  const mock = info.mock && {
    id: "mock",
    uses: [info.mock.use],
    title: `Try ${info.mock.name} mock allotment`,
    line: "Practise your choice list before the real rounds",
    href: info.mock.href,
  };
  const backup = backupStep(a);
  return {
    kind: "admission",
    chip,
    title: `Your ${info.name} plan`,
    hero: {
      before: "See which ",
      em: "colleges",
      after: ` you can get with your ${info.rank}`,
      cta: { id: "predict", label: "Predict my colleges", href: p.href },
      second: mock && { id: "mock", label: mock.title, href: mock.href },
    },
    steps: [
      p,
      mock,
      backup,
      // nothing else to try for this exam: the careers it leads to (NEET:
      // more than MBBS)
      !mock && !backup && careers(a.stream),
      scholarships(grade, a.state),
    ].filter(Boolean),
  };
}

// only known values survive (the same check runs on the server)
const USED_LIMIT = 100;
export function cleanAnswers(a) {
  if (!a || typeof a !== "object") return null;
  const pick = (v, ids) => (ids.includes(v) ? v : undefined);
  const out = {
    cls: pick(
      a.cls,
      CLASSES.map((c) => c.id)
    ),
    stream: pick(
      a.stream,
      STREAMS.map((s) => s.id)
    ),
    state:
      typeof a.state === "string" && /^[A-Za-z &.-]{2,60}$/.test(a.state)
        ? a.state
        : undefined,
    exams: (() => {
      const ok = [...Object.keys(EXAM_INFO), "unsure"];
      const xs = examsOf(a).filter((k) => ok.includes(k));
      return xs.length ? [...new Set(xs)].slice(0, 8) : undefined;
    })(),
    skipped: a.skipped === true || undefined,
    // what the student did, newest last; past the limit the oldest go, so
    // a new one is always kept (ids run to 72 characters:
    // hau-et-haryana-agriculture-university-community-sc-entrance-test-haryana)
    used: [
      ...new Set(
        (Array.isArray(a.used) ? a.used : []).filter(
          (u) =>
            typeof u === "string" &&
            /^[a-z-]{1,20}(:[A-Za-z0-9 .-]{1,100})?$/.test(u)
        )
      ),
    ].slice(-USED_LIMIT),
  };
  return Object.fromEntries(
    Object.entries(out).filter(([, v]) => v !== undefined)
  );
}

// what the headline says when a step is the one to do next. The plan's own
// hero covers its first step; these take over as the student moves on.
const STEP_HERO = {
  predict: { before: "See which ", em: "colleges", after: " you can get" },
  mock: { before: "Practise your ", em: "choice list", after: " in a mock" },
  backup: { before: "Line up ", em: "backup", after: " colleges" },
  "backup-exams": {
    before: "Check out your ",
    em: "backup exam",
    after: " options",
  },
  "backup-cutoffs": {
    before: "See ",
    em: "cutoffs",
    after: " for your backup exams",
  },
  exam: { before: "Get to know ", em: "your exam", after: "" },
  "career-quiz": {
    before: "See which ",
    em: "careers",
    after: " match your interests",
  },
  careers: { before: "Explore ", em: "careers", after: " that fit you" },
  exams: { before: "See the ", em: "entrance exams", after: " open to you" },
  cv: { before: "Make your ", em: "CV", after: "" },
  scholarships: {
    before: "Find ",
    em: "scholarships",
    after: " you can apply for",
  },
};

/**
 * The hero for where the student is in the plan: the plan's own while its
 * first step is still to do; then the next undone step's; and once every
 * step is done, that (with `done`: true, so the page offers what's next).
 */
export function heroFor(plan, isDone) {
  const next = plan.steps.find((x) => !isDone(x));
  if (!next) return { done: true };
  if (next.id === plan.hero.cta.id) return plan.hero;
  const words = STEP_HERO[next.id] || { before: "", em: next.title, after: "" };
  return { ...words, cta: { ...next, label: next.title } };
}

/** Is this plan step done? `stars` from useStudentData (empty for guests). */
export const stepDone = (step, used = [], stars = {}) =>
  (step.uses || []).some((u) =>
    u.endsWith("*")
      ? used.some(
          (x) =>
            x.startsWith(u.slice(0, -1)) && !(step.usesExcept || []).includes(x)
        )
      : used.includes(u)
  ) ||
  (!!step.star && (stars[step.star] || []).length > 0);
