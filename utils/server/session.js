import { SignJWT, jwtVerify } from "jose";

// Futures' own login: after portal-backend vouches for a launch token once,
// Futures sets this signed, httpOnly cookie. Every save checks it; the
// browser can't forge it or read it. 30 days, so a student on their own
// phone stays signed in; "Sign out" clears it (shared lab computers).

const COOKIE = "futures_session";
const MAX_AGE = 30 * 24 * 60 * 60;

function secret() {
  const s = process.env.FUTURES_SESSION_SECRET;
  if (!s) throw new Error("FUTURES_SESSION_SECRET is not set");
  return new TextEncoder().encode(s);
}

function cookieHeader(value, maxAge) {
  const parts = [
    `${COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

/** Sign the profile into the session cookie. */
export async function startSession(res, profile) {
  const token = await new SignJWT({ profile })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(profile.user_id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  res.setHeader("Set-Cookie", cookieHeader(token, MAX_AGE));
}

export function endSession(res) {
  res.setHeader("Set-Cookie", cookieHeader("", 0));
}

/** The signed-in student's profile, or null. */
export async function readSession(req) {
  const raw = req.cookies?.[COOKIE];
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, secret(), {
      algorithms: ["HS256"],
    });
    const profile = payload.profile;
    if (!profile || profile.user_id !== payload.sub) return null;
    return profile;
  } catch {
    return null;
  }
}
