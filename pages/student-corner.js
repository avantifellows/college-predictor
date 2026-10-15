import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Award,
  Briefcase,
  ClipboardList,
  LogOut,
  Star,
  Target,
  X,
} from "lucide-react";
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

// Student Corner: a signed-in Avanti student's own page. Their pathway
// (career -> colleges -> exams -> rank to aim), the career quiz result they
// saved, and everything they starred around the site. Profile details come
// from the Avanti portal and are not edited here.

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
  const pwd = v.startsWith("pwd-");
  const base = CATEGORY_LABEL[v.replace(/^pwd-/, "")] || raw;
  return pwd ? `${base} (PwD)` : base;
};

const labelFor = (options, value) =>
  options.find((o) => o.value === value)?.label || value || "—";

const Fact = ({ label, value }) => (
  <div className="rounded-xl border border-[#eaded8] bg-white px-4 py-3">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a635d]">
      {label}
    </p>
    <p className="mt-0.5 text-[15px] font-bold text-[#2f2320]">{value}</p>
  </div>
);

const Shortcut = ({ href, icon: Icon, title, desc }) => (
  <Link
    href={href}
    className="flex items-start gap-3 rounded-xl border border-[#eaded8] bg-white p-4 transition hover:border-[#B52326] hover:shadow-sm"
  >
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fbeeec] text-[#B52326]">
      <Icon size={20} />
    </span>
    <span>
      <span className="block text-[15px] font-bold text-[#2f2320]">
        {title}
      </span>
      <span className="block text-sm text-[#7a635d]">{desc}</span>
    </span>
  </Link>
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

const Hint = ({ children }) => (
  <p className="w-full text-sm text-[#7a635d]">{children}</p>
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
    error,
    savePathway,
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
    stars.college.length > 0 || (pathway?.colleges || []).length > 0;
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

  const p = pathway || {};
  const plan = {
    career: p.career || null,
    colleges: p.colleges || [],
    exams: p.exams || [],
  };
  const toggleIn = (key, item) => {
    const list = plan[key];
    const has = list.some((x) => x.id === item.id);
    savePathway({
      [key]: has
        ? list.filter((x) => x.id !== item.id)
        : [...list, { id: item.id, label: item.label }].slice(
            0,
            PATHWAY_MAX[key]
          ),
    });
  };

  // choices for each step: what the student starred, plus what the site
  // already knows (quiz top careers, the chosen career's exams)
  const careerChoices = uniqueById([
    ...(plan.career ? [plan.career] : []),
    ...stars.career.map((s) => ({ id: s.id, label: s.label })),
    ...(quiz?.top_careers || []).slice(0, 5),
  ]);
  const collegeChoices = uniqueById([
    ...plan.colleges,
    ...stars.college.map((s) => ({ id: s.id, label: s.label })),
  ]);
  const careerExams = (careerById[plan.career?.id]?.exam_ids || [])
    .map((id) => examById[id])
    .filter(Boolean)
    .map((e) => ({ id: e.exam_id, label: e.acronym || e.name }));
  const examChoices = uniqueById([
    ...plan.exams,
    ...stars.exam.map((s) => ({
      id: s.id,
      label: examById[s.id]?.acronym || s.label,
    })),
    ...careerExams,
  ]);

  // what the chosen colleges' programmes for the chosen career closed at
  const rankHints = useMemo(() => {
    if (!plan.career || !colleges) return [];
    const out = [];
    for (const ref of plan.colleges) {
      const c = collegeById[ref.id];
      if (!c) continue;
      for (const prog of c.programs?.list || []) {
        if (prog.career_id !== plan.career.id) continue;
        const rank = prog.indicative_closing_rank;
        if (rank)
          out.push({
            college: c.display_name,
            branch: prog.branch,
            rank,
            scale: prog.rank_label,
          });
      }
    }
    return out.sort((a, b) => a.rank - b.rank).slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.career?.id, plan.colleges, colleges, collegeById]);

  const [rankDraft, setRankDraft] = useState("");
  useEffect(
    () => setRankDraft(p.target_rank ? String(p.target_rank) : ""),
    [p.target_rank]
  );
  const saveRank = () => {
    const n = Number(rankDraft);
    if (rankDraft === "" && p.target_rank) savePathway({ target_rank: null });
    else if (Number.isInteger(n) && n > 0 && n !== p.target_rank)
      savePathway({ target_rank: n });
  };

  // the predictor opens on the pathway's first exam that has one
  const pathwayExam = plan.exams
    .map((x) => examById[x.id]?.predictor_exam)
    .find(Boolean);
  const exam =
    pathwayExam || (profile?.stream ? STREAM_TO_EXAM[profile.stream] : null);
  const predictorHref = exam
    ? { pathname: "/predictor", query: { exam } }
    : "/predictor";

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
  const TABS = [
    { k: "college", label: "Colleges", empty: "/colleges" },
    { k: "career", label: "Careers", empty: "/careers" },
    { k: "exam", label: "Exams", empty: "/exams" },
    { k: "scholarship", label: "Scholarships", empty: "/scholarships" },
  ];
  const activeTab = TABS.find((t) => t.k === tab);

  return (
    <>
      <Head>
        <title>Student Corner - Futures</title>
      </Head>
      <div className="min-h-[calc(100vh-120px)] bg-[#fdf8f6] px-4 py-10">
        <div className="mx-auto max-w-3xl">
          {!mounted ? null : !signedIn ? (
            <div className="rounded-2xl border border-[#eaded8] bg-white p-8 text-center">
              <h1 className="text-2xl font-black text-[#2f2320]">
                Student Corner
              </h1>
              <p className="mt-3 text-[15px] text-[#7a635d]">
                Avanti Fellows students can sign in to plan their path and save
                colleges, careers, exams and scholarships. Everything else on
                Futures works without signing in.
              </p>
              <a
                href={PORTAL_LOGIN_URL}
                className="mt-6 inline-block rounded-[10px] bg-[#B52326] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#9E1F22]"
              >
                Student login
              </a>
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

              <Card title="My pathway">
                {!loaded ? (
                  <p className="mt-3 text-sm text-[#7a635d]">Loading…</p>
                ) : (
                  <>
                    <Step n={1} title="Career I'm aiming for">
                      {careerChoices.length ? (
                        careerChoices.map((c) => (
                          <Chip
                            key={c.id}
                            on={plan.career?.id === c.id}
                            onClick={() =>
                              savePathway({
                                career:
                                  plan.career?.id === c.id
                                    ? null
                                    : { id: c.id, label: c.label },
                              })
                            }
                          >
                            {c.label}
                          </Chip>
                        ))
                      ) : (
                        <Hint>
                          Take the{" "}
                          <Link
                            href="/career-quiz"
                            className="font-semibold text-[#B52326] underline"
                          >
                            career quiz
                          </Link>{" "}
                          or save careers from{" "}
                          <Link
                            href="/careers"
                            className="font-semibold text-[#B52326] underline"
                          >
                            Careers
                          </Link>
                          .
                        </Hint>
                      )}
                    </Step>

                    <Step n={2} title="Colleges I'm aiming for">
                      {collegeChoices.length ? (
                        collegeChoices.map((c) => (
                          <Chip
                            key={c.id}
                            on={plan.colleges.some((x) => x.id === c.id)}
                            disabled={
                              plan.colleges.length >= PATHWAY_MAX.colleges
                            }
                            onClick={() => toggleIn("colleges", c)}
                          >
                            {c.label}
                          </Chip>
                        ))
                      ) : (
                        <Hint>
                          Save colleges from{" "}
                          <Link
                            href={
                              plan.career
                                ? `/colleges?career=${encodeURIComponent(
                                    plan.career.id
                                  )}`
                                : "/colleges"
                            }
                            className="font-semibold text-[#B52326] underline"
                          >
                            Colleges
                          </Link>
                          .
                        </Hint>
                      )}
                    </Step>

                    <Step n={3} title="Exams I'll write">
                      {examChoices.length ? (
                        examChoices.map((e) => (
                          <Chip
                            key={e.id}
                            on={plan.exams.some((x) => x.id === e.id)}
                            disabled={plan.exams.length >= PATHWAY_MAX.exams}
                            onClick={() => toggleIn("exams", e)}
                          >
                            {e.label}
                          </Chip>
                        ))
                      ) : (
                        <Hint>
                          Save exams from{" "}
                          <Link
                            href="/exams"
                            className="font-semibold text-[#B52326] underline"
                          >
                            Exams
                          </Link>
                          .
                        </Hint>
                      )}
                    </Step>

                    <Step n={4} title="Rank I'm aiming for">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={rankDraft}
                        onChange={(e) => setRankDraft(e.target.value)}
                        onBlur={saveRank}
                        onKeyDown={(e) =>
                          e.key === "Enter" && e.currentTarget.blur()
                        }
                        placeholder="e.g. 15000"
                        className="w-40 rounded-lg border border-[#eaded8] bg-white px-3 py-1.5 text-sm"
                      />
                      {plan.exams.length > 1 ? (
                        <select
                          value={p.target_rank_exam || ""}
                          onChange={(e) =>
                            savePathway({
                              target_rank_exam: e.target.value || null,
                            })
                          }
                          className="rounded-lg border border-[#eaded8] bg-white px-2 py-1.5 text-sm"
                        >
                          <option value="">in which exam?</option>
                          {plan.exams.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.label}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      {rankHints.length ? (
                        <div className="w-full text-sm text-[#5b3a34]">
                          <p className="text-[#7a635d]">
                            Last year these closed at (open category):
                          </p>
                          <ul className="mt-1 space-y-0.5">
                            {rankHints.map((h, i) => (
                              <li key={i}>
                                <b className="tabular-nums">
                                  {h.rank.toLocaleString("en-IN")}
                                </b>{" "}
                                {h.college} · {h.branch}
                                {h.scale ? ` (${h.scale})` : ""}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </Step>
                  </>
                )}
              </Card>

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

              <Card title="Saved">
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
                  <p className="mt-4 text-sm text-[#7a635d]">
                    <Star size={14} className="mr-1 inline align-[-2px]" />
                    Tap Save on any{" "}
                    <Link
                      href={activeTab.empty}
                      className="font-semibold text-[#B52326] underline"
                    >
                      {activeTab.label.toLowerCase().replace(/s$/, "")}
                    </Link>{" "}
                    to keep it here.
                  </p>
                ) : (
                  <ul className="mt-2 divide-y divide-[#f0e6e1]">
                    {stars[tab].map((s) => (
                      <li key={s.id} className="flex items-center gap-3 py-2.5">
                        <Link href={hrefFor(tab, s)} className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-[#2f2320] hover:text-[#B52326]">
                            {s.label || s.id}
                          </span>
                          {s.extra?.meta || s.extra?.deadline ? (
                            <span className="block text-xs text-[#7a635d]">
                              {s.extra.meta || `Apply by ${s.extra.deadline}`}
                            </span>
                          ) : null}
                        </Link>
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
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Your details">
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
              </Card>

              <section className="mt-6">
                <h2 className="text-base font-black text-[#2f2320]">
                  Start here
                </h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Shortcut
                    href={predictorHref}
                    icon={Target}
                    title={
                      exam
                        ? `Predict my colleges (${exam})`
                        : "College Predictor"
                    }
                    desc="Your category and home state are already filled in."
                  />
                  <Shortcut
                    href="/exams"
                    icon={ClipboardList}
                    title="Entrance exams"
                    desc="Dates, pattern and eligibility for every exam."
                  />
                  <Shortcut
                    href="/scholarships"
                    icon={Award}
                    title="Scholarships"
                    desc="Already filtered to your state and class."
                  />
                  <Shortcut
                    href="/careers"
                    icon={Briefcase}
                    title="Careers"
                    desc="Pay, recruiters and the exams behind each career."
                  />
                </div>
              </section>

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
