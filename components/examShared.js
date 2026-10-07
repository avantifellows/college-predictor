import Link from "next/link";
import { ExternalLink } from "lucide-react";

// Pieces shared by the exams list and the exam page.
const DATA_URL = "/data/exams/exams.json";
let pending = null;
export function loadExams() {
  if (!pending) {
    pending = fetch(DATA_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .catch((err) => {
        pending = null;
        throw err;
      });
  }
  return pending;
}

export const Dash = () => <span className="text-[#b9a8a2]">—</span>;

export const fmtFee = (e) => {
  if (e.fee_number) return `₹${e.fee_number.toLocaleString("en-IN")}`;
  return e.fee_display || null;
};

/** Label/value line used in the expander — left-aligned so long fuzzy
 *  dates ("3rd week of December/ 1st week of February") read as prose. */
export const DetailRow = ({ label, children }) => (
  <div className="grid grid-cols-[6.5rem_1fr] gap-2">
    <dt className="text-[#6d5550]">{label}</dt>
    <dd>{children}</dd>
  </div>
);

/** Timeline, format, eligibility, pattern, what it leads to, and the links. */
export const ExamDetailBody = ({ e }) => (
  <div className="grid gap-6 md:grid-cols-5">
    <div className="space-y-5 md:col-span-2">
      <div>
        <h4 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-[#8f2e31]">
          Typical timeline
        </h4>
        <dl className="space-y-1 text-sm text-[#5b3a34]">
          {e.forms_out ? (
            <DetailRow label="Forms out">{e.forms_out}</DetailRow>
          ) : null}
          {e.last_date ? (
            <DetailRow label="Last date">{e.last_date}</DetailRow>
          ) : null}
          {e.test_date ? (
            <DetailRow label="Test">{e.test_date}</DetailRow>
          ) : null}
        </dl>
      </div>
      <div>
        <h4 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-[#8f2e31]">
          Test format
        </h4>
        <dl className="space-y-1 text-sm text-[#5b3a34]">
          {e.mode ? <DetailRow label="Mode">{e.mode}</DetailRow> : null}
          {e.duration ? (
            <DetailRow label="Duration">{e.duration}</DetailRow>
          ) : null}
          {e.marking ? (
            <DetailRow label="Marking">
              <span className="tabular-nums">{e.marking}</span>
            </DetailRow>
          ) : null}
          {e.degrees?.length ? (
            <DetailRow label="Degrees">{e.degrees.join(", ")}</DetailRow>
          ) : null}
        </dl>
      </div>
    </div>
    <div className="space-y-5 md:col-span-3">
      {e.eligibility ? (
        <div>
          <h4 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-[#8f2e31]">
            Eligibility
          </h4>
          <p className="text-sm leading-6 text-[#5b3a34]">{e.eligibility}</p>
        </div>
      ) : null}
      {e.pattern_rows?.length || e.pattern ? (
        <div>
          <h4 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-[#8f2e31]">
            Paper pattern
          </h4>
          {e.pattern_rows?.length ? (
            <dl className="max-w-md space-y-1 text-sm text-[#5b3a34]">
              {e.pattern_rows.map(([label, count], i) => (
                <div
                  key={i}
                  className={`flex justify-between gap-3 ${
                    label === "Total"
                      ? "border-t border-[#e3d1cb] pt-1 font-semibold"
                      : ""
                  }`}
                >
                  <dt>{label}</dt>
                  <dd className="whitespace-nowrap tabular-nums">{count}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm leading-6 text-[#5b3a34]">{e.pattern}</p>
          )}
          {e.pattern_note ? (
            <p className="mt-1.5 text-xs leading-5 text-[#6d5550]">
              {e.pattern_note}
            </p>
          ) : null}
        </div>
      ) : null}
      {e.remarks ? (
        <p className="text-sm leading-6 text-[#5b3a34]">{e.remarks}</p>
      ) : null}
      {e.careers?.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#8f2e31]">
            Leads to
          </span>
          {e.careers.map((c) => (
            <Link
              key={c.slug}
              href={`/careers/${c.slug}`}
              className="rounded-full bg-[#f5ece8] px-2.5 py-1 text-xs font-bold text-[#8f2e31] transition hover:bg-[#f3dfd9]"
            >
              {c.label}
            </Link>
          ))}
        </div>
      ) : null}
      {e.replaces?.length ? (
        <p className="text-xs leading-5 text-[#6d5550]">
          Replaces: {e.replaces.map((r) => r.split(" (")[0]).join(", ")}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {e.predictor_exam ? (
          <Link
            href={`/predictor?exam=${encodeURIComponent(e.predictor_exam)}`}
            className="inline-flex items-center gap-1 rounded-full bg-[#B52326] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#8f2e31]"
          >
            Predict your colleges
          </Link>
        ) : null}
        {e.colleges_link ? (
          <Link
            href={e.colleges_link}
            className="text-xs text-[#6d5550] underline hover:text-[#8f2e31]"
          >
            Colleges accepting it
          </Link>
        ) : null}
        {e.url ? (
          <a
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#6d5550] underline hover:text-[#8f2e31]"
          >
            Official site <ExternalLink size={12} />
          </a>
        ) : null}
        {e.open_data_id ? (
          <Link
            href={`/datasets#${e.open_data_id}`}
            className="text-xs text-[#6d5550] underline hover:text-[#8f2e31]"
          >
            Open data
          </Link>
        ) : null}
      </div>
    </div>
  </div>
);
