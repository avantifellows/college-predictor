import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowRight } from "lucide-react";
import BackLink from "../components/BackLink";
import { RunByTag, loadExams } from "../components/examShared";
import useGetStarted, { useRecordUse } from "../utils/useGetStarted";
import { cutoffsHref, examsOf } from "../utils/onboarding";
import {
  COLLEGE_PREFS,
  PLACE_PREFS,
  backupExams,
  chanceText,
  fieldOptions,
  finderStream,
  peopleCount,
} from "../utils/backupFinder";

// The plan's backup step: three quick questions, then the five exams that
// fit, most applicants first, each with its page and (where Futures has
// them) its cutoffs. Stream, state and main exams come from Get started;
// /backup-exams?stream=pcm&state=Bihar works without them.

function Chip({ o, on, onPick }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={on}
      className={`rounded-xl px-3.5 py-2.5 text-left transition hover:border-[#B52326] ${
        on
          ? "border-2 border-[#B52326] bg-[#fdf1ef]"
          : "border-[1.5px] border-[#eaded8] bg-white"
      }`}
    >
      <span className="block text-[15px] font-bold leading-tight text-[#2f2320]">
        {o.label}
      </span>
      {o.sub ? (
        <span className="mt-0.5 block text-xs text-[#7a635d]">{o.sub}</span>
      ) : null}
    </button>
  );
}

function Question({ title, options, value, onPick }) {
  return (
    <fieldset className="mt-6">
      <legend className="text-[15px] font-black text-[#2f2320]">{title}</legend>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip
            key={o.id}
            o={o}
            on={value === o.id}
            onPick={() => onPick(o.id)}
          />
        ))}
      </div>
    </fieldset>
  );
}

export default function BackupExams() {
  const router = useRouter();
  const { query, isReady } = router;
  const { answers } = useGetStarted();
  const [exams, setExams] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadExams()
      .then(setExams)
      .catch(() => setFailed(true));
  }, []);

  const str = (v) => (typeof v === "string" && v ? v : undefined);
  const stream = str(query.stream) || answers?.stream;
  const state = str(query.state) || answers?.state;
  const pick = {
    college: str(query.college),
    place: str(query.place),
    field: str(query.field),
  };
  const fields = fieldOptions(stream);
  const set = (key, value) =>
    router.replace(
      { pathname: router.pathname, query: { ...query, [key]: value } },
      undefined,
      { shallow: true, scroll: false }
    );

  // the exams the student already takes are never their backup
  const mainKeys = examsOf(answers).filter((k) => k !== "unsure");
  const results = useMemo(() => {
    if (!exams) return null;
    const mainIds = exams
      .filter((e) => e.predictor_exam && mainKeys.includes(e.predictor_exam))
      .map((e) => e.exam_id);
    return backupExams(exams, { ...pick, state }, mainIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exams, pick.college, pick.place, pick.field, state, mainKeys.join()]);
  const ready = !!(pick.college && pick.place && pick.field);
  useRecordUse("backup-finder", ready && !!results?.length);

  return (
    <>
      <Head>
        <title>Backup exams - Futures</title>
      </Head>
      <div className="min-h-screen bg-[#fdf8f6] px-4 pb-16 pt-8">
        <div className="mx-auto max-w-[560px]">
          <BackLink />
          <h1 className="mt-4 text-[26px] font-black leading-tight text-[#2f2320]">
            Find your backup exams
          </h1>

          {isReady && !finderStream(stream) ? (
            <p className="mt-3 text-[15px] text-[#7a635d]">
              <Link href="/exams" className="font-bold text-[#B52326]">
                See all entrance exams
              </Link>
            </p>
          ) : (
            <>
              <Question
                title="Do you prefer a public or private college?"
                options={COLLEGE_PREFS}
                value={pick.college}
                onPick={(v) => set("college", v)}
              />
              <Question
                title={
                  state
                    ? `A college in ${state}, or a national level college?`
                    : "A college in your state, or a national level college?"
                }
                options={PLACE_PREFS(state)}
                value={pick.place}
                onPick={(v) => set("place", v)}
              />
              <Question
                title="Which stream do you want as a backup?"
                options={fields}
                value={pick.field}
                onPick={(v) => set("field", v)}
              />
            </>
          )}

          {ready ? (
            <section className="mt-8">
              <h2 className="text-lg font-black text-[#2f2320]">
                Exams to consider
              </h2>
              {failed ? (
                <p className="mt-2 text-sm text-[#7a635d]">
                  Couldn&apos;t load the exams. Try again in a moment.
                </p>
              ) : !results ? (
                <p className="mt-2 text-sm text-[#7a635d]">Loading…</p>
              ) : !results.length ? (
                <p className="mt-2 text-sm text-[#7a635d]">
                  No exams match. Try &ldquo;Either&rdquo; or &ldquo;No
                  preference&rdquo;.
                </p>
              ) : (
                <ol className="mt-3 flex flex-col gap-2.5">
                  {results.map((e, i) => (
                    <li
                      key={e.exam_id}
                      className="rounded-xl border-[1.5px] border-[#eaded8] bg-white px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f6ece9] text-xs font-black text-[#7a635d]">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/exams/${e.exam_id}`}
                            className="font-black text-[#2f2320] hover:text-[#B52326]"
                          >
                            {e.acronym || e.name}
                          </Link>{" "}
                          <RunByTag e={e} />
                          {e.applicants?.count ? (
                            <p className="mt-0.5 text-[13px] text-[#7a635d]">
                              {peopleCount(e.applicants.count)} applied in{" "}
                              {e.applicants.year}
                              {chanceText(e.acceptance?.pct)
                                ? ` · ${chanceText(
                                    e.acceptance.pct
                                  )} got a seat`
                                : ""}
                            </p>
                          ) : null}
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold">
                            <Link
                              href={`/exams/${e.exam_id}`}
                              className="inline-flex items-center gap-1 text-[#B52326]"
                            >
                              About the exam <ArrowRight size={14} />
                            </Link>
                            {e.predictor_exam ? (
                              <Link
                                href={cutoffsHref(e.predictor_exam, state)}
                                className="inline-flex items-center gap-1 text-[#B52326]"
                              >
                                See cutoffs <ArrowRight size={14} />
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
