// The College Predictor's stream -> exam -> counselling choices.
//
// An exam is what the student sat; a counselling is the body that allots seats
// on it. JEE Main alone feeds JoSAA, JAC Delhi, UPTAC, OJEE and more, so the
// form asks for the exam and then the counselling.
//
// A counselling's `streams` are the streams its cutoffs hold: KCET's file
// has engineering, pharmacy and agriculture seats, so KCET sits under those
// and not under Naturopathy, which the Exams tab lists for the exam. An
// exam's streams are its counsellings'. A counselling without `streams`
// (CUET's central universities) takes the Exams tab's streams for the exam
// (public/data/exams/exams.json, matched on `examIds`). An exam's own
// `streams` is for a route the Exams tab has no exam for (TNEA and
// Gujarat's nursing & allied courses admit on Class 12 marks).
//
// The form's Program / Stream / Course Type question is answered by the
// stream when one of its options names it.
//
// `key` is the examConfigs key for the counselling's cutoffs. Counsellings
// Futures has no cutoffs for (CSAB, MP DTE, HSTES, IIIT Hyderabad, IISc,
// IIST) aren't listed: add one with its key when its cutoffs are in.
// `hint` names one or two colleges the counselling fills. `defaultStream`
// (on an exam or a counselling) is where a deep link to it lands.

export const PREDICTOR_EXAMS = [
  {
    // one entry for both papers: JoSAA takes both ranks, and the form asks
    // whether the student qualified JEE Advanced
    id: "jee",
    // paper 2A (B.Arch) puts JoSAA's architecture seats under Architecture
    examIds: ["jee-main-paper-1", "jee-advanced", "jee-main-paper-2a"],
    label: "JEE Main & Advanced",
    counsellings: [
      {
        label: "JoSAA",
        hint: "IITs, NITs, IIITs, etc.",
        key: "JoSAA",
        streams: ["Engineering", "Science", "Architecture", "Planning"],
      },
      {
        label: "JAC Delhi",
        hint: "DTU, NSUT, etc.",
        key: "JEE Main-JAC",
        streams: ["Engineering"],
      },
      {
        label: "JAC Chandigarh",
        hint: "PEC, CCET, etc.",
        key: "JAC Chandigarh",
        streams: ["Engineering"],
      },
      {
        label: "UPTAC",
        hint: "IET Lucknow, KNIT Sultanpur, etc.",
        key: "UPTAC",
        streams: ["Engineering"],
      },
      {
        label: "HBTU Kanpur",
        hint: null,
        key: "HBTU",
        streams: ["Engineering"],
      },
      {
        label: "OJEE",
        hint: "OUTR Bhubaneswar, VSSUT Burla, etc.",
        key: "OJEE",
        streams: ["Engineering"],
      },
      // WBJEEB fills some private colleges' seats on JEE Main ranks
      {
        label: "WBJEEB (JEE Main seats)",
        hint: "Techno Main Salt Lake, etc.",
        key: "WBJEE JEE Main",
        streams: ["Engineering"],
      },
    ],
  },
  {
    id: "bitsat",
    examIds: ["bitsat"],
    label: "BITSAT",
    counsellings: [
      {
        label: "BITS",
        hint: "Pilani, Goa, Hyderabad",
        key: "BITSAT",
        streams: ["Engineering", "Pharma", "Science"],
      },
    ],
  },
  {
    id: "neet-ug",
    examIds: ["neet-ug"],
    label: "NEET-UG",
    defaultStream: "Medical",
    counsellings: [
      {
        label: "MCC and state counselling",
        hint: "AIIMS, government medical colleges, etc.",
        key: "NEETUG",
        streams: ["Medical", "Nursing"],
      },
      // Gujarat's BAMS / BHMS (its MBBS / BDS state quota is in NEETUG)
      {
        label: "Gujarat AYUSH (BAMS, BHMS)",
        hint: "Govt. Akhandanand Ayurveda College, etc.",
        key: "ACPMEC AYUSH",
        streams: ["Medical"],
      },
    ],
  },
  {
    id: "aiims-ee",
    examIds: ["aiims-ee"],
    label: "AIIMS B.Sc. Nursing entrance",
    counsellings: [
      {
        label: "AIIMS B.Sc. (Hons.) Nursing",
        hint: "AIIMS Delhi, etc.",
        key: "AIIMS Nursing",
        streams: ["Nursing"],
      },
    ],
  },
  {
    id: "cuet-ug",
    examIds: ["cuet-ug"],
    label: "CUET (UG)",
    counsellings: [
      {
        label: "Central universities",
        hint: "DU, BHU, etc.",
        key: "CUET",
        defaultStream: "Arts",
      },
      {
        label: "ICAR",
        hint: "state agricultural universities",
        key: "ICAR-UG",
        defaultStream: "Agriculture",
        streams: ["Agriculture"],
      },
    ],
  },
  {
    id: "clat",
    examIds: ["clat"],
    label: "CLAT",
    counsellings: [
      {
        label: "CLAT counselling",
        hint: "NLSIU Bengaluru, NALSAR, etc.",
        key: "CLAT",
        streams: ["Law"],
      },
    ],
  },
  {
    id: "ap-eapcet",
    examIds: ["ap-eapcet-e-category"],
    label: "AP EAPCET",
    counsellings: [
      {
        label: "AP EAPCET counselling",
        hint: "Andhra University, JNTU Kakinada, etc.",
        key: "AP EAPCET",
        streams: ["Engineering", "Pharma"],
      },
    ],
  },
  {
    id: "tg-eapcet",
    examIds: ["tg-eapcet-e"],
    label: "TG EAPCET",
    counsellings: [
      {
        label: "TG EAPCET counselling",
        hint: "JNTU Hyderabad, Osmania University, etc.",
        key: "TGEAPCET",
        streams: ["Engineering"],
      },
    ],
  },
  {
    id: "gujcet",
    examIds: ["gujcet"],
    label: "GUJCET",
    counsellings: [
      {
        label: "ACPC Gujarat",
        hint: "LDCE Ahmedabad, etc.",
        key: "GUJCET",
        streams: ["Engineering", "Pharma"],
      },
    ],
  },
  {
    id: "kcet",
    examIds: ["kea-cet"],
    label: "KCET",
    counsellings: [
      {
        label: "KEA Karnataka",
        hint: "RVCE, BMSCE, etc.",
        key: "KCET",
        // Agriculture includes B.V.Sc and fisheries
        streams: ["Engineering", "Pharma", "Agriculture", "Veterinary Science"],
      },
    ],
  },
  {
    id: "keam",
    examIds: ["keam"],
    label: "KEAM",
    counsellings: [
      {
        label: "CEE Kerala",
        hint: "CET Trivandrum, TKM Kollam, etc.",
        key: "KEAM",
        streams: ["Engineering"],
      },
    ],
  },
  {
    id: "mht-cet",
    examIds: ["mht-cet"],
    label: "MHT CET",
    counsellings: [
      {
        label: "Maharashtra CET Cell",
        hint: "COEP, VJTI, etc.",
        key: "MHT CET",
        streams: ["Engineering", "Pharma", "Architecture"],
      },
    ],
  },
  {
    id: "wbjee",
    examIds: ["wbjee"],
    label: "WBJEE",
    counsellings: [
      {
        label: "WBJEEB",
        hint: "Jadavpur University, etc.",
        key: "WBJEE",
        streams: ["Engineering"],
      },
    ],
  },
  {
    id: "tnea",
    examIds: [],
    streams: ["Engineering"],
    label: "Class 12 marks (Tamil Nadu)",
    counsellings: [
      { label: "TNEA", hint: "CEG Guindy, PSG Tech, etc.", key: "TNEA" },
    ],
  },
  {
    // Gujarat admits nursing and the allied degrees on Class 12 marks
    id: "gujarat-nursing",
    examIds: [],
    streams: ["Nursing", "Paramedical"],
    label: "Class 12 marks (Gujarat)",
    counsellings: [
      {
        label: "ACPMEC nursing & allied",
        hint: "Govt. nursing and physiotherapy colleges, etc.",
        key: "ACPMEC Nursing",
      },
    ],
  },
];

export const counsellingLabel = (c) =>
  c.hint ? `${c.label} (${c.hint})` : c.label;

// Streams per exam: its counsellings', or the Exams tab's for one that
// doesn't say
export const streamsFor = (exam, examsById) => {
  if (exam.streams) return exam.streams;
  const tab = exam.examIds.flatMap((id) => examsById[id]?.streams || []);
  return Array.from(
    new Set(exam.counsellings.flatMap((c) => c.streams || tab))
  );
};

// most students first: the rest follow alphabetically
const STREAM_ORDER = [
  "Engineering",
  "Medical",
  "Science",
  "Commerce",
  "Arts",
  "Law",
  "Architecture",
  "Pharma",
  "Agriculture",
  "Nursing",
];
const streamRank = (s) => {
  const i = STREAM_ORDER.indexOf(s);
  return i < 0 ? STREAM_ORDER.length : i;
};

export const allStreams = (examsById) =>
  Array.from(
    new Set(PREDICTOR_EXAMS.flatMap((e) => streamsFor(e, examsById)))
  ).sort((a, b) => streamRank(a) - streamRank(b) || a.localeCompare(b));

// the counsellings open to a stream
export const counsellingsIn = (exam, stream) =>
  exam.counsellings.filter((c) => !c.streams || c.streams.includes(stream));

export const examsInStream = (stream, examsById) =>
  PREDICTOR_EXAMS.filter((e) => streamsFor(e, examsById).includes(stream));

// A deep link names a predictor key (?exam=JoSAA), optionally with the Exams
// tab's exam (&examId=jee-advanced). Find the route that leads to it.
export const routeForKey = (key, examsById, examId = null) => {
  const exams = PREDICTOR_EXAMS.filter((e) =>
    e.counsellings.some((c) => c.key === key)
  );
  const exam = exams.find((e) => e.examIds.includes(examId)) || exams[0];
  if (!exam) return null;
  const counselling = exam.counsellings.find((c) => c.key === key);
  const streams = streamsFor(exam, examsById);
  const preferred = [
    counselling.defaultStream,
    exam.defaultStream,
    "Engineering",
  ].find((s) => s && streams.includes(s));
  return { stream: preferred || streams[0], exam, counselling };
};
