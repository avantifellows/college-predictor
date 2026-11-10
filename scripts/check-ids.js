#!/usr/bin/env node
// Runs every real id and name in public/data through the same checks that
// decide what a student's saves keep (utils/onboarding.js cleanAnswers,
// utils/server/saves.js), and fails if any would be dropped or cut.
//
//   npm run check:ids
//
// Why: an exam id one character over a limit (AAT's 42 against 40) was
// silently refused when its visit was recorded, recorded again, refused
// again, and froze the page. A new exam, career, college or scholarship with
// a long id or name now fails the build instead of a demo.
const fs = require("fs");
const path = require("path");
const { addHook } = require("sucrase/dist/register");

addHook(".js", { transforms: ["imports", "jsx"], jsxRuntime: "automatic" });

const ROOT = path.join(__dirname, "..");
const load = (rel) => require(path.join(ROOT, rel));
const readJson = (rel) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const { cleanAnswers, EXAM_KEYS } = load("utils/onboarding.js");
const { isRefId, cleanPlans, cleanQuiz } = load("utils/server/saves.js");
const { scholarshipId } = load("utils/studentData.js");
const { STATES } = load("components/examShared.js");
const { PREDICTOR_EXAMS } = load("utils/predictorRoutes.js");

const exams = readJson("public/data/exams/exams.json");
const careers = readJson("public/data/careers/careers.json");
const colleges = readJson("public/data/colleges/colleges.json");
const scholarships = readJson("public/data/scholarships/scholarship_data.json");
const quiz = readJson("public/data/careers/quiz.json");

const problems = [];
const bad = (what, id) => problems.push({ what, id });

// 1. what the plan records when a student does something (useRecordUse)
const base = { cls: "12", stream: "pcm", state: "Karnataka", exams: ["JoSAA"] };
const uses = [
  ...exams.map((e) => `exam:${e.exam_id}`),
  ...careers.map((c) => `career:${c.career_id}`),
  ...PREDICTOR_EXAMS.flatMap((e) =>
    e.counsellings.map((c) => `predictor:${c.key}`)
  ),
  "mock:josaa",
  "mock:mhtcet",
  "career-quiz",
  "scholarship",
  "cv",
];
for (const u of uses)
  if (!(cleanAnswers({ ...base, used: [u] }).used || []).includes(u))
    bad("a visit the plan can't record", u);

// 2. Get started: every state and exam a student can pick
for (const s of STATES)
  if (cleanAnswers({ ...base, state: s }).state !== s)
    bad("a state Get started can't keep", s);
for (const k of EXAM_KEYS)
  if (!(cleanAnswers({ ...base, exams: [k] }).exams || []).includes(k))
    bad("an exam Get started can't keep", k);

// 3. stars and plans: every id, and its name as Favourites and plans keep
// it (both save names with the same text limit)
const star = (kind, id, label) => {
  if (!isRefId(id)) return bad(`a ${kind} that can't be starred`, id);
  const p = cleanPlans([{ id: "p", college: { id, label } }])[0];
  if (label && p.college?.label !== label)
    bad(`a ${kind} name cut short when saved`, `${id} (${label.length})`);
};
exams.forEach((e) => star("exam", e.exam_id, e.name));
careers.forEach((c) => star("career", c.career_id, c.name));
colleges.forEach((c) => star("college", c.college_id, c.display_name));
const seen = new Map();
for (const s of scholarships) {
  const name = s["Scholarship Name"];
  const id = scholarshipId(name);
  star("scholarship", id, name);
  if (seen.has(id) && seen.get(id) !== name)
    bad("two scholarships with one id", `${id}: ${seen.get(id)} / ${name}`);
  seen.set(id, name);
}

// 4. plans: every branch a college offers
for (const c of colleges)
  for (const x of c.programs?.list || []) {
    if (!x.branch) continue;
    const p = cleanPlans([
      { id: "p", college: { id: c.college_id }, branch: x.branch },
    ])[0];
    if (p.branch !== x.branch)
      bad("a branch cut short in a plan", `${c.college_id}: ${x.branch}`);
  }

// 5. the career quiz: every subject a student can pick
for (const name of quiz.subjects || []) {
  const out = cleanQuiz({ answers: { picked: [name] } });
  if (!out.answers.picked.includes(name))
    bad("a quiz subject the result can't keep", name);
}

const checked = `${uses.length} visits, ${STATES.length} states, ${EXAM_KEYS.length} Get started exams, ${exams.length} exams, ${careers.length} careers, ${colleges.length} colleges, ${scholarships.length} scholarships`;
if (!problems.length) {
  console.log(`ids ok: ${checked}`);
  process.exit(0);
}
const by = {};
for (const p of problems) (by[p.what] = by[p.what] || []).push(p.id);
for (const [what, ids] of Object.entries(by)) {
  console.error(`\n${what}: ${ids.length}`);
  for (const id of ids.slice(0, 10)) console.error(`  ${id}`);
}
console.error(
  "\nRaise the limit in utils/onboarding.js (cleanAnswers) or utils/server/saves.js, or shorten the id."
);
process.exit(1);
