import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowRight, LogOut, Plus, X } from "lucide-react";
import {
  CLASS_OPTIONS,
  STREAM_OPTIONS,
  STREAM_TO_EXAM,
  PORTAL_LOGIN_URL,
  signOut,
} from "../utils/portalSession";
import { useStudentData } from "../utils/studentData";
import { loadCareers } from "../components/careerShared";
import { loadExams } from "../components/examShared";
import { loadColleges, slugMap } from "../utils/collegesData";
import PlanChains from "../components/PlanChains";
import { examsOf } from "../utils/onboarding";

// Student Corner: a signed-in Avanti student's own page — their details,
// then two tabs. My plans: chains of career → exam → college → rank needed
// (components/PlanChains.js), as many as they like. Favourites: everything
// they bookmarked around the site, their saved career quiz, and the picks
// from the older one-pathway version (kept, read-only). Details come from
// the Avanti portal and are not edited here.

const PATHWAY_MAX = { colleges: 5, exams: 4 };

// afdb stores categories as codes (obc, gen-ews, pwd-sc)
const CATEGORY_LABEL = {
  gen: "General",
  "gen-ews": "EWS",
  obc: "OBC",
  sc: "SC",
  st: "ST",
};
const categoryLabel = (raw) => {
  if (!raw) return "—";
  const v = String(raw).toLowerCase();
  const base = CATEGORY_LABEL[v.replace(/^pwd-/, "")] || raw;
  return v.startsWith("pwd-") ? `${base} (PwD)` : base;
};

const labelFor = (options, value) =>
  options.find((o) => o.value === value)?.label || value || "—";

// "10/30/2026" -> "30 Oct 2026"; anything that isn't a date -> null
const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const niceDate = (s) => {
  const m = String(s || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${Number(m[2])} ${MONTHS[Number(m[1]) - 1]} ${m[3]}` : null;
};

const Fact = ({ label, value }) => (
  <div className="rounded-xl border border-[#eaded8] bg-white px-4 py-3">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a635d]">
      {label}
    </p>
    <p className="mt-0.5 text-[15px] font-bold text-[#2f2320]">{value}</p>
  </div>
);

const Card = ({ title, children, right }) => (
  <section className="mt-6 rounded-2xl border border-[#eaded8] bg-[#fffdfa] p-5">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-base font-black text-[#2f2320]">{title}</h2>
      {right}
    </div>
    {children}
  </section>
);

// one choice in the pathway: on = part of the plan
const Chip = ({ on, onClick, children, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled && !on}
    aria-pressed={on}
    className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
      on
        ? "border-[#B52326] bg-[#B52326] text-white"
        : "border-[#eaded8] bg-white text-[#2f2320] hover:border-[#B52326]"
    }`}
  >
    {children}
  </button>
);

// where to go to add to a step
const AddLink = ({ href, children }) => (
  <Link
    href={href}
    className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#d8c7c1] px-3 py-1.5 text-sm font-semibold text-[#8f2e31] transition hover:border-[#B52326] hover:bg-[#fbeeec]"
  >
    <Plus size={14} /> {children}
  </Link>
);

const Step = ({ n, title, children }) => (
  <div className="mt-5">
    <p className="text-sm font-bold text-[#2f2320]">
      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#fbeeec] text-xs font-black text-[#B52326]">
        {n}
      </span>
      {title}
    </p>
    <div className="mt-2 flex flex-wrap gap-2 pl-8">{children}</div>
  </div>
);

const uniqueById = (items) => {
  const seen = new Set();
  return items.filter((x) => x && !seen.has(x.id) && seen.add(x.id));
};

export default function StudentCorner() {
  const router = useRouter();
  const {
    profile,
    signedIn,
    loaded,
    stars,
    pathway,
    quiz,
    onboarding,
    plans,
    error,
    savePlans,
    toggleStar,
    deleteEverything,
  } = useStudentData();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [careers, setCareers] = useState([]);
  const [exams, setExams] = useState([]);
  const [colleges, setColleges] = useState(null);
  useEffect(() => {
    if (!signedIn) return;
    loadCareers()
      .then(setCareers)
      .catch(() => {});
    loadExams()
      .then((e) => setExams(Array.isArray(e) ? e : e.exams || []))
      .catch(() => {});
  }, [signedIn]);
  const wantColleges =
    stars.college.length > 0 ||
    (pathway?.colleges || []).length > 0 ||
    plans.some((x) => x.college);
  useEffect(() => {
    if (signedIn && wantColleges && !colleges)
      loadColleges()
        .then(setColleges)
        .catch(() => {});
  }, [signedIn, wantColleges, colleges]);

  const careerById = useMemo(
    () => Object.fromEntries(careers.map((c) => [c.career_id, c])),
    [careers]
  );
  const examById = useMemo(
    () => Object.fromEntries(exams.map((e) => [e.exam_id, e])),
    [exams]
  );
  const slugs = useMemo(() => (colleges ? slugMap(colleges) : {}), [colleges]);
  const collegeById = useMemo(
    () =>
      colleges
        ? Object.fromEntries(colleges.map((c) => [c.college_id, c]))
        : {},
    [colleges]
  );

  // what a plan's links can be: the student's bookmarks, the career quiz's
  // top careers, and the exams they picked in Get started
  const examIdOfKey = useMemo(() => {
    const m = {};
    for (const e of exams)
      if (e.predictor_exam && !m[e.predictor_exam])
        m[e.predictor_exam] = e.exam_id;
    return m;
  }, [exams]);
  const choices = {
    career: uniqueById([
      ...stars.career.map((x) => ({ id: x.id, label: x.label })),
      ...(quiz?.top_careers || []).slice(0, 5),
    ]),
    exam: uniqueById([
      ...stars.exam.map((x) => ({
        id: x.id,
        label: examById[x.id]?.acronym || x.label,
      })),
      ...examsOf(onboarding || {})
        .map((k) => examIdOfKey[k])
        .filter(Boolean)
        .map((id) => ({
          id,
          label: examById[id]?.acronym || examById[id]?.name || id,
        })),
    ]),
    college: stars.college.map((x) => ({ id: x.id, label: x.label })),
  };
  // the older single pathway, shown as it was saved
  const earlier = pathway
    ? [
        ["Career", pathway.career ? [pathway.career] : []],
        ["Colleges", pathway.colleges || []],
        ["Exams", pathway.exams || []],
      ].filter(([, xs]) => xs.length)
    : [];
  const [view, setView] = useState("plans");
  // a bookmark starts a new plan with itself in place
  const startPlan = (kind, x) => {
    savePlans([
      ...plans,
      {
        id: Math.random().toString(36).slice(2, 10),
        career: null,
        exam: null,
        college: null,
        branch: null,
        [kind]: { id: x.id, label: x.label },
      },
    ]);
    setView("plans");
    window.scrollTo(0, 0);
  };

  const [tab, setTab] = useState("college");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const hrefFor = (kind, s) =>
    kind === "college"
      ? slugs[s.id]
        ? `/colleges/${slugs[s.id]}`
        : `/colleges?q=${encodeURIComponent(s.label || "")}`
      : kind === "career"
      ? `/careers/${s.id}`
      : kind === "exam"
      ? `/exams/${s.id}`
      : `/scholarships?q=${encodeURIComponent(s.label || "")}`;
  const metaFor = (kind, s) => {
    if (kind === "scholarship") {
      const d = niceDate(s.extra?.deadline);
      return d ? `Last date ${d}` : null;
    }
    if (kind === "exam") {
      const month = examById[s.id]?.test_month;
      return month ? `Exam in ${month}` : null;
    }
    return s.extra?.meta || null;
  };
  const TABS = [
    { k: "college", label: "Colleges", href: "/colleges" },
    { k: "career", label: "Careers", href: "/careers" },
    { k: "exam", label: "Exams", href: "/exams" },
    { k: "scholarship", label: "Scholarships", href: "/scholarships" },
  ];
  const activeTab = TABS.find((t) => t.k === tab);

  return (
    <>
      <Head>
        <title>Student Corner - Futures</title>
      </Head>
      <div className="min-h-[calc(100vh-120px)] bg-[#fdf8f6] px-4 py-10">
        <div className="mx-auto max-w-5xl">
          {!mounted ? null : !signedIn ? (
            <div className="rounded-2xl border border-[#eaded8] bg-white p-8 text-center">
              <h1 className="text-2xl font-black text-[#2f2320]">
                Student Corner
              </h1>
              <p className="mt-3 text-[15px] text-[#7a635d]">
                Log in to plan your path and save colleges, careers, exams and
                scholarships. Everything else on Futures works without an
                account.
              </p>
              <Link
                href={PORTAL_LOGIN_URL}
                className="mt-6 inline-block rounded-[10px] bg-[#B52326] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#9E1F22]"
              >
                Log in or sign up
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#B52326]">
                    Student Corner
                  </p>
                  <h1 className="text-[clamp(24px,3.6vw,34px)] font-black leading-tight text-[#2f2320]">
                    Hi{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    router.push("/");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#eaded8] bg-white px-3.5 py-1.5 text-sm font-semibold text-[#2f2320] transition hover:bg-[#fbeeec]"
                >
                  <LogOut size={14} /> Not you? Sign out
                </button>
              </div>
              {error ? (
                <p className="mt-3 rounded-lg bg-[#fbeeec] px-3 py-2 text-sm text-[#8f2e31]">
                  {error}
                </p>
              ) : null}

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Fact
                  label="Class"
                  value={labelFor(CLASS_OPTIONS, profile?.class)}
                />
                <Fact
                  label="Stream"
                  value={labelFor(STREAM_OPTIONS, profile?.stream)}
                />
                <Fact label="Home state" value={profile?.state || "—"} />
                <Fact
                  label="Category"
                  value={categoryLabel(profile?.category)}
                />
              </div>

              <div
                role="tablist"
                className="mt-8 flex gap-1 rounded-full bg-[#f3e8e4] p-1 text-sm font-bold sm:w-max"
              >
                {[
                  ["plans", "My plans", plans.length],
                  [
                    "favourites",
                    "Favourites",
                    Object.values(stars).reduce((n, xs) => n + xs.length, 0),
                  ],
                ].map(([k, label, n]) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={view === k}
                    onClick={() => setView(k)}
                    className={`flex-1 rounded-full px-4 py-2 transition sm:flex-none ${
                      view === k
                        ? "bg-white text-[#2f2320] shadow-sm"
                        : "text-[#7a635d] hover:text-[#2f2320]"
                    }`}
                  >
                    {label}
                    <span className="ml-1.5 text-xs font-semibold text-[#a89a94]">
                      {n}
                    </span>
                  </button>
                ))}
              </div>

              {!loaded ? (
                <p className="mt-6 text-sm text-[#7a635d]">Loading…</p>
              ) : view === "plans" ? (
                <div className="mt-5">
                  <PlanChains
                    plans={plans}
                    savePlans={savePlans}
                    choices={choices}
                    collegeById={collegeById}
                    examById={examById}
                    slugs={slugs}
                    profile={profile}
                  />
                </div>
              ) : (
                <>
                  {quiz?.top_careers?.length ? (
                    <Card
                      title="My career quiz"
                      right={
                        <Link
                          href="/career-quiz?saved=1"
                          className="text-sm font-semibold text-[#B52326] underline underline-offset-2"
                        >
                          See full results
                        </Link>
                      }
                    >
                      <ol className="mt-3 space-y-1.5 text-[15px]">
                        {quiz.top_careers.slice(0, 5).map((c, i) => (
                          <li key={c.id} className="flex gap-2">
                            <span className="w-5 text-right tabular-nums text-[#a89a94]">
                              {i + 1}
                            </span>
                            <Link
                              href={`/careers/${c.id}`}
                              className="font-semibold text-[#2f2320] hover:text-[#B52326]"
                            >
                              {c.label}
                            </Link>
                          </li>
                        ))}
                      </ol>
                    </Card>
                  ) : null}

                  <Card title="Bookmarked">
                    <div className="mt-3 flex flex-wrap gap-2 border-b border-[#eee1d7]">
                      {TABS.map((t) => (
                        <button
                          key={t.k}
                          type="button"
                          onClick={() => setTab(t.k)}
                          className={`-mb-px border-b-[3px] px-3 py-2 text-sm font-bold transition ${
                            tab === t.k
                              ? "border-[#B52326] text-[#2f2320]"
                              : "border-transparent text-[#7a635d] hover:text-[#2f2320]"
                          }`}
                        >
                          {t.label}
                          <span className="ml-1.5 text-xs font-semibold text-[#a89a94]">
                            {stars[t.k].length}
                          </span>
                        </button>
                      ))}
                    </div>
                    {stars[tab].length === 0 ? (
                      <div className="mt-4">
                        <AddLink href={activeTab.href}>
                          Find {activeTab.label.toLowerCase()}
                        </AddLink>
                      </div>
                    ) : (
                      <ul className="mt-2 divide-y divide-[#f0e6e1]">
                        {stars[tab].map((s) => {
                          const meta = metaFor(tab, s);
                          return (
                            <li
                              key={s.id}
                              className="flex items-center gap-3 py-2.5"
                            >
                              <Link
                                href={hrefFor(tab, s)}
                                className="min-w-0 flex-1"
                              >
                                <span className="block truncate font-semibold text-[#2f2320] hover:text-[#B52326]">
                                  {s.label || s.id}
                                </span>
                                {meta ? (
                                  <span className="block text-xs text-[#7a635d]">
                                    {meta}
                                  </span>
                                ) : null}
                              </Link>
                              {tab !== "scholarship" ? (
                                <button
                                  type="button"
                                  onClick={() => startPlan(tab, s)}
                                  className="shrink-0 rounded-full border border-[#eaded8] px-2.5 py-1 text-xs font-bold text-[#B52326] transition hover:border-[#B52326]"
                                >
                                  Use in a plan
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() =>
                                  toggleStar(tab, s.id, s.label, s.extra)
                                }
                                aria-label={`Remove ${s.label || ""}`}
                                title="Remove"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#a08a84] transition hover:bg-[#fbeeec] hover:text-[#8f2e31]"
                              >
                                <X size={16} />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </Card>

                  {earlier.length ? (
                    <Card title="Your earlier picks">
                      <p className="mt-1 text-sm text-[#7a635d]">
                        From the pathway you made before plans. Use any of them
                        in a plan.
                      </p>
                      <dl className="mt-3 space-y-2 text-sm">
                        {earlier.map(([label, xs]) => (
                          <div key={label} className="flex gap-3">
                            <dt className="w-20 shrink-0 font-bold text-[#7a635d]">
                              {label}
                            </dt>
                            <dd className="text-[#2f2320]">
                              {xs.map((x) => x.label || x.id).join(" · ")}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </Card>
                  ) : null}
                </>
              )}

              <div className="mt-10 text-center text-sm">
                {confirmDelete ? (
                  <span className="text-[#5b3a34]">
                    Delete everything you saved here?{" "}
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteEverything();
                        setConfirmDelete(false);
                      }}
                      className="font-bold text-[#B52326] underline"
                    >
                      Yes, delete
                    </button>{" "}
                    ·{" "}
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="underline"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="text-[#7a635d] underline underline-offset-2 hover:text-[#8f2e31]"
                  >
                    Delete my saved data
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
