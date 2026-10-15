import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

// What a signed-in student keeps on Futures, one DynamoDB table
// (futures_student_saves), one partition per student:
//
//   pk = USER#<afdb user id>
//   sk = PATHWAY                      the plan: career, colleges, exams, rank to aim
//        QUIZ                         latest career quiz result the student chose to save
//        STAR#<KIND>#<ref id>         a starred college / career / exam / scholarship
//
// Items carry only shared ids (AISHE code, career_id, exam_id) plus a label
// for display, and schema_version / created_at / updated_at, so moving them
// into afdb later is a straight copy (afdb's college table is keyed by the
// same AISHE codes). No personal data beyond the afdb user id.

export const SCHEMA_VERSION = 1;
export const STAR_KINDS = ["college", "career", "exam", "scholarship"];
export const STAR_LIMIT = 50; // per kind
export const PATHWAY_LIMITS = { colleges: 5, exams: 4 };

const TABLE = process.env.FUTURES_SAVES_TABLE || "futures_student_saves";

// Amplify passes explicit keys (the futures-app user, scoped to this table);
// locally the SDK's default chain (an `aws` CLI login) is used.
function credentials() {
  const accessKeyId = process.env.FUTURES_DDB_ACCESS_KEY;
  const secretAccessKey = process.env.FUTURES_DDB_SECRET_KEY;
  return accessKeyId && secretAccessKey
    ? { credentials: { accessKeyId, secretAccessKey } }
    : {};
}

let doc = null;
function client() {
  if (!doc) {
    doc = DynamoDBDocumentClient.from(
      new DynamoDBClient({
        region: process.env.FUTURES_DDB_REGION || "ap-south-1",
        ...credentials(),
      }),
      { marshallOptions: { removeUndefinedValues: true } }
    );
  }
  return doc;
}

const pk = (userId) => `USER#${userId}`;
const now = () => new Date().toISOString();

// ids are short and plain: AISHE codes (C-36143), card ids (mhtcet:06156),
// career / exam slugs. Anything else is refused, not stored.
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9:._\- ]{0,119}$/;
export const isRefId = (v) => typeof v === "string" && ID_RE.test(v);
const cleanText = (v, max = 160) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : null;

/** Everything saved for a student, shaped for the site. */
export async function loadAll(userId) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const out = await client().send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": pk(userId) },
        ExclusiveStartKey,
      })
    );
    items.push(...(out.Items || []));
    ExclusiveStartKey = out.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  const stars = Object.fromEntries(STAR_KINDS.map((k) => [k, []]));
  let pathway = null;
  let quiz = null;
  for (const it of items) {
    if (it.sk === "PATHWAY") pathway = it.data;
    else if (it.sk === "QUIZ") quiz = { ...it.data, saved_at: it.updated_at };
    else if (it.sk.startsWith("STAR#") && stars[it.kind])
      stars[it.kind].push({
        id: it.ref_id,
        label: it.label,
        extra: it.extra || null,
        saved_at: it.created_at,
      });
  }
  for (const k of STAR_KINDS)
    stars[k].sort((a, b) => (a.saved_at < b.saved_at ? 1 : -1));
  return { stars, pathway, quiz };
}

export async function setStar(userId, { kind, id, label, extra, on }) {
  const key = { pk: pk(userId), sk: `STAR#${kind.toUpperCase()}#${id}` };
  if (!on) {
    await client().send(new DeleteCommand({ TableName: TABLE, Key: key }));
    return;
  }
  const { stars } = await loadAll(userId);
  if (
    stars[kind].length >= STAR_LIMIT &&
    !stars[kind].some((s) => s.id === id)
  ) {
    const err = new Error(`You can save up to ${STAR_LIMIT}.`);
    err.status = 409;
    throw err;
  }
  const t = now();
  await client().send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        ...key,
        user_id: userId,
        kind,
        ref_id: id,
        label: cleanText(label),
        extra: extra && typeof extra === "object" ? cleanExtra(extra) : null,
        schema_version: SCHEMA_VERSION,
        created_at: stars[kind].find((s) => s.id === id)?.saved_at || t,
        updated_at: t,
      },
    })
  );
}

// extra: a few known fields only (a college card's AISHE code, a
// scholarship's deadline), never free text from the page
function cleanExtra(extra) {
  const out = {};
  if (isRefId(extra.aishe_code)) out.aishe_code = extra.aishe_code;
  const deadline = cleanText(extra.deadline, 40);
  if (deadline) out.deadline = deadline;
  const meta = cleanText(extra.meta, 80);
  if (meta) out.meta = meta;
  return Object.keys(out).length ? out : null;
}

/** The pathway: one target career, a few colleges and exams, a rank to aim. */
export function cleanPathway(p) {
  if (!p || typeof p !== "object") return null;
  const ref = (v) =>
    v && typeof v === "object" && isRefId(v.id)
      ? { id: v.id, label: cleanText(v.label) }
      : null;
  const list = (v, n) =>
    (Array.isArray(v) ? v : []).map(ref).filter(Boolean).slice(0, n);
  const rank = Number(p.target_rank);
  return {
    career: ref(p.career),
    colleges: list(p.colleges, PATHWAY_LIMITS.colleges),
    exams: list(p.exams, PATHWAY_LIMITS.exams),
    target_rank:
      Number.isInteger(rank) && rank > 0 && rank < 10_000_000 ? rank : null,
    target_rank_exam: isRefId(p.target_rank_exam) ? p.target_rank_exam : null,
  };
}

export async function savePathway(userId, pathway) {
  await putDoc(userId, "PATHWAY", pathway);
}

/** The career quiz: the answers (so the results page can be rebuilt) and the outcome. */
export function cleanQuiz(q) {
  if (!q || typeof q !== "object") return null;
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
  const ratings = {};
  for (const [k, v] of Object.entries(q.answers?.ratings || {}))
    if (/^\w{1,40}$/.test(k) && num(v) !== null) ratings[k] = num(v);
  // quiz subjects are names ("Economics / Accountancy")
  const ids = (v, n) =>
    (Array.isArray(v) ? v : [])
      .map(String)
      .filter((x) => /^[A-Za-z][A-Za-z /&.-]{0,40}$/.test(x))
      .slice(0, n);
  const tiePicks = {};
  for (const [k, v] of Object.entries(q.answers?.tiePicks || {}))
    if (/^\d{1,4}$/.test(k) && isRefId(String(v))) tiePicks[k] = String(v);
  const profile = {};
  for (const [k, v] of Object.entries(q.profile || {}))
    if (/^[RIASEC]$/.test(k) && num(v) !== null) profile[k] = num(v);
  return {
    quiz_version: cleanText(String(q.quiz_version || ""), 20),
    answers: {
      ratings,
      tieIds: (q.answers?.tieIds || [])
        .map(num)
        .filter((x) => x !== null)
        .slice(0, 20),
      tiePicks,
      picked: ids(q.answers?.picked, 10),
      ranked: ids(q.answers?.ranked, 10),
    },
    profile,
    top_careers: (Array.isArray(q.top_careers) ? q.top_careers : [])
      .filter((c) => c && isRefId(c.id))
      .slice(0, 10)
      .map((c) => ({ id: c.id, label: cleanText(c.label) })),
  };
}

export async function saveQuiz(userId, quiz) {
  await putDoc(userId, "QUIZ", quiz);
}

async function putDoc(userId, sk, data) {
  const t = now();
  await client().send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        pk: pk(userId),
        sk,
        user_id: userId,
        data,
        schema_version: SCHEMA_VERSION,
        created_at: t,
        updated_at: t,
      },
    })
  );
}

/** "Delete my saved data": every item in the student's partition. */
export async function deleteAll(userId) {
  const out = await client().send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": pk(userId) },
      ProjectionExpression: "pk, sk",
    })
  );
  const keys = out.Items || [];
  for (let i = 0; i < keys.length; i += 25) {
    await client().send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE]: keys.slice(i, i + 25).map((Key) => ({
            DeleteRequest: { Key },
          })),
        },
      })
    );
  }
}
