import { useEffect, useState } from "react";

// Futures never holds a login of its own. The Avanti portal sends a student
// here with a short-lived launch token; we verify it once, keep the small
// profile below in localStorage, and drop the token. Nothing here gates a page.

const PROFILE_KEY = "futures_student_profile";
const CHANGE_EVENT = "futures-profile-change";

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

// stream stored on the student record -> the predictor exam to open first
export const STREAM_TO_EXAM = {
  engineering: "JoSAA",
  medical: "NEETUG",
  clat: "CLAT",
};

export const CLASS_OPTIONS = [9, 10, 11, 12, 13].map((n) => ({
  value: n,
  label: n === 13 ? "Dropper / gap year" : `Class ${n}`,
}));
export const STREAM_OPTIONS = [
  { value: "engineering", label: "Engineering" },
  { value: "medical", label: "Medical" },
  { value: "clat", label: "Law (CLAT)" },
  { value: "ca", label: "Commerce / CA" },
  { value: "foundation", label: "Foundation (Class 9-10)" },
];

const isBrowser = () => typeof window !== "undefined";

export function readProfile() {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // storage unavailable (private mode); the page still works without it
  }
}

export function clearProfile() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(PROFILE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // ignore
  }
}

export function useStudentProfile() {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    const refresh = () => setProfile(readProfile());
    refresh();
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return profile;
}

/** Verify a portal launch token and store the student's profile. */
export async function consumeLaunchToken(token) {
  const response = await fetch(`${PORTAL_BACKEND_URL}/auth/verify`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) return null;

  const payload = await response.json();
  const data = payload?.data || {};
  if (data.aud !== "futures") return null;

  const user = data.profile?.user || {};
  const student = data.profile?.student || {};
  const userId = data.user_id || payload.id;
  if (!userId) return null;

  const name = [user.first_name, user.last_name]
    .filter((part) => part && part.trim() && part.trim() !== ".")
    .join(" ")
    .trim();

  const profile = {
    user_id: String(userId),
    display_id: data.display_id || null,
    group: data.group || null,
    name: name || null,
    gender: user.gender || null,
    state: user.state || null,
    category: student.category || null,
    stream: student.stream || null,
    class: GRADE_ID_TO_CLASS[student.grade_id] ?? null,
    saved_at: new Date().toISOString(),
  };
  saveProfile(profile);
  return profile;
}

const optionLabel = (option) =>
  typeof option === "string" ? option : option?.label;

const findLabel = (options, predicate) => {
  for (const option of options || []) {
    const label = optionLabel(option);
    if (label && predicate(label)) return label;
  }
  return null;
};

const CATEGORY_CANDIDATES = {
  gen: ["OPEN", "General", "GEN", "Open", "UR", "GM"],
  "gen-ews": ["EWS", "GEN-EWS", "Gen-EWS"],
  obc: ["OBC-NCL", "OBC", "OBC (NCL)", "BC"],
  sc: ["SC"],
  st: ["ST"],
};

function categoryLabel(storedCategory, options) {
  if (!storedCategory) return null;
  const raw = String(storedCategory).trim();
  const pwd = /^pwd-/i.test(raw);
  const base = raw.replace(/^pwd-/i, "").toLowerCase();
  const candidates = CATEGORY_CANDIDATES[base] || [raw];
  const same = (a, b) => a.toLowerCase() === b.toLowerCase();

  if (pwd) {
    const withPwd = findLabel(options, (label) =>
      candidates.some(
        (c) =>
          /pwd/i.test(label) && label.toLowerCase().startsWith(c.toLowerCase())
      )
    );
    if (withPwd) return withPwd;
  }
  return findLabel(
    options,
    (label) => !/pwd/i.test(label) && candidates.some((c) => same(label, c))
  );
}

function genderLabel(storedGender, options) {
  if (!storedGender) return null;
  const female = /^f/i.test(storedGender);
  return female
    ? findLabel(options, (label) => /^female/i.test(label))
    : findLabel(options, (label) => /^gender-neutral/i.test(label));
}

function homeStateLabel(storedState, options) {
  if (!storedState) return null;
  const exact = findLabel(
    options,
    (label) => label.toLowerCase() === storedState.toLowerCase()
  );
  if (exact) return exact;
  // JAC-style "Delhi" / "Outside Delhi"
  return findLabel(options, (label) => /^outside /i.test(label));
}

/** Predictor form defaults (option labels) for the fields an exam actually has. */
export function profileDefaultsForFields(profile, fields) {
  if (!profile || !Array.isArray(fields)) return {};
  const defaults = {};
  for (const field of fields) {
    if (field.dynamicOptionsByHomeState) continue;
    let label = null;
    if (field.name === "category")
      label = categoryLabel(profile.category, field.options);
    else if (field.name === "gender")
      label = genderLabel(profile.gender, field.options);
    else if (field.name === "homeState")
      label = homeStateLabel(profile.state, field.options);
    if (label) defaults[field.name] = label;
  }
  return defaults;
}
