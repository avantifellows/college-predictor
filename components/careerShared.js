import React from "react";
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

const MetricCard = ({ label, sub, value }) => {
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
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
      <div>
        <h2 className="break-words text-3xl font-black leading-tight text-[#2f2320] md:text-4xl">
          {c.name}
        </h2>
        <p className="mt-2 text-[15px] text-[#7a635d]">
          {c.domain} · {streamsLine(c)}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 md:min-w-[340px]">
        <MetricCard
          label="Starting pay"
          sub="first 5 years"
          value={c.pay?.start}
        />
        <MetricCard label="Mid-career" sub="5-15 years in" value={c.pay?.mid} />
        <MetricCard label="Senior" sub="15+ years in" value={c.pay?.senior} />
      </div>
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
          (c.exams?.length || c.entry_exams_text) && [
            "Exams that lead here",
            <div key="e">
              {c.exams?.length ? (
                <div className="mb-3 flex flex-wrap gap-3">
                  {c.exams.map((e) => (
                    <Link
                      key={e.label}
                      href={e.href}
                      className="rounded-full bg-[#f5ece8] px-3 py-1.5 text-xs font-bold text-[#8f2e31] transition hover:bg-[#f3dfd9]"
                    >
                      {e.label}
                    </Link>
                  ))}
                </div>
              ) : null}
              {c.entry_exams_text ? (
                <p className="text-sm leading-6 text-[#7d6b64]">
                  {c.entry_exams_text}
                </p>
              ) : null}
            </div>,
          ],
          (c.college_options?.length || c.top_colleges?.length) && [
            c.college_options?.length ? "Cutoffs" : "Colleges known for it",
            <div key="c">
              <CollegeOptions c={c} />
            </div>,
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

// a college that exists on the Colleges tab links there, pre-searched with
// the tab's own display name (so "IIT Delhi" actually finds it); colleges
// outside the tab's coverage (BITS, Jadavpur…) stay plain text
const CollegeName = ({ name, q }) =>
  q ? (
    <Link
      href={`/colleges?q=${encodeURIComponent(q)}`}
      className="underline decoration-[#e3d1cb] underline-offset-2 transition hover:text-[#8f2e31] hover:decoration-[#8f2e31]"
    >
      {name}
    </Link>
  ) : (
    name
  );

const CollegeOptions = ({ c }) => (
  <>
    {c.college_options?.length ? (
      <>
        <div className="hidden overflow-hidden rounded-lg border border-[#eaded8] md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f8efec] text-xs uppercase text-[#6b5a53]">
              <tr>
                <th className="px-3 py-2">College</th>
                <th className="px-3 py-2">Branch</th>
                <th className="px-3 py-2">Exam</th>
                <th className="px-3 py-2">Closing cutoff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaded8]">
              {c.college_options.map((o, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 font-semibold text-[#2f2320]">
                    <CollegeName name={o.college} q={o.q} />
                  </td>
                  <td className="px-3 py-2 text-[#5f514c]">{o.branch}</td>
                  <td className="px-3 py-2 text-[#5f514c]">{o.exam}</td>
                  <td className="px-3 py-2 font-bold tabular-nums text-[#2f2320]">
                    {o.closing}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 md:hidden">
          {c.college_options.map((o, i) => (
            <div
              key={i}
              className="rounded-lg border border-[#eaded8] bg-[#fdf8f6] p-3"
            >
              <div className="break-words text-sm font-bold text-[#2f2320]">
                <CollegeName name={o.college} q={o.q} />
              </div>
              <div className="mt-0.5 text-sm text-[#5f514c]">{o.branch}</div>
              <div className="mt-1 text-sm text-[#5f514c]">
                {o.exam} · closed at{" "}
                <span className="font-bold text-[#2f2320]">{o.closing}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs leading-5 text-[#9b8a82]">
          The toughest closing cutoff we hold per college — each number is on
          its own exam&apos;s scale, so never compare across exams. Check your
          own chances on the{" "}
          <Link href="/predictor" className="underline hover:text-[#8f2e31]">
            College Predictor
          </Link>
          .
        </p>
      </>
    ) : (
      <>
        <p>
          {c.top_colleges.map((t, i) => (
            <React.Fragment key={t.name}>
              {i > 0 ? ", " : ""}
              <CollegeName name={t.name} q={t.q} />
            </React.Fragment>
          ))}
        </p>
        <p className="mt-2 text-xs leading-5 text-[#9b8a82]">
          No college admits into this field directly at UG level in the cutoff
          data we hold — the usual route is a related branch first (see the
          exams note above).
        </p>
      </>
    )}
    {/* honest label: /colleges is an information tab, there is no
        comparison tool (yet) */}
    <Link
      href={`/colleges?career=${encodeURIComponent(c.career_id)}`}
      className="mt-2 inline-block text-sm text-[#8f2e31] underline hover:text-[#B52326]"
    >
      Colleges offering this
    </Link>
  </>
);
