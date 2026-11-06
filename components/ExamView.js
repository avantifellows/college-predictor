import Link from "next/link";
import StarButton from "./StarButton";
import { CalendarDays, IndianRupee, MapPin } from "lucide-react";
import BackLink from "./BackLink";
import { Dash, ExamDetailBody, RunByTag, fmtFee, openTo } from "./examShared";

// What an exam page shows (pages/exams/[id].js loads the data). Pure, so
// scripts/check-pages can render every exam.

const InfoCard = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-2 rounded-xl border border-[#eaded8] bg-white px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
    <Icon size={17} className="mt-0.5 shrink-0 text-[#B52326]" />
    <div className="min-w-0">
      <div className="text-[11px] font-bold uppercase tracking-wide text-[#8f2e31]">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-[#2f2320]">
        {children}
      </div>
    </div>
  </div>
);

export default function ExamView({ e, back = "/exams", backSlot }) {
  const scope =
    e.scope_state && e.scope_type === "University"
      ? `${e.scope} · ${e.scope_state}`
      : e.scope;

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {backSlot || <BackLink href={back}>All exams</BackLink>}

        <div className="mt-4 rounded-2xl border border-[#eaded8] bg-white p-4 sm:p-6">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#B52326]">
            Entrance exam <RunByTag e={e} />
          </div>
          <div className="mt-1 flex items-start justify-between gap-3">
            <h1 className="text-2xl font-black leading-tight text-[#2f2320] sm:text-3xl">
              {e.name}
            </h1>
            <StarButton
              kind="exam"
              id={e.exam_id}
              label={e.name}
              extra={{ meta: e.test_month ? `Test: ${e.test_month}` : null }}
              className="shrink-0"
            />
          </div>
          {e.streams?.length ? (
            <p className="mt-1 text-sm text-[#6d5550]">
              {e.streams.join(" · ")}
            </p>
          ) : null}
          {/* the university or institute behind its own test (BITSAT ->
              BITS Pilani); a state CET's scope is just its state */}
          {e.scope_type === "University" && scope ? (
            <p className="mt-1 text-sm text-[#6d5550]">Conducted by {scope}</p>
          ) : null}

          {/* the next step, up top: the colleges this exam gets you into */}
          {e.predictor_exam || e.colleges_link ? (
            <div className="mt-4 flex flex-wrap gap-2.5">
              {e.predictor_exam ? (
                <Link
                  href={`/predictor?exam=${encodeURIComponent(
                    e.predictor_exam
                  )}&examId=${encodeURIComponent(e.exam_id)}`}
                  className="inline-flex min-h-[44px] items-center rounded-[10px] bg-[#B52326] px-4 text-sm font-bold text-white transition hover:bg-[#9E1F22]"
                >
                  Predict your colleges
                </Link>
              ) : null}
              {e.colleges_link ? (
                <Link
                  href={e.colleges_link}
                  className="inline-flex min-h-[44px] items-center rounded-[10px] border-[1.5px] border-[#B52326] px-4 text-sm font-bold text-[#B52326] transition hover:bg-[#fbeeec]"
                >
                  Colleges accepting it
                </Link>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <InfoCard icon={MapPin} label="Open to">
              {openTo(e) || scope || <Dash />}
            </InfoCard>
            <InfoCard icon={CalendarDays} label="Test month">
              {e.test_month || <Dash />}
            </InfoCard>
            <InfoCard icon={IndianRupee} label="Application fee">
              {fmtFee(e) || <Dash />}
            </InfoCard>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#eaded8] bg-white p-4 sm:p-6">
          <ExamDetailBody e={e} />
        </div>

        <p className="mt-4 text-xs text-[#6d5550]">
          Dates are the typical cycle, not this year&apos;s. Always confirm on
          the official site.
        </p>
      </div>
    </div>
  );
}
