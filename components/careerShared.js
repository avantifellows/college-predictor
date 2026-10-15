import StarButton from "./StarButton";
import Link from "next/link";

// The career page's building blocks (shared by /careers/<id>).
const DATA_URL = "/data/careers/careers.json";
let pending = null;
export function loadCareers() {
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

// future-v2's section pattern: a top rule, the number+title in their own
// left column, roomy leading-7 body — the demarcation IS the layout
const ProfileRow = ({ number, title, children }) => (
  <section className="grid gap-3 border-t border-[#eaded8] py-8 md:grid-cols-[200px_1fr] md:gap-10">
    <div>
      <div className="text-xs font-black uppercase tracking-wide text-[#B52326]">
        {number}
      </div>
      <h3 className="mt-1 text-base font-black text-[#2f2320]">{title}</h3>
    </div>
    <div className="min-w-0 text-[15px] leading-7 text-[#5f514c]">
      {children}
    </div>
  </section>
);

const MetricCard = ({ label, sub, value, note }) => {
  if (!value) return null;
  return (
    <div className="min-w-0 rounded-lg border border-[#eaded8] bg-white p-3">
      <div className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-[#8a6d63]">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-bold text-[#2f2320]">
        {value}
      </div>
      {sub ? (
        <div className="mt-0.5 text-[11px] text-[#a89a94]">{sub}</div>
      ) : null}
      {note ? (
        <div className="mt-1.5 text-[11px] leading-snug text-[#7a635d]">
          {note}
        </div>
      ) : null}
    </div>
  );
};

const Chip = ({ children }) => (
  <span className="rounded-full border border-[#eaded8] bg-white px-3 py-1.5 text-xs font-bold text-[#4f403a]">
    {children}
  </span>
);

// sections render in order but SKIP when empty — numbering must follow the
// sections that actually show, not a fixed scheme (Systems Engineering has
// no specialisations and was jumping 05 -> 07)
const NumberedRows = ({ rows }) => {
  let n = 0;
  return rows.filter(Boolean).map(([title, body]) => (
    <ProfileRow key={title} number={String(++n).padStart(2, "0")} title={title}>
      {body}
    </ProfileRow>
  ));
};

const streamsLine = (c) => {
  const st = c.eligible_streams || [];
  if (!st.length || st.includes("All")) return "open to every stream";
  return `open to ${st.join(", ")}`;
};

export const CareerDetail = ({ c }) => (
  <div className="min-w-0">
    {/* title with the exam / college buttons beside it, pay cards below.
        The exam and college lists live on their own tabs, filtered to
        this career; a button shows only when there is something there (an
        exam note with no matching exam still explains the route) */}
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <h2 className="break-words text-3xl font-black leading-tight text-[#2f2320] md:text-4xl">
            {c.name}
          </h2>
          <StarButton
            kind="career"
            id={c.career_id}
            label={c.name}
            extra={{ meta: c.domain }}
            className="mt-1 shrink-0"
          />
        </div>
        <p className="mt-2 text-[15px] text-[#7a635d]">
          {c.domain} · {streamsLine(c)}
        </p>
      </div>
      {c.exam_ids?.length || c.entry_exams_text || c.has_colleges ? (
        <div className="flex flex-wrap gap-2.5 md:shrink-0 md:justify-end md:pt-1">
          {c.exam_ids?.length || c.entry_exams_text ? (
            <Link
              href={`/exams?career=${encodeURIComponent(c.career_id)}`}
              className="inline-flex min-h-[44px] items-center rounded-[10px] bg-[#B52326] px-4 text-sm font-bold text-white transition hover:bg-[#9E1F22]"
            >
              See exams that lead here
            </Link>
          ) : null}
          {c.has_colleges ? (
            <Link
              href={`/colleges?career=${encodeURIComponent(c.career_id)}`}
              className="inline-flex min-h-[44px] items-center rounded-[10px] border-[1.5px] border-[#B52326] px-4 text-sm font-bold text-[#B52326] transition hover:bg-[#fbeeec]"
            >
              See colleges that lead here
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
    <div className="mt-5 grid gap-2 sm:grid-cols-3">
      <MetricCard
        label="Starting pay"
        sub="first 5 years"
        value={c.pay?.start}
        // IIT / NIT graduates out-earn these ranges: engineering careers
        // those institutes teach (reached through JEE), not pilots or the
        // merchant navy
        note={
          c.domain === "Engineering" &&
          c.exams?.some((e) => /^JEE (Main|Advanced)$/.test(e.label))
            ? "This can be much higher for graduates from top colleges like the IITs and NITs."
            : null
        }
      />
      <MetricCard label="Mid-career" sub="5-15 years in" value={c.pay?.mid} />
      <MetricCard label="Senior" sub="15+ years in" value={c.pay?.senior} />
    </div>

    <div className="mt-7">
      <NumberedRows
        rows={[
          c.day_in_life && [
            "A day in the life",
            <p key="d">{c.day_in_life}</p>,
          ],
          c.impact && ["Why it matters", <p key="i">{c.impact}</p>],
          (c.stability || c.automation_risk || c.where_work) && [
            "Career outlook",
            <div key="o" className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="Stability" value={c.stability} />
              <MetricCard label="Automation risk" value={c.automation_risk} />
              <MetricCard label="Where you work" value={c.where_work} />
            </div>,
          ],
          c.recruiters?.length && [
            "Who hires",
            <div key="r" className="flex flex-wrap gap-3">
              {c.recruiters.map((r) => (
                <Chip key={r}>{r}</Chip>
              ))}
            </div>,
          ],
          c.notable_people?.length && [
            "People you may know of",
            <ul key="p" className="space-y-1.5">
              {c.notable_people.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>,
          ],
          c.specializations?.length && [
            "Ways to specialise",
            <dl key="s" className="space-y-3">
              {c.specializations.map((s) => (
                <div key={s.name}>
                  <dt className="font-bold text-[#2f2320]">{s.name}</dt>
                  {s.blurb ? <dd>{s.blurb}</dd> : null}
                </div>
              ))}
            </dl>,
          ],
        ]}
      />

      {c.sources ? (
        <p className="border-t border-[#eaded8] pt-4 text-xs leading-5 text-[#9b8a82]">
          Sources: {c.sources}
        </p>
      ) : null}
    </div>
  </div>
);
