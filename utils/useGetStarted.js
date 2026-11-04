import { useCallback, useEffect, useMemo, useState } from "react";
import { answersFromProfile, cleanAnswers, complete } from "./onboarding";
import { useStudentData } from "./studentData";

// The Get started answers for whoever is here (utils/onboarding.js). A
// guest's live in this browser; a signed-in student's in their account.

export const GET_STARTED_KEY = "futures_get_started_v1";
const CHANGE = "futures-get-started-change";

const readLocal = () => {
  try {
    const raw = window.localStorage.getItem(GET_STARTED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const writeLocal = (a) => {
  try {
    if (a) window.localStorage.setItem(GET_STARTED_KEY, JSON.stringify(a));
    else window.localStorage.removeItem(GET_STARTED_KEY);
    window.dispatchEvent(new Event(CHANGE));
  } catch {
    // storage unavailable: the flow still works for this visit
  }
};

/**
 * The student's answers and how to change them. `answers` is null while
 * loading; `source` says where they came from: "saved" (answered here),
 * "profile" (signed in, not answered yet: their Avanti profile) or "none".
 */
export default function useGetStarted() {
  const { signedIn, profile, loaded, onboarding, saveOnboarding } =
    useStudentData();
  const [local, setLocal] = useState(undefined);

  useEffect(() => {
    const refresh = () => setLocal(readLocal());
    refresh();
    window.addEventListener(CHANGE, refresh);
    return () => window.removeEventListener(CHANGE, refresh);
  }, []);

  const fromProfile = useMemo(() => answersFromProfile(profile), [profile]);

  let answers = null;
  let source = "none";
  if (local !== undefined && (!signedIn || loaded)) {
    if (signedIn && onboarding) {
      answers = onboarding;
      source = "saved";
    } else if (local) {
      // a guest's answers; a student who answered before signing in keeps them
      answers = signedIn ? { ...fromProfile, ...local } : local;
      source = "saved";
    } else if (signedIn && complete(fromProfile)) {
      answers = fromProfile;
      source = "profile";
    } else {
      answers = signedIn ? fromProfile : {};
    }
  }

  const save = useCallback(
    (a) => {
      const clean = cleanAnswers(a);
      if (signedIn) {
        saveOnboarding(clean);
        writeLocal(null); // the account holds them now
      } else writeLocal(clean);
    },
    [signedIn, saveOnboarding]
  );

  // a step opened from the plan counts as done
  const markDone = useCallback(
    (id) => {
      if (!answers || (answers.done || []).includes(id)) return;
      save({ ...answers, done: [...(answers.done || []), id] });
    },
    [answers, save]
  );

  return { answers, source, signedIn, save, markDone };
}
