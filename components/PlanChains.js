import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Plus, X } from "lucide-react";
import { categoryCutoff } from "../utils/categoryCutoff";

// Student Corner's plans: each a chain career → exam → college (+ branch)
// → the rank it closed at. As many as the student wants; the first is the
// main plan, the rest backups. Any link can be filled first, a career or a
// branch can be "any", and every filled link points to its next step. The
// choices are what the student bookmarked (and the career quiz's top
// careers, and the Get started exams), so plans grow out of bookmarks.

const MAX_PLANS = 10;
const newId = () => Math.random().toString(36).slice(2, 10);
const fmt = (n) => Number(n).toLocaleString("en-IN");

const linkCls =
  "inline-flex items-center gap-1 text-[13px] font-bold text-[#B52326] hover:underline";

function Picker({ label, value, options, onPick, anyLabel, findHref, find }) {
  const [open, setOpen] = useState(false);
  const shown =
    value === "any" ? anyLabel : value && value.label ? value.label : null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#8a7570]">
        {label}
      </span>
      {open ? (
        <div className="flex flex-col gap-1 rounded-xl border border-[#eaded8] bg-white p-2">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                onPick({ id: o.id, label: o.label });
                setOpen(false);
              }}
              className="rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-[#2f2320] hover:bg-[#fbeeec]"
            >
              {o.label}
            </button>
          ))}
          {anyLabel ? (
            <button
              type="button"
              onClick={() => {
                onPick("any");
                setOpen(false);
              }}
              className="rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-[#5c4a45] hover:bg-[#fbeeec]"
            >
              {anyLabel}
            </button>
          ) : null}
          {!options.length ? (
            <p className="px-2 py-1 text-[13px] text-[#7a635d]">
              Nothing bookmarked yet.
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-2 border-t border-[#f1e5e1] px-2 pt-1.5">
            <Link href={findHref} className={linkCls}>
              {find} <ArrowRight size={13} />
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[13px] font-semibold text-[#7a635d] hover:text-[#2f2320]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : shown ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex items-start justify-between gap-2 rounded-xl border border-[#eaded8] bg-white px-3 py-2 text-left"
          title="Change"
        >
          <span className="font-black leading-snug text-[#2f2320]">
            {shown}
          </span>
          <span className="shrink-0 text-xs font-bold text-[#B52326] opacity-70 group-hover:opacity-100">
            Change
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl border-[1.5px] border-dashed border-[#e0cfc9] px-3 py-2 text-left text-sm font-bold text-[#B52326] hover:border-[#B52326]"
        >
          + Pick {label.toLowerCase()}
        </button>
      )}
    </div>
  );
}

function Arrow() {
  return (
    <span
      aria-hidden
      className="hidden items-center justify-center pt-6 text-[#d8c4be] md:flex"
    >
      <ArrowRight size={18} />
    </span>
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
  choices,
  collegeById,
  examById,
  slugs,
  profile,
}) {
  const update = (i, patch) =>
    savePlans(plans.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const move = (i, d) => {
    const next = [...plans];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    savePlans(next);
  };
  const remove = (i) => savePlans(plans.filter((_, j) => j !== i));
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
      if (!exam || !p.college) return;
      const { picked, progs } = programsOf(p, collegeById);
      const branches =
        picked.length && picked.length < progs.length
          ? picked.map((x) => x.branch)
          : null;
      categoryCutoff({
        exam,
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

  const add = () =>
    savePlans([
      ...plans,
      { id: newId(), career: null, exam: null, college: null, branch: null },
    ]);

  return (
    <div className="flex flex-col gap-4">
      {plans.length === 0 ? (
        <div className="rounded-2xl border border-[#eaded8] bg-white p-6">
          <h2 className="text-lg font-black text-[#2f2320]">
            Make your first plan
          </h2>
          <p className="mt-1 text-sm text-[#7a635d]">
            A plan joins a career, the exam for it, a college and the rank that
            college closed at. Start from any of them. Bookmark colleges,
            careers and exams across Futures to fill it.
          </p>
        </div>
      ) : null}

      {plans.map((p, i) => {
        const college = p.college ? collegeById[p.college.id] : null;
        const exam = p.exam ? examById[p.exam.id] : null;
        const {
          progs,
          forCareer,
          picked: branchProgs,
          careerId,
        } = programsOf(p, collegeById);
        const own = mine[p.id];
        const ranks = branchProgs.map((x) => x.indicative_closing_rank);
        const lo = ranks.length ? Math.min(...ranks) : null;
        const hi = ranks.length ? Math.max(...ranks) : null;
        const branchOptions = [
          ...new Map(
            [...forCareer, ...progs].map((x) => [
              x.branch,
              { id: x.branch, label: x.branch },
            ])
          ).values(),
        ].slice(0, 12);

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

            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
              <div className="flex flex-col gap-2">
                <Picker
                  label="Career"
                  value={p.career}
                  options={choices.career}
                  anyLabel="Any career"
                  onPick={(v) => update(i, { career: v })}
                  findHref="/careers"
                  find="Find careers"
                />
                {careerId ? (
                  <>
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
                  </>
                ) : null}
              </div>
              <Arrow />
              <div className="flex flex-col gap-2">
                <Picker
                  label="Exam"
                  value={p.exam}
                  options={choices.exam}
                  onPick={(v) => update(i, { exam: v })}
                  findHref={
                    careerId
                      ? `/exams?career=${encodeURIComponent(careerId)}`
                      : "/exams"
                  }
                  find="Find exams"
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
              </div>
              <Arrow />
              <div className="flex flex-col gap-2">
                <Picker
                  label="College"
                  value={p.college}
                  options={choices.college}
                  onPick={(v) => update(i, { college: v, branch: null })}
                  findHref={
                    careerId
                      ? `/colleges?career=${encodeURIComponent(careerId)}`
                      : "/colleges"
                  }
                  find="Find colleges"
                />
                {p.college && branchOptions.length ? (
                  <Picker
                    label="Branch"
                    value={p.branch ? { label: p.branch } : null}
                    options={branchOptions}
                    anyLabel="Any branch"
                    onPick={(v) =>
                      update(i, { branch: v === "any" ? "any" : v.id })
                    }
                    findHref={
                      slugs[p.college.id]
                        ? `/colleges/${slugs[p.college.id]}`
                        : "/colleges"
                    }
                    find="See all its branches"
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
              </div>
              <Arrow />
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#8a7570]">
                  Rank needed
                </span>
                {own ? (
                  <div className="rounded-xl bg-[#fdf8f6] px-3 py-2">
                    <div className="text-lg font-black tabular-nums text-[#B52326]">
                      {own.lo === own.hi
                        ? fmt(own.lo)
                        : `${fmt(own.lo)} – ${fmt(own.hi)}`}
                    </div>
                    <div className="text-xs leading-snug text-[#7a635d]">
                      Last year, {own.category || "your category"}
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
                    {p.college
                      ? "No closing rank for this college yet."
                      : "Pick a college to see the rank it closed at."}
                  </p>
                )}
                {p.exam && predictorExam ? (
                  <Link href={cutoffsHref} className={linkCls}>
                    {own ? "All cutoffs for you" : "For your category"}{" "}
                    <ArrowRight size={13} />
                  </Link>
                ) : null}
              </div>
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
