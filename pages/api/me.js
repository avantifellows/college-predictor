import { readSession } from "../../utils/server/session";
import {
  STAR_KINDS,
  cleanPathway,
  cleanQuiz,
  deleteAll,
  isRefId,
  loadAll,
  savePathway,
  saveQuiz,
  setStar,
} from "../../utils/server/saves";

// The signed-in student's saved things. The user id always comes from the
// session cookie, never from the request.
//   GET                                   { profile, stars, pathway, quiz }
//   POST { action: "star", kind, id, label, extra, on }
//   POST { action: "pathway", pathway }
//   POST { action: "quiz", quiz }
//   DELETE                                delete everything saved
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const profile = await readSession(req);
  if (!profile) return res.status(401).json({ error: "Sign in to save" });
  const uid = profile.user_id;

  try {
    if (req.method === "GET") {
      return res.status(200).json({ profile, ...(await loadAll(uid)) });
    }
    if (req.method === "DELETE") {
      await deleteAll(uid);
      return res.status(200).json({ ok: true });
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST, DELETE");
      return res.status(405).end();
    }

    const body = req.body || {};
    if (body.action === "star") {
      if (!STAR_KINDS.includes(body.kind) || !isRefId(body.id)) {
        return res.status(400).json({ error: "Unknown item" });
      }
      await setStar(uid, { ...body, on: body.on !== false });
      return res.status(200).json({ ok: true });
    }
    if (body.action === "pathway") {
      const pathway = cleanPathway(body.pathway);
      if (!pathway) return res.status(400).json({ error: "Bad pathway" });
      await savePathway(uid, pathway);
      return res.status(200).json({ pathway });
    }
    if (body.action === "quiz") {
      const quiz = cleanQuiz(body.quiz);
      if (!quiz) return res.status(400).json({ error: "Bad quiz result" });
      await saveQuiz(uid, quiz);
      return res.status(200).json({ quiz });
    }
    return res.status(400).json({ error: "Unknown action" });
  } catch (e) {
    return res
      .status(e.status || 500)
      .json({ error: e.status ? e.message : "Could not save right now" });
  }
}
