import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowDown, ArrowRight, ArrowUp, Plus, X } from "lucide-react";
import { categoryCutoff } from "../utils/categoryCutoff";

const Dropdown = dynamic(() => import("./dropdown"), { ssr: false });

// Student Corner's plans: each a chain career → exam → college (+ branch)
// → the rank it closed at. As many as the student wants; the first is the
// main plan, the rest backups. Every link is a dropdown of everything on
// Futures, the student's favourites first (★), so nothing has to be saved
// beforehand. The college list follows the exam (JEE Main: NITs, IIITs,
// GFTIs; JEE Advanced: IITs), and so does the rank. Every filled link
// points to its next step.

const MAX_PLANS = 10;
const newId = () => Math.random().toString(36).slice(2, 10);
const fmt = (n) => Number(n).toLocaleString("en-IN");

// an exam (exams.json id) → the tag college cards carry in entrance_exams
const COLLEGE_TAG = {
  "jee-main-paper-1": "JEE Main",
  "jee-advanced": "JEE Advanced",
  "tg-eapcet-e": "TG-EAPCET",
  "tg-eapcet-am": "TG-EAPCET",
  "ap-eapcet-e-category": "AP EAPCET",
  "kea-cet": "KCET",
  "mht-cet": "MHT CET",
  "neet-ug": "NEET-UG",
  "cuet-ug": "CUET (UG)",
  "aiims-ee": "AIIMS-EE",
  bitsat: "BITSAT",
  clat: "CLAT",
  gujcet: "GUJCET",
  keam: "KEAM",
  ojee: "OJEE",
  wbjee: "WBJEE",
};
// JoSAA lists both exams' seats; a plan's rank uses only its own exam's
export const JOSAA_ROW_EXAM = {
  "jee-main-paper-1": "JEE Main",
  "jee-advanced": "JEE Advanced",
};

const linkCls =
  "inline-flex items-center gap-1 text-[13px] font-bold text-[#B52326] hover:underline";
const labelCls =
  "text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#8a7570]";

// favourites first, then everything else, as dropdown groups
function grouped(favs, rest, anyLabel) {
  const favIds = new Set(favs.map((x) => x.value));
  const others = rest.filter((x) => !favIds.has(x.value));
  return [
    ...(anyLabel ? [{ value: "any", label: anyLabel }] : []),
    ...(favs.length ? [{ label: "★ Your favourites", options: favs }] : []),
    ...(others.length ? [{ label: "All", options: others }] : []),
  ];
}

// one link of the chain: a dot on a line running down to the next link
function Step({ label, last, children }) {
  return (
    <div
      className={`relative ml-1.5 border-l-2 pl-6 ${
        last ? "border-transparent" : "border-[#f1e2dd] pb-5"
      }`}
    >
      <span
        aria-hidden
        className="absolute -left-[7px] top-0.5 h-3 w-3 rounded-full border-2 border-[#B52326] bg-white"
      />
      <div className="flex max-w-md flex-col gap-2">
        <span className={labelCls}>{label}</span>
        {children}
      </div>
    </div>
  );
}

// the college's branches this plan is about: the picked branch, else the
// plan career's branches, else all of them (with a closing rank)
function programsOf(p, collegeById) {
  const college = p.college ? collegeById[p.college.id] : null;
  const careerId = p.career && p.career !== "any" ? p.career.id : null;
  const progs = (college?.programs?.list || []).filter(
    (x) => x.indicative_closing_rank
  );
  const forCareer = careerId
    ? progs.filter((x) => x.career_id === careerId)
    : [];
  const picked =
    p.branch && p.branch !== "any"
      ? progs.filter((x) => x.branch === p.branch)
      : forCareer.length
      ? forCareer
      : progs;
  return { progs, forCareer, picked, careerId };
}

export default function PlanChains({
  plans,
  savePlans,
  favs,
  careers,
  exams,
  colleges,
  careerById,
  collegeById,
  examById,
  slugs,
  profile,
  firstExam,
}) {
  const update = (i, patch) =>
    savePlans(plans.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const move = (i, d) => {
    const next = [...plans];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    savePlans(next);
  };
  const remove = (i) => savePlans(plans.filter((_, j) => j !== i));
  // a new plan starts from the exam the student picked in Get started
  const add = () =>
    savePlans([
      ...plans,
      {
        id: newId(),
        career: null,
        exam: plans.length === 0 && firstExam ? firstExam : null,
        college: null,
        branch: null,
      },
    ]);

  // the rank in the student's own category, per plan (when the exam allows)
  const [mine, setMine] = useState({});
  const sig = plans
    .map((p) =>
      [p.id, p.exam?.id, p.college?.id, p.branch, p.career?.id].join(":")
    )
    .join("|");
  useEffect(() => {
    let live = true;
    plans.forEach((p) => {
      const exam = p.exam ? examById[p.exam.id]?.predictor_exam : null;
      if (!exam || !p.college) {
        setMine((m) => ({ ...m, [p.id]: null }));
        return;
      }
      const { picked, progs } = programsOf(p, collegeById);
      const branches =
        picked.length && picked.length < progs.length
          ? picked.map((x) => x.branch)
          : null;
      categoryCutoff({
        exam,
        rowExam: JOSAA_ROW_EXAM[p.exam.id],
        collegeId: p.college.id,
        branches,
        profile,
      }).then((r) => {
        if (live) setMine((m) => ({ ...m, [p.id]: r }));
      });
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, collegeById, examById, profile]);

  // dropdown options, built once
  const careerOptions = useMemo(
    () =>
      grouped(
        favs.career.map((x) => ({ value: x.id, label: x.label })),
        careers
          .map((c) => ({ value: c.career_id, label: c.name }))
          .sort((a, b) => a.label.localeCompare(b.label)),
        "Any career"
      ),
    [favs.career, careers]
  );
  const examLabel = (e) => e.acronym || e.name;
  const examOptionsFor = (careerId) => {
    const forCareer = new Set(careerById[careerId]?.exam_ids || []);
    const all = exams
      .map((e) => ({ value: e.exam_id, label: examLabel(e) }))
      .sort(
        (a, b) =>
          (forCareer.has(b.value) ? 1 : 0) - (forCareer.has(a.value) ? 1 : 0) ||
          a.label.localeCompare(b.label)
      );
    return grouped(
      favs.exam.map((x) => ({ value: x.id, label: x.label })),
      all
    );
  };
  const collegeOptionsFor = (examId) => {
    const tag = COLLEGE_TAG[examId];
    const fit = (id) =>
      !tag || (collegeById[id]?.entrance_exams || []).includes(tag);
    const favOpts = favs.college
      .filter((x) => fit(x.id))
      .map((x) => ({ value: x.id, label: x.label }));
    const rest =
      tag && colleges
        ? colleges
            .filter((c) => (c.entrance_exams || []).includes(tag))
            .map((c) => ({ value: c.college_id, label: c.display_name }))
            .sort((a, b) => a.label.localeCompare(b.label))
        : [];
    return grouped(favOpts, rest);
  };

  return (
    <div className="flex flex-col gap-4">
      {plans.length === 0 ? (
        <div className="rounded-2xl border border-[#eaded8] bg-white p-6">
          <h2 className="text-lg font-black text-[#2f2320]">
            Make your first plan
          </h2>
          <p className="mt-1 text-sm text-[#7a635d]">
            Pick a career, the exam for it, a college, and see the rank that
            college closed at. Start from any of them.
          </p>
        </div>
      ) : null}

      {plans.map((p, i) => {
        const exam = p.exam ? examById[p.exam.id] : null;
        const { progs, forCareer, picked, careerId } = programsOf(
          p,
          collegeById
        );
        const own = mine[p.id] || null;
        // a college this exam doesn't admit to (a plan saved before the
        // list followed the exam): say so rather than show its other ranks
        const tag = COLLEGE_TAG[p.exam?.id];
        const misfit =
          p.college &&
          tag &&
          collegeById[p.college.id] &&
          !(collegeById[p.college.id].entrance_exams || []).includes(tag);
        // the college card's figure: open category, on the exam the college
        // admits through
        const cardRanks = misfit
          ? []
          : picked.map((x) => x.indicative_closing_rank);
        const lo = cardRanks.length ? Math.min(...cardRanks) : null;
        const hi = cardRanks.length ? Math.max(...cardRanks) : null;
        const branchOptions = [
          { value: "any", label: "Any branch" },
          ...[...new Set([...forCareer, ...progs].map((x) => x.branch))].map(
            (b) => ({ value: b, label: b })
          ),
        ];
        const predictorExam = exam?.predictor_exam;
        const cutoffsHref = predictorExam
          ? `/predictor?${new URLSearchParams({
              exam: predictorExam,
              examId: exam.exam_id,
              view: "full",
              ...(predictorExam === "JoSAA" && profile?.state
                ? { homeState: profile.state }
                : {}),
            })}`
          : "/predictor";
        const pick = (key, o, extra = {}) =>
          update(i, {
            [key]: o.value === "any" ? "any" : { id: o.value, label: o.label },
            ...extra,
          });
        const collegeOpts = collegeOptionsFor(p.exam?.id);

        return (
          <section
            key={p.id}
            className={`rounded-2xl border bg-white p-4 sm:p-5 ${
              i === 0 ? "border-[#B52326]" : "border-[#eaded8]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-black text-[#2f2320]">
                {i === 0 ? "Main plan" : `Backup ${i}`}
              </h2>
              <div className="flex items-center gap-1 text-[#7a635d]">
                {i > 0 ? (
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    aria-label="Move up"
                    title="Move up"
                    className="rounded-full p-1.5 hover:bg-[#fbeeec]"
                  >
                    <ArrowUp size={15} />
                  </button>
                ) : null}
                {i < plans.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    aria-label="Move down"
                    title="Move down"
                    className="rounded-full p-1.5 hover:bg-[#fbeeec]"
                  >
                    <ArrowDown size={15} />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label="Remove this plan"
                  title="Remove this plan"
                  className="rounded-full p-1.5 hover:bg-[#fbeeec] hover:text-[#8f2e31]"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col">
              <Step label="Career">
                <Dropdown
                  options={careerOptions}
                  selectedValue={
                    p.career === "any" ? "any" : p.career?.id || null
                  }
                  onChange={(o) => pick("career", o)}
                  placeholder="Pick a career"
                  hideValueWhileSearching
                />
                {careerId ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <Link
                      href={`/colleges?career=${encodeURIComponent(careerId)}`}
                      className={linkCls}
                    >
                      Colleges for this career <ArrowRight size={13} />
                    </Link>
                    <Link
                      href={`/exams?career=${encodeURIComponent(careerId)}`}
                      className={linkCls}
                    >
                      Exams that lead here <ArrowRight size={13} />
                    </Link>
                  </div>
                ) : null}
              </Step>

              <Step label="Exam">
                <Dropdown
                  options={examOptionsFor(careerId)}
                  selectedValue={p.exam?.id || null}
                  onChange={(o) => {
                    // a college this exam doesn't admit to goes with it
                    const tag = COLLEGE_TAG[o.value];
                    const keep =
                      p.college &&
                      (!tag ||
                        (
                          collegeById[p.college.id]?.entrance_exams || []
                        ).includes(tag));
                    pick(
                      "exam",
                      o,
                      keep ? {} : { college: null, branch: null }
                    );
                  }}
                  placeholder="Pick an exam"
                  hideValueWhileSearching
                />
                {p.exam ? (
                  predictorExam ? (
                    <Link href={cutoffsHref} className={linkCls}>
                      Check cutoffs <ArrowRight size={13} />
                    </Link>
                  ) : (
                    <Link href={`/exams/${p.exam.id}`} className={linkCls}>
                      About this exam <ArrowRight size={13} />
                    </Link>
                  )
                ) : null}
              </Step>

              <Step label="College">
                <Dropdown
                  options={collegeOpts}
                  selectedValue={p.college?.id || null}
                  onChange={(o) => pick("college", o, { branch: null })}
                  placeholder={
                    p.exam
                      ? colleges
                        ? "Pick a college"
                        : "Loading colleges…"
                      : "Pick an exam first, or a favourite"
                  }
                  hideValueWhileSearching
                />
                {p.college && progs.length ? (
                  <Dropdown
                    options={branchOptions}
                    selectedValue={p.branch || null}
                    onChange={(o) => update(i, { branch: o.value })}
                    placeholder="Branch (optional)"
                    hideValueWhileSearching
                  />
                ) : null}
                {p.college && slugs[p.college.id] ? (
                  <Link
                    href={`/colleges/${slugs[p.college.id]}`}
                    className={linkCls}
                  >
                    About this college <ArrowRight size={13} />
                  </Link>
                ) : null}
              </Step>

              <Step label="Rank needed" last>
                {own && !misfit ? (
                  <div className="rounded-xl bg-[#fdf8f6] px-3 py-2">
                    <div className="text-lg font-black tabular-nums text-[#B52326]">
                      {own.lo === own.hi
                        ? fmt(own.lo)
                        : `${fmt(own.lo)} – ${fmt(own.hi)}`}
                    </div>
                    <div className="text-xs leading-snug text-[#7a635d]">
                      {exam ? `${examLabel(exam)} rank · ` : ""}last year,{" "}
                      {own.category || "your category"}
                    </div>
                  </div>
                ) : lo != null ? (
                  <div className="rounded-xl bg-[#fdf8f6] px-3 py-2">
                    <div className="text-lg font-black tabular-nums text-[#B52326]">
                      {lo === hi ? fmt(lo) : `${fmt(lo)} – ${fmt(hi)}`}
                    </div>
                    <div className="text-xs leading-snug text-[#7a635d]">
                      Last year, open category
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#7a635d]">
                    {misfit
                      ? `${p.college.label} doesn't admit through ${
                          exam ? examLabel(exam) : "this exam"
                        }. Pick another college.`
                      : p.college
                      ? "No closing rank for this college and exam yet."
                      : "Pick a college to see the rank it closed at."}
                  </p>
                )}
                {p.exam && predictorExam ? (
                  <Link href={cutoffsHref} className={linkCls}>
                    All cutoffs for you <ArrowRight size={13} />
                  </Link>
                ) : null}
              </Step>
            </div>
          </section>
        );
      })}

      {plans.length < MAX_PLANS ? (
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-[#e0cfc9] bg-white px-4 py-3 text-sm font-black text-[#B52326] transition hover:border-[#B52326]"
        >
          <Plus size={16} />
          {plans.length ? "Add a backup plan" : "Make a plan"}
        </button>
      ) : null}
    </div>
  );
}
