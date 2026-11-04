import React, { useEffect, useRef, useState } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { ArrowLeft } from "lucide-react";
import { STATES } from "../components/examShared";
import {
  CLASSES,
  STREAMS,
  answered,
  examOptions,
  nextStep,
  stepsFor,
  withAnswer,
} from "../utils/onboarding";
import useGetStarted from "../utils/useGetStarted";
import { previousPage } from "../utils/navHistory";

const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

// Get started: one question per screen, each its own URL (?step=class |
// stream | exam), so the browser's Back and this page's Back agree. The
// answers are kept only when the last question is answered (or Skip is
// pressed); the homepage then shows the plan (utils/onboarding.js planFor).
// A signed-in student sees their Avanti profile's answers already picked.

const QUESTIONS = {
  class: { tag: "About you", title: "Which class are you in?" },
  stream: { tag: "Your stream", title: "Which stream have you chosen?" },
  exam: { tag: "Your exam", title: "Which exam are you preparing for?" },
};

function Option({ label, sub, on, onPick }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={on}
      className={`flex w-full items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-left transition hover:border-[#B52326] ${
        on
          ? "border-2 border-[#B52326] shadow-[0_6px_18px_rgba(181,35,38,.10)]"
          : "border-[1.5px] border-[#eaded8]"
      }`}
    >
      <span>
        <span className="block font-bold text-[#2f2320]">{label}</span>
        {sub ? (
          <span className="mt-0.5 block text-[13px] text-[#7a635d]">{sub}</span>
        ) : null}
      </span>
      <span
        aria-hidden
        className={`h-5 w-5 shrink-0 rounded-full bg-white ${
          on
            ? "border-[6px] border-[#B52326]"
            : "border-[1.5px] border-[#decac3]"
        }`}
      />
    </button>
  );
}

export default function GetStarted() {
  const router = useRouter();
  const { answers, save } = useGetStarted();
  const [draft, setDraft] = useState(null);
  const timer = useRef(null);

  // start from what we already know (saved answers or the Avanti profile)
  useEffect(() => {
    if (answers && draft === null) {
      const { skipped, ...rest } = answers;
      setDraft(rest);
    }
  }, [answers, draft]);
  useEffect(() => () => clearTimeout(timer.current), []);
  // each question opens at the top (a shallow route change keeps the scroll)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [router.query.step]);

  const asked = String(router.query.step || "class");
  const steps = draft ? stepsFor(draft) : ["class"];
  // a step this student isn't asked yet (a bookmarked ?step=exam): the first
  // one still unanswered
  const step = (() => {
    if (!draft) return asked;
    const i = steps.indexOf(asked);
    if (i < 0) return steps.find((s) => !answered(s, draft)) || "class";
    const gap = steps.slice(0, i).find((s) => !answered(s, draft));
    return gap || asked;
  })();
  useEffect(() => {
    if (draft && router.isReady && step !== asked)
      router.replace({ query: { step } }, undefined, { shallow: true });
  }, [draft, step, asked, router]);

  const finish = (a) => {
    const before = answers || {};
    // a different class or exam is a different plan: its steps start fresh
    const same = before.cls === a.cls && before.exam === a.exam;
    save({ ...a, skipped: undefined, done: same ? a.done || [] : [] });
    router.push("/");
  };
  const advance = (a) => {
    const nxt = nextStep(step, a);
    if (nxt)
      router.push({ query: { step: nxt } }, undefined, {
        shallow: true,
        scroll: true,
      });
    else finish(a);
  };
  const pick = (key, value, auto) => {
    const a = withAnswer(draft, key, value);
    setDraft(a);
    clearTimeout(timer.current);
    if (auto) timer.current = setTimeout(() => advance(a), 180);
  };

  const back = () => {
    const i = steps.indexOf(step);
    const prev = i > 0 ? steps[i - 1] : null;
    const from = previousPage();
    const fromHere = (s) =>
      from &&
      from.path.startsWith("/get-started") &&
      (from.path.includes(`step=${s}`) ||
        (s === "class" && !from.path.includes("step=")));
    if (prev) {
      if (fromHere(prev)) router.back();
      else
        router.replace({ query: { step: prev } }, undefined, { shallow: true });
    } else if (from) router.back();
    else router.push("/");
  };
  const skip = () => {
    const a = draft || {};
    clearTimeout(timer.current);
    // nothing answered: the homepage's "I want to …" chooser; otherwise a
    // plan from what was answered (no exam yet: interests first)
    if (a.cls) return finish(a);
    save({ skipped: true });
    router.push("/");
  };

  const Q = QUESTIONS[step] || QUESTIONS.class;
  const ok = draft && answered(step, draft);
  const at = steps.indexOf(step);

  let body = null;
  if (draft && step === "class") {
    body = CLASSES.map((c) => (
      <Option
        key={c.id}
        label={c.label}
        sub={c.sub}
        on={draft.cls === c.id}
        onPick={() => pick("cls", c.id, true)}
      />
    ));
  } else if (draft && step === "stream") {
    body = (
      <>
        {STREAMS.map((s) => (
          <Option
            key={s.id}
            label={s.label}
            sub={s.sub}
            on={draft.stream === s.id}
            onPick={() => pick("stream", s.id, false)}
          />
        ))}
        <label className="mt-3 block">
          <span className="mb-1.5 block text-sm font-bold text-[#4a3a36]">
            Your state
          </span>
          <Dropdown
            options={STATES.map((s) => ({ value: s, label: s }))}
            selectedValue={draft.state || null}
            onChange={(o) => pick("state", o.value, false)}
            placeholder="Select your state"
            hideValueWhileSearching
          />
        </label>
      </>
    );
  } else if (draft && step === "exam") {
    body = examOptions(draft.stream, draft.state).map((o) => (
      <Option
        key={o.id}
        label={o.label}
        sub={o.sub}
        on={draft.exam === o.id}
        onPick={() => pick("exam", o.id, true)}
      />
    ));
  }

  return (
    <>
      <Head>
        <title>Get started - Futures</title>
        <meta
          name="description"
          content="A few quick questions, then a plan of what to do next: careers, exams, colleges and scholarships."
        />
      </Head>
      <div className="min-h-screen bg-[#fdf8f6] px-4 pb-16 pt-8">
        <div className="mx-auto max-w-[460px]">
          <div className="flex items-center justify-between text-sm font-semibold text-[#5c4a45]">
            <button
              type="button"
              onClick={back}
              className="inline-flex items-center gap-1.5 hover:text-[#B52326]"
            >
              <ArrowLeft size={15} /> Back
            </button>
            <button
              type="button"
              onClick={skip}
              className="hover:text-[#B52326]"
            >
              Skip
            </button>
          </div>
          <div className="mt-4 flex gap-1.5" aria-hidden>
            {steps.map((s, i) => (
              <span
                key={s}
                className={`h-1 flex-1 rounded-full ${
                  i <= at ? "bg-[#B52326]" : "bg-[#f1e2dd]"
                }`}
              />
            ))}
          </div>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.08em] text-[#B52326]">
            {Q.tag}
          </p>
          <h1 className="mt-1.5 text-[26px] font-black leading-tight text-[#2f2320]">
            {Q.title}
          </h1>
          <div className="mt-5 flex flex-col gap-2.5">{body}</div>
          {draft && (step === "stream" || ok) ? (
            <button
              type="button"
              disabled={!ok}
              onClick={() => advance(draft)}
              className={`mt-5 w-full rounded-xl py-3 text-base font-black text-white transition ${
                ok
                  ? "bg-[#B52326] hover:bg-[#9E1F22]"
                  : "cursor-not-allowed bg-[#d9c4be]"
              }`}
            >
              {nextStep(step, draft) ? "Continue" : "See my plan"}
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}
