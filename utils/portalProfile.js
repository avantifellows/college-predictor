// The small profile Futures keeps for a signed-in Avanti student, built from
// portal-backend's /auth/verify answer. Pure: runs on the server (the login
// route) and nowhere needs the browser.

export const PORTAL_BACKEND_URL = (
  process.env.NEXT_PUBLIC_PORTAL_BACKEND_URL ||
  "https://uza9ixusuh.execute-api.ap-south-1.amazonaws.com"
).replace(/\/$/, "");

const GRADE_ID_TO_CLASS = {
  1: 9,
  2: 10,
  3: 11,
  4: 12,
  5: 13,
  6: 6,
  7: 7,
  8: 8,
};

/** The profile for a verified launch token, or null if it isn't one for Futures. */
export function profileFromVerify(payload) {
  const data = payload?.data || {};
  if (data.aud !== "futures") return null;

  const user = data.profile?.user || {};
  const student = data.profile?.student || {};
  const userId = data.user_id || payload?.id;
  if (!userId) return null;

  const name = [user.first_name, user.last_name]
    .filter((part) => part && part.trim() && part.trim() !== ".")
    .join(" ")
    .trim();

  return {
    user_id: String(userId),
    display_id: data.display_id || null,
    group: data.group || null,
    name: name || null,
    gender: user.gender || null,
    state: user.state || null,
    category: student.category || null,
    stream: student.stream || null,
    class: GRADE_ID_TO_CLASS[student.grade_id] ?? null,
  };
}

/** Ask portal-backend whether a launch token is genuine; the profile or null. */
export async function verifyLaunchToken(token) {
  const response = await fetch(`${PORTAL_BACKEND_URL}/auth/verify`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) return null;
  return profileFromVerify(await response.json());
}
