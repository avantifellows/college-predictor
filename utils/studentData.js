import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { clearProfile, useStudentProfile } from "./portalSession";

// What a signed-in student has saved (stars, pathway, quiz result), loaded
// once from /api/me and shared by every page. Changes show at once and are
// rolled back if the save fails. Signed out, every helper is a no-op and
// `signedIn` is false, so pages render exactly as before.

const EMPTY_STARS = { college: [], career: [], exam: [], scholarship: [] };
const Ctx = createContext(null);

async function post(body) {
  const r = await fetch("/api/me", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (r.status === 401) {
    clearProfile(); // the session is gone: show the student as signed out
    throw new Error("signed-out");
  }
  if (!r.ok)
    throw new Error((await r.json().catch(() => ({}))).error || "save failed");
  return r.json();
}

export function StudentDataProvider({ children }) {
  const profile = useStudentProfile();
  const userId = profile?.user_id || null;
  const [data, setData] = useState({
    loaded: false,
    stars: EMPTY_STARS,
    pathway: null,
    quiz: null,
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setData({ loaded: false, stars: EMPTY_STARS, pathway: null, quiz: null });
      return;
    }
    let live = true;
    fetch("/api/me")
      .then(async (r) => {
        if (r.status === 401) {
          clearProfile();
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((d) => {
        if (!live || !d) return;
        setData({
          loaded: true,
          stars: { ...EMPTY_STARS, ...d.stars },
          pathway: d.pathway,
          quiz: d.quiz,
        });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [userId]);

  const isStarred = useCallback(
    (kind, id) => (data.stars[kind] || []).some((s) => s.id === id),
    [data.stars]
  );

  const toggleStar = useCallback(
    async (kind, id, label, extra = null) => {
      if (!userId) return;
      const on = !(data.stars[kind] || []).some((s) => s.id === id);
      const before = data.stars;
      setData((d) => ({
        ...d,
        stars: {
          ...d.stars,
          [kind]: on
            ? [
                { id, label, extra, saved_at: new Date().toISOString() },
                ...d.stars[kind],
              ]
            : d.stars[kind].filter((s) => s.id !== id),
        },
      }));
      try {
        await post({ action: "star", kind, id, label, extra, on });
        setError(null);
      } catch (e) {
        setData((d) => ({ ...d, stars: before }));
        if (e.message !== "signed-out") setError(e.message);
      }
    },
    [userId, data.stars]
  );

  const savePathway = useCallback(
    async (patch) => {
      if (!userId) return;
      const before = data.pathway;
      const next = { ...(data.pathway || {}), ...patch };
      setData((d) => ({ ...d, pathway: next }));
      try {
        const out = await post({ action: "pathway", pathway: next });
        setData((d) => ({ ...d, pathway: out.pathway }));
        setError(null);
      } catch (e) {
        setData((d) => ({ ...d, pathway: before }));
        if (e.message !== "signed-out") setError(e.message);
      }
    },
    [userId, data.pathway]
  );

  const saveQuiz = useCallback(
    async (quiz) => {
      if (!userId) return false;
      try {
        const out = await post({ action: "quiz", quiz });
        setData((d) => ({
          ...d,
          quiz: { ...out.quiz, saved_at: new Date().toISOString() },
        }));
        return true;
      } catch (e) {
        if (e.message !== "signed-out") setError(e.message);
        return false;
      }
    },
    [userId]
  );

  const deleteEverything = useCallback(async () => {
    if (!userId) return;
    const r = await fetch("/api/me", { method: "DELETE" });
    if (r.ok)
      setData({ loaded: true, stars: EMPTY_STARS, pathway: null, quiz: null });
  }, [userId]);

  const value = useMemo(
    () => ({
      signedIn: Boolean(userId),
      profile,
      loaded: data.loaded,
      stars: data.stars,
      pathway: data.pathway,
      quiz: data.quiz,
      error,
      isStarred,
      toggleStar,
      savePathway,
      saveQuiz,
      deleteEverything,
    }),
    [
      userId,
      profile,
      data,
      error,
      isStarred,
      toggleStar,
      savePathway,
      saveQuiz,
      deleteEverything,
    ]
  );
  return React.createElement(Ctx.Provider, { value }, children);
}

export function useStudentData() {
  return (
    useContext(Ctx) || {
      signedIn: false,
      loaded: false,
      stars: EMPTY_STARS,
      pathway: null,
      quiz: null,
      isStarred: () => false,
      toggleStar: () => {},
      savePathway: () => {},
      saveQuiz: async () => false,
      deleteEverything: () => {},
    }
  );
}

/** Scholarships have no id in their sheet: a slug of the name stands in. */
export const scholarshipId = (name) =>
  String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
