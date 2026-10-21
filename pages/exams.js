import StarButton from "../components/StarButton";
import { useStudentData } from "../utils/studentData";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { ChevronDown, ChevronRight, ChevronUp, Search } from "lucide-react";
import BackLink from "../components/BackLink";
import {
  Dash,
  RunByTag,
  STATES,
  isAllIndia,
  loadExams,
} from "../components/examShared";
import { rememberList, rememberTyped, wasTyped } from "../utils/listReturn";
import { markForward } from "../utils/navHistory";
import { matchesQuery, plainText } from "../utils/search";
import useUrlParams from "../utils/useUrlParams";
import { useStudentProfile } from "../utils/portalSession";
import { loadCareers } from "../components/careerShared";

// The shared searchable dropdown — same component as every other page.
const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

// The Exams tab: one row per entrance exam, the answer to "which exams even
// exist for what I want to study". Pure information display — the predictor
// stays the tool for "which college do I get", and rows that have a predictor
// link out to it. Replaced exams (BHU-UET → CUET) are not rows: their names
// are search aliases on the successor, so a student who types the old name
// still lands somewhere useful.

const PAGE_SIZE = 30;

/** One exam in the list; the whole row opens its page. */
const ExamRow = ({ e, index, onOpen, starCol }) => (
  <tr
    onClick={onOpen}
    className={`cursor-pointer border-b border-[#eaded8] text-xs transition hover:bg-[#fbeeec] sm:text-sm ${
      index % 2 === 0 ? "bg-[#fffdfa]" : "bg-white"
    }`}
  >
    {starCol ? (
      <td
        className="w-10 py-2 pl-2 align-top"
        onClick={(e) => e.stopPropagation()}
      >
        <StarButton compact kind="exam" id={e.exam_id} label={e.name} />
      </td>
    ) : null}
    <td className="px-3 py-3 align-top">
      <Link
        href={`/exams/${e.exam_id}`}
        onClick={(ev) => ev.stopPropagation()}
        className="font-semibold text-[#332724] hover:text-[#8f2e31]"
      >
        {e.name}
      </Link>
      <div className="mt-0.5 text-[11px] text-[#6d5550]">
        {e.scope_state && e.scope_type === "University"
          ? `${e.scope} · ${e.scope_state}`
          : !["All India", "University"].includes(e.scope_type) && isAllIndia(e)
          ? // open to all, though its colleges sit in one state (COMEDK)
            `Colleges in ${e.scope}`
          : e.scope}
      </div>
    </td>
    <td className="px-3 py-3 align-top">
      <RunByTag e={e} />
    </td>
    <td className="hidden max-w-[16rem] px-3 py-3 align-top lg:table-cell">
      {e.eligibility ? (
        <span className="line-clamp-2 text-[#5b3a34]">{e.eligibility}</span>
      ) : (
        <Dash />
      )}
    </td>
    <td className="hidden px-3 py-3 align-top tabular-nums sm:table-cell">
      {/* when forms open; the sheet's own words when it names no month
          ("After JEE-Main Paper 2 Result") */}
      {e.apply_month || e.forms_out || <Dash />}
    </td>
    <td className="px-3 py-3 align-top">{e.test_month || <Dash />}</td>
    <td className="px-2 py-3 align-top text-[#b9a8a2]">
      <ChevronRight size={18} />
    </td>
  </tr>
);

/** Sortable column header — click toggles asc/desc, third click clears. */
const SortTh = ({ label, col, sort, setSort, className = "" }) => {
  const active = sort.col === col;
  return (
    <th
      className={`cursor-pointer select-none px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#5b1f20] ${className}`}
      onClick={() =>
        setSort(
          active && sort.dir === "desc"
            ? { col: null, dir: "asc" }
            : { col, dir: active ? "desc" : "asc" }
        )
      }
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          sort.dir === "asc" ? (
            <ChevronUp size={12} />
          ) : (
            <ChevronDown size={12} />
          )
        ) : null}
      </span>
    </th>
  );
};

const TH =
  "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#5b1f20]";

/** One list of exams with its own "Show more". */
const ExamTable = ({
  rows,
  sort,
  setSort,
  signedIn,
  onOpen,
  pageSize = PAGE_SIZE,
}) => {
  const [shown, setShown] = useState(pageSize);
  return (
    <>
      <p className="mt-2 text-sm text-[#6d5550]">
        Showing {Math.min(shown, rows.length)} of {rows.length} exams
      </p>
      <div className="mt-2 overflow-x-auto">
        {/* table-fixed: expanding a row must not reflow the columns */}
        <table className="w-full min-w-[560px] table-fixed border-collapse sm:min-w-[640px]">
          <thead>
            <tr className="border-b-2 border-[#e3d1cb] bg-[#f8efec]">
              {/* a signed-in student's save stars */}
              {signedIn ? <th className={`${TH} w-10`} /> : null}
              <th className={`${TH} w-[40%] lg:w-[30%]`}>Exam</th>
              {/* public: government or a public university; private: a
                  private university's own test or private colleges' */}
              <th className={`${TH} w-[22%] sm:w-[14%] lg:w-[12%]`}>
                College Type
              </th>
              <th className={`${TH} hidden lg:table-cell lg:w-[24%]`}>
                Eligibility
              </th>
              <SortTh
                label="Application month"
                col="apply"
                sort={sort}
                setSort={setSort}
                className="hidden sm:table-cell sm:w-[18%] lg:w-[14%]"
              />
              <SortTh
                label="Test month"
                col="month"
                sort={sort}
                setSort={setSort}
                className="w-[22%] sm:w-[16%] lg:w-[12%]"
              />
              <th className={`${TH} w-[10%] sm:w-[8%]`} />
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, shown).map((e, i) => (
              <ExamRow
                key={e.exam_id}
                e={e}
                index={i}
                onOpen={() => onOpen(e)}
                starCol={signedIn}
              />
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > shown ? (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShown(shown + pageSize)}
            className="rounded-full border border-[#e3d1cb] bg-white px-4 py-2 text-sm font-semibold text-[#8f2e31] transition hover:bg-[#f8efec]"
          >
            Show more
          </button>
        </div>
      ) : null}
    </>
  );
};

export default function Exams() {
  const router = useRouter();
  const { signedIn } = useStudentData();
  const [all, setAll] = useState([]);
  const [error, setError] = useState(null);
  // filters, sort and the opened card live in the URL: shareable, and Back
  // returns to them. A college's exam chip links in as /exams?q=JEE Advanced.
  const [params, setParam, urlReady] = useUrlParams({
    q: "",
    stream: "All",
    // the student's home state, and which of its two views is open: the
    // exams any student can sit, or the ones only that state's can
    where: "",
    view: "india",
    // who runs it: Public / Private
    runby: "All",
    sort: "",
    open: "",
    // a career page's "See exams that lead here": /exams?career=<id>
    career: "",
  });
  const { q, stream, runby, career } = params;
  const where = STATES.includes(params.where) ? params.where : "";
  const view = where && params.view === "state" ? "state" : "india";
  const setQ = (v) => {
    rememberTyped("/exams", v);
    setParam("q", v);
  };
  const setStream = (v) => setParam("stream", v);
  const setWhere = (v) => setParam("where", v);
  const setRunby = (v) => setParam("runby", v);
  // a signed-in student arriving with no filters starts in their home
  // state. Once per visit, so picking "All states" sticks.
  const student = useStudentProfile();
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !urlReady || !student) return;
    prefilled.current = true;
    if (Object.keys(router.query).length) return;
    if (STATES.includes(student.state)) setWhere(student.state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlReady, student]);
  // sort=deadline / sort=-deadline
  const sort = useMemo(
    () =>
      params.sort
        ? {
            col: params.sort.replace(/^-/, ""),
            dir: params.sort.startsWith("-") ? "desc" : "asc",
          }
        : { col: null, dir: "asc" },
    [params.sort]
  );
  const setSort = (v) => {
    const next = typeof v === "function" ? v(sort) : v;
    setParam(
      "sort",
      next.col ? `${next.dir === "desc" ? "-" : ""}${next.col}` : ""
    );
  };
  const arrivedQ = useRef(null);
  useEffect(() => {
    if (urlReady && arrivedQ.current === null) arrivedQ.current = q;
  }, [urlReady, q]);
  const [careerInfo, setCareerInfo] = useState(null);
  useEffect(() => {
    if (!career) return setCareerInfo(null);
    loadCareers()
      .then((list) =>
        setCareerInfo(list.find((c) => c.career_id === career) || null)
      )
      .catch(() => setCareerInfo(null));
  }, [career]);
  // the exam cards the career's chips name (careers.json exam_ids)
  const careerExams = useMemo(
    () => (careerInfo ? new Set(careerInfo.exam_ids || []) : null),
    [careerInfo]
  );

  useEffect(() => {
    loadExams()
      .then(setAll)
      .catch(() => setError("Could not load the exam list right now."));
  }, []);

  const streams = useMemo(
    () => ["All", ...Array.from(new Set(all.flatMap((e) => e.streams))).sort()],
    [all]
  );

  const filtered = useMemo(() => {
    const raw = q.trim().toLowerCase();
    let out = all.filter((e) => {
      if (careerExams && !careerExams.has(e.exam_id)) return false;
      if (stream !== "All" && !e.streams.includes(stream)) return false;
      if (runby !== "All" && e.run_by !== runby) return false;
      if (!raw) return true;
      return matchesQuery(
        [
          e.name,
          e.acronym,
          e.scope,
          e.scope_state || "",
          ...(e.aliases || []),
          ...e.streams,
          ...(e.degrees || []),
        ],
        raw
      );
    });
    // an exact acronym hit ("IAT", "KCET") leads the list
    const exact = (e) =>
      plainText(e.acronym) === plainText(raw) ||
      (e.aliases || []).some((a) => plainText(a) === plainText(raw));
    if (raw) out = [...out].sort((a, b) => exact(b) - exact(a));
    if (sort.col) {
      // months from this one on: the cycle wraps (forms open Oct-Jan, tests
      // run Jan-Jul), so the top of the list is what comes next
      const now = new Date().getMonth() + 1;
      const fromNow = (n) => (n ? (n - now + 12) % 12 : Infinity);
      const key =
        sort.col === "apply"
          ? (e) => fromNow(e.apply_month_n)
          : (e) => fromNow(e.test_month_n);
      out = [...out].sort((a, b) =>
        sort.dir === "asc" ? key(a) - key(b) : key(b) - key(a)
      );
    }
    return out;
  }, [all, q, stream, runby, sort, careerExams]);

  // a home state splits the list in two views: All India (any student can
  // sit it) and that state's own. Eligibility, not where the colleges are:
  // BITSAT (Pilani, Goa, Hyderabad) is All India. No state yet: every exam.
  const views = useMemo(
    () => ({
      india: filtered.filter(isAllIndia),
      state: filtered.filter((e) => e.eligible_in === where),
    }),
    [filtered, where]
  );
  // a search that matches only in the other view opens that one
  const other = view === "state" ? "india" : "state";
  const shownView =
    q.trim() && !views[view].length && views[other].length ? other : view;
  const rows = where ? views[shownView] : filtered;
  // a career whose exams the other filters all hide (Aerospace + Private
  // only): say so and offer them back, not a bare "No exams match"
  const careerName = careerInfo?.name || career.replace(/-/g, " ");
  const careerHidden =
    career && careerExams?.size && !filtered.length ? careerExams.size : 0;
  // a career no listed exam leads to: its note says how people get in
  const noCareerExams = !!(careerExams && careerExams.size === 0);
  // a search that matches only other states' exams, which a home state
  // leaves out (MHT CET with Karnataka picked)
  const elsewhere =
    where && q.trim()
      ? filtered.length - views.india.length - views.state.length
      : 0;

  // A link that names one exam (a college's exam chip: /exams?q=JEE Advanced)
  // or an older ?open= link goes straight to that exam's page: the query
  // lands on one exam, or on exactly one exact-acronym match. Replace, so
  // Back skips this hop.
  const redirected = useRef(false);
  useEffect(() => {
    if (redirected.current || !urlReady || !all.length) return;
    let pick = null;
    if (params.open) {
      pick = all.find((x) => x.exam_id === params.open) || null;
    } else if (
      q &&
      q === arrivedQ.current &&
      !wasTyped("/exams", q) &&
      filtered.length
    ) {
      const raw = plainText(q);
      const exacts = filtered.filter(
        (e) =>
          plainText(e.acronym) === raw ||
          (e.aliases || []).some((a) => plainText(a) === raw)
      );
      pick =
        filtered.length === 1
          ? filtered[0]
          : exacts.length === 1
          ? exacts[0]
          : null;
    }
    if (pick) {
      redirected.current = true;
      markForward(`/exams/${pick.exam_id}`);
      router.replace(`/exams/${pick.exam_id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlReady, all, filtered, params.open, q]);

  // so an exam page's "All exams" comes back to this list as it is; not
  // while the list is about to forward (/exams?q=NEET-UG), or the back link
  // would point at the hop and bounce straight back
  useEffect(() => {
    if (urlReady && all.length && !redirected.current) rememberList("/exams");
  }, [urlReady, router.asPath, all.length]);

  // a new filter starts each list at its first page
  const listKey = [
    q,
    stream,
    where,
    shownView,
    runby,
    params.sort,
    career,
  ].join("|");

  return (
    <>
      <Head>
        <title>Entrance Exams - Futures</title>
        <meta
          name="description"
          content="Every undergraduate entrance exam in India: streams, eligibility, application fee, and typical timeline."
        />
      </Head>
      <div className="min-h-screen px-3 py-6 sm:px-6">
        <div className="mx-auto mb-3 max-w-6xl">
          {/* arrived from a career's "See … that lead here": back to it */}
          {career ? (
            <BackLink href={`/careers/${encodeURIComponent(career)}`}>
              Back
            </BackLink>
          ) : (
            <BackLink />
          )}
        </div>
        <div className="mx-auto max-w-6xl rounded-2xl border border-[#eee1d7] bg-white p-4 shadow-sm sm:p-8">
          <h1 className="text-center text-3xl font-bold text-[#332724]">
            Entrance Exams
          </h1>
          <p className="mt-2 text-center text-sm text-[#6d5550]">
            Dates are the typical cycle, not this year&apos;s. Always confirm on
            the official sites.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_11rem_14rem_11rem]">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#b9a8a2]"
              />
              {/* sized to match the Dropdown control (48px, same border/bg) */}
              <input
                type="text"
                value={q}
                onChange={(ev) => setQ(ev.target.value)}
                placeholder="Search an exam, stream, or state"
                className="h-12 w-full rounded-xl border border-[#d8c7c1] bg-[#fffdfa] pl-9 pr-3 text-[#2f2320] shadow-sm outline-none transition placeholder:text-[#7a6159] focus:border-[#b52326] focus:ring-[3px] focus:ring-[#b52326]/[0.12]"
              />
            </div>
            <div>
              <Dropdown
                options={streams.map((s) => ({
                  value: s,
                  label: s === "All" ? "All streams" : s,
                }))}
                selectedValue={stream}
                onChange={(o) => setStream(o.value)}
                className="w-full"
                hideValueWhileSearching
              />
            </div>
            <div>
              <Dropdown
                options={[
                  { value: "All", label: "All states" },
                  ...STATES.map((w) => ({ value: w, label: w })),
                ]}
                selectedValue={where || null}
                placeholder="Select your home state"
                onChange={(o) => setWhere(o.value === "All" ? "" : o.value)}
                className="w-full"
                hideValueWhileSearching
              />
            </div>
            <div>
              <Dropdown
                options={[
                  { value: "All", label: "Public & private" },
                  { value: "Public", label: "Public only" },
                  { value: "Private", label: "Private only" },
                ]}
                selectedValue={runby}
                onChange={(o) => setRunby(o.value)}
                className="w-full"
              />
            </div>
          </div>

          {error ? (
            <p className="py-10 text-center text-sm text-[#8f2e31]">{error}</p>
          ) : all.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#6d5550]">
              Loading exams…
            </p>
          ) : (
            <>
              {career ? (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setParam("career", "")}
                    className="inline-flex items-center gap-2 rounded-full bg-[#fbeeec] px-3 py-1 text-sm font-semibold text-[#8f2e31]"
                  >
                    Lead to {careerName} <span aria-hidden>×</span>
                  </button>
                  {careerExams && careerExams.size === 0 ? (
                    <p className="mt-3 rounded-xl border border-[#eaded8] bg-[#fffdfa] px-4 py-3 text-sm leading-6 text-[#5c4b46]">
                      No exam in this list leads here directly.
                      {careerInfo?.entry_exams_text
                        ? ` How people usually get in: ${careerInfo.entry_exams_text}`
                        : ""}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {where ? (
                <div
                  role="tablist"
                  className="mt-6 inline-flex rounded-xl border border-[#e3d1cb] bg-[#f8efec] p-1"
                >
                  {[
                    ["india", "All India"],
                    ["state", `${where} Only`],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={shownView === key}
                      onClick={() => setParam("view", key)}
                      className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                        shownView === key
                          ? "bg-white text-[#8f2e31] shadow-sm"
                          : "text-[#6d5550] hover:text-[#8f2e31]"
                      }`}
                    >
                      {label}{" "}
                      <span className="font-semibold text-[#9a8580]">
                        {views[key].length}
                      </span>
                    </button>
                  ))}
                </div>
              ) : noCareerExams ? null : (
                <p className="mt-6 text-sm text-[#6d5550]">
                  Select your home state to see the All India exams and your
                  state&apos;s own exams separately.
                </p>
              )}
              {where ? (
                <p className="mt-3 text-sm text-[#6d5550]">
                  {shownView === "state"
                    ? `Only for students from ${where}.`
                    : "Open to students from every state."}
                </p>
              ) : null}
              {rows.length ? (
                <ExamTable
                  key={listKey}
                  rows={rows}
                  sort={sort}
                  setSort={setSort}
                  signedIn={signedIn}
                  onOpen={(e) => router.push(`/exams/${e.exam_id}`)}
                />
              ) : null}
              {rows.length === 0 && !noCareerExams ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-[#6d5550]">
                    {careerHidden
                      ? `None of the ${careerHidden} ${
                          careerHidden === 1 ? "exam" : "exams"
                        } that lead to ${careerName} match these filters.`
                      : elsewhere
                      ? `${elsewhere} ${
                          elsewhere === 1 ? "exam" : "exams"
                        } for other states' students match.`
                      : shownView === "state" && views.india.length
                      ? `No ${where} exams match. Its colleges may admit through All India exams, or on Class 12 marks.`
                      : "No exams match."}
                  </p>
                  {careerHidden ? (
                    <button
                      type="button"
                      onClick={() => {
                        setParam("q", "");
                        setStream("All");
                        setRunby("All");
                        setWhere("");
                      }}
                      className="mt-3 rounded-full border border-[#e3d1cb] bg-white px-4 py-2 text-sm font-semibold text-[#8f2e31] transition hover:bg-[#f8efec]"
                    >
                      Show all {careerHidden}
                    </button>
                  ) : elsewhere ? (
                    <button
                      type="button"
                      onClick={() => setWhere("")}
                      className="mt-3 rounded-full border border-[#e3d1cb] bg-white px-4 py-2 text-sm font-semibold text-[#8f2e31] transition hover:bg-[#f8efec]"
                    >
                      Show all states
                    </button>
                  ) : stream !== "All" || runby !== "All" || where ? (
                    <button
                      type="button"
                      onClick={() => {
                        setStream("All");
                        setRunby("All");
                        setWhere("");
                      }}
                      className="mt-3 rounded-full border border-[#e3d1cb] bg-white px-4 py-2 text-sm font-semibold text-[#8f2e31] transition hover:bg-[#f8efec]"
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}
