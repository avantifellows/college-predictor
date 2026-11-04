import { PREDICTOR_EXAMS } from "./predictorRoutes";
import { CV_URL } from "./siteMap";

// "Get started": a few questions (class, stream + state, exam), then the
// homepage becomes a short plan of the site's own tools in the order that
// student needs them. Every step is a page that already exists, opened
// pre-filtered; nothing here is new data.
//
// answers = { cls, stream, state, exam, done: [step ids], skipped }
//   cls     "10" (Class 10 or below) | "11" | "12" | "drop" | "college" | "none"
//   stream  "pcm" | "pcb" | "pcmb" | "commerce" | "arts" | "unsure"
//   exam    a predictor key (JoSAA, NEETUG, KCET, ...) or "unsure"
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
    mock: { href: "/josaa", name: "JoSAA" },
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
    mock: { href: "/mhtcet", name: "MHT CET" },
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
  if (step === "exam")
    return (
      !!a.exam && examOptions(a.stream, a.state).some((o) => o.id === a.exam)
    );
  return false;
}

/** A new answer, dropping later answers it makes meaningless. */
export function withAnswer(a, key, value) {
  const n = { ...a, [key]: value };
  if (key === "cls" && !SCHOOL.includes(value)) {
    delete n.stream;
    delete n.exam;
  }
  if (
    (key === "stream" || key === "state") &&
    n.exam &&
    !examOptions(n.stream, n.state).some((o) => o.id === n.exam)
  )
    delete n.exam;
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
      if (s[1]) a.exam = s[1];
    }
    if (p.stream === "clat") a.exam = "CLAT"; // stream unknown: asked
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
  title: "Find scholarships",
  line: "Scholarships you can apply for",
  href: `/scholarships${q({ grade, state })}`,
});
const careerQuiz = {
  id: "career-quiz",
  title: "Take the Career Quiz",
  line: "Careers that fit what you enjoy",
  href: "/career-quiz",
};
const careers = (stream) => ({
  id: "careers",
  title: "Explore careers",
  line: CAREER_STREAM[stream]
    ? `What careers after ${CAREER_STREAM[stream]} pay and need`
    : "What each career pays and needs",
  href: `/careers${q({ stream: CAREER_STREAM[stream] })}`,
});
const exploreExams = (a) => ({
  id: "exams",
  title: "See entrance exams",
  line: a.state
    ? `Exams open to students in ${a.state}`
    : "Dates, eligibility and paper pattern",
  href: `/exams${q({ where: a.state })}`,
});
// JoSAA's home-state field takes the state's name as it is
const predict = (key, state) => ({
  id: "predict",
  title: "Predict your colleges",
  line: `Colleges you can get with your ${EXAM_INFO[key].rank}`,
  href: `/predictor${q({
    exam: key,
    homeState: key === "JoSAA" ? state : undefined,
  })}`,
});

// other exams worth a rank for this student, as predictor keys
function backupsFor(a) {
  const own = STATE_EXAM[a.state];
  if (a.exam === "JoSAA") {
    const viaJee = JEE_STATE_COUNSELLINGS[a.state] || [];
    return [...viaJee, own, "BITSAT"].filter(Boolean);
  }
  if (a.exam === "NEETUG") return own && fits(own, SCIENCE_BIO) ? [own] : [];
  if (a.exam === "BITSAT" || a.exam === own) return ["JoSAA"];
  if (a.exam === "CUET" && a.stream === "arts") return ["CLAT"];
  if (a.exam === "CLAT") return ["CUET"];
  return [];
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

function backupStep(a) {
  const keys = backupsFor(a);
  if (!keys.length) return null;
  const viaJee = a.exam === "JoSAA" && COUNSELLING_LABEL[keys[0]];
  const names = keys.map((k) => COUNSELLING_LABEL[k] || examName(k));
  return {
    id: "backup",
    title: "Plan backup options",
    line: viaJee
      ? `${listText(names.slice(0, 2))} also take your JEE Main rank`
      : `Colleges through ${listText(names.slice(0, 2))}`,
    href: `/predictor${q({ exam: keys[0] })}`,
  };
}

const SCHOLARSHIP_GRADE = { 10: "10", 11: "11", 12: "12", drop: "12_pass" };

/**
 * The homepage for these answers: a hero (headline, main action, a second
 * action) and the plan's steps. `kind` names the variant.
 */
export function planFor(a) {
  if (!a || a.skipped || !a.cls || a.cls === "none") return { kind: "explore" };
  const grade = SCHOLARSHIP_GRADE[a.cls];

  if (a.cls === "college")
    return {
      kind: "college",
      chip: ["In college"],
      title: "Your plan",
      hero: {
        before: "Build a professional ",
        em: "CV",
        after: " in minutes",
        cta: { id: "cv", label: "Make my CV", href: CV_URL, external: true },
      },
      steps: [
        {
          id: "cv",
          title: "Make your CV",
          line: "A clean resume in minutes",
          href: CV_URL,
          external: true,
        },
        careers(null),
        scholarships("UG"),
      ],
    };

  const streamLabel = STREAMS.find((s) => s.id === a.stream)?.label;
  const chip = [
    CLASSES.find((c) => c.id === a.cls)?.label,
    a.stream && a.stream !== "unsure" ? streamLabel : null,
    a.exam && a.exam !== "unsure" ? examName(a.exam) : null,
    a.state,
  ].filter(Boolean);

  // younger students, or no exam in mind yet: interests first
  if (a.cls === "10" || !a.exam || a.exam === "unsure") {
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

  const info = EXAM_INFO[a.exam];
  // Class 11: a year to go. Know the exam, and what rank each college asks
  if (a.cls === "11")
    return {
      kind: "prepare",
      chip,
      title: `Your ${info.name} plan`,
      hero: {
        before: "See what ",
        em: `${info.name} rank`,
        after: " each college needs",
        cta: {
          id: "cutoffs",
          label: "See the cutoffs",
          href: `/predictor${q({ exam: a.exam, view: "full" })}`,
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
          title: "See the cutoffs",
          line: `What ${info.rank} each college closed at`,
          href: `/predictor${q({ exam: a.exam, view: "full" })}`,
        },
        info.page && {
          id: "exam",
          title: `Know ${info.name}`,
          line: "Dates, eligibility and paper pattern",
          href: `/exams/${info.page}`,
        },
        careerQuiz,
        scholarships(grade, a.state),
      ].filter(Boolean),
    };

  // Class 12 / a year to prepare: the rank is (nearly) in hand
  const p = predict(a.exam, a.state);
  const mock = info.mock && {
    id: "mock",
    title: `Try ${info.mock.name} mock allotment`,
    line: "Practise your choice list before the real rounds",
    href: info.mock.href,
  };
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
      backupStep(a),
      // nothing else to try for this exam: the careers it leads to (NEET:
      // more than MBBS)
      !mock && !backupStep(a) && careers(a.stream),
      scholarships(grade, a.state),
    ].filter(Boolean),
  };
}

// only known values survive (the same check runs on the server)
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
    exam: pick(a.exam, [...Object.keys(EXAM_INFO), "unsure"]),
    skipped: a.skipped === true || undefined,
    done: (Array.isArray(a.done) ? a.done : [])
      .filter((d) => typeof d === "string" && /^[a-z-]{1,20}$/.test(d))
      .slice(0, 10),
  };
  return Object.fromEntries(
    Object.entries(out).filter(([, v]) => v !== undefined)
  );
}
