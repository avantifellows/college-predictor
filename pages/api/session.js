import { verifyLaunchToken } from "../../utils/portalProfile";
import {
  endSession,
  readSession,
  startSession,
} from "../../utils/server/session";

// POST   { launchToken }  portal-backend vouches for it once -> session cookie
// GET                     who is signed in (profile) or { profile: null }
// DELETE                  sign out
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") {
    return res.status(200).json({ profile: await readSession(req) });
  }
  if (req.method === "DELETE") {
    endSession(res);
    return res.status(200).json({ profile: null });
  }
  if (req.method === "POST") {
    const token = req.body?.launchToken;
    if (typeof token !== "string" || token.length > 4096) {
      return res.status(400).json({ error: "launchToken required" });
    }
    let profile = null;
    try {
      profile = await verifyLaunchToken(token);
    } catch {
      return res
        .status(502)
        .json({ error: "Could not reach the Avanti portal" });
    }
    if (!profile)
      return res.status(401).json({ error: "Invalid launch token" });
    await startSession(res, profile);
    return res.status(200).json({ profile });
  }
  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).end();
}
