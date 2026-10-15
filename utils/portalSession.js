import { useEffect, useState } from "react";

// The Avanti portal sends a student here with a short-lived launch token.
// Futures' server checks it once with portal-backend and starts its own
// session cookie (pages/api/session.js), which is what lets a student save
// things; the small profile below is kept in localStorage for pre-filling.
// Nothing here gates a page.

const PROFILE_KEY = "futures_student_profile";
const CHANGE_EVENT = "futures-profile-change";

// Avanti students sign in through the portal, which sends them back here with a launch token.
export const PORTAL_LOGIN_URL =
  process.env.NEXT_PUBLIC_PORTAL_LOGIN_URL ||
  "https://auth.avantifellows.org/?platform=futures&authGroup=EnableStudents";

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

// everything Futures remembers about the current student; logout (or a
// different student signing in) must wipe all of it, not just the profile —
// a mock allotment run left behind shows the next student someone else's list
export const STUDENT_STATE_KEYS = [
  "josaaMockAllotmentState_v2",
  "mhtcetMockAllotmentState_v1",
  "mockAllotmentExamChoice_v1",
];
const STUDENT_SESSION_KEYS = ["quizState2"];

export function clearStudentState() {
  if (!isBrowser()) return;
  try {
    for (const k of STUDENT_STATE_KEYS) window.localStorage.removeItem(k);
    for (const k of STUDENT_SESSION_KEYS) window.sessionStorage.removeItem(k);
  } catch {
    // ignore
  }
}

export function clearProfile() {
  if (!isBrowser()) return;
  clearStudentState();
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

/** Hand a portal launch token to Futures' server, which checks it with
 * portal-backend and starts the session cookie; keep the profile for pages. */
export async function consumeLaunchToken(token) {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ launchToken: token }),
  });
  if (!response.ok) return null;
  const { profile } = await response.json();
  if (!profile) return null;

  // a different student signing in on a shared lab computer: drop the
  // previous student's runs before storing the new profile
  const previous = readProfile();
  if (previous && previous.user_id !== profile.user_id) clearStudentState();

  saveProfile({ ...profile, saved_at: new Date().toISOString() });
  return profile;
}

/** Sign out: the session cookie and everything kept in this browser. */
export async function signOut() {
  clearProfile();
  try {
    await fetch("/api/session", { method: "DELETE" });
  } catch {
    // offline: the profile is gone from this browser either way
  }
}

/** On load: a profile in this browser without a live session (signed in
 * before saving existed, or the cookie expired) is dropped, so the site
 * never shows a student as signed in when their saves would fail. */
export async function syncSession() {
  if (!readProfile()) return;
  try {
    const response = await fetch("/api/session");
    if (!response.ok) return;
    const { profile } = await response.json();
    if (!profile) clearProfile();
  } catch {
    // offline: keep what we have
  }
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
    : findLabel(options, (label) => /^(male|gender-neutral)/i.test(label));
}

function homeStateLabel(storedState, options) {
  if (!storedState) return null;
  const exact = findLabel(
    options,
    (label) => label.toLowerCase() === storedState.toLowerCase()
  );
  if (exact) return exact;
  // "Outside Delhi" / "Outside Maharashtra" — only for a student who really
  // is from outside that state. A Maharashtra student's MHT-CET home
  // university isn't on the profile, so it stays blank for them to pick.
  return findLabel(options, (label) => {
    const m = label.match(/^outside (.+)$/i);
    return m && m[1].trim().toLowerCase() !== storedState.toLowerCase();
  });
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
