import { CalendarDays, IndianRupee, MapPin } from "lucide-react";
import BackLink from "./BackLink";
import { Dash, ExamDetailBody, fmtFee } from "./examShared";

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
          <div className="text-xs font-black uppercase tracking-wide text-[#B52326]">
            Entrance exam
          </div>
          <h1 className="mt-1 text-2xl font-black leading-tight text-[#2f2320] sm:text-3xl">
            {e.name}
          </h1>
          {e.streams?.length ? (
            <p className="mt-1 text-sm text-[#6d5550]">
              {e.streams.join(" · ")}
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <InfoCard icon={MapPin} label="For">
              {scope || <Dash />}
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
