import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";

const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

// The Careers tab: one page per career, the answer to "what does this field
// actually look like". Content is Amogh's career sheet; the "Exams that lead
// here" chips are REAL joins (career -> branch taxonomy -> which entrance
// exams offer that branch in their cutoff tables), not hand-picked lists.

const DATA_URL = "/data/careers/careers.json";

// future-v2's section pattern: a top rule, the number+title in their own
// left column, roomy leading-7 body — the demarcation IS the layout
const ProfileRow = ({ number, title, children }) => (
  <section className="grid gap-3 border-t border-[#eaded8] py-6 md:grid-cols-[180px_1fr] md:gap-8">
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

const MetricCard = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="min-w-0 rounded-lg border border-[#eaded8] bg-white p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-[#8a6d63]">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-bold text-[#2f2320]">
        {value}
      </div>
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

const CareerDetail = ({ c }) => (
  <div className="min-w-0">
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-[#B52326]">
          Career
        </div>
        <h2 className="mt-2 break-words text-3xl font-black leading-tight text-[#2f2320] md:text-4xl">
          {c.name}
        </h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 md:min-w-[340px]">
        <MetricCard label="Starting pay" value={c.pay?.start} />
        <MetricCard label="Mid-career" value={c.pay?.mid} />
        <MetricCard label="Senior" value={c.pay?.senior} />
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
            c.college_options?.length
              ? "Colleges and real cutoffs"
              : "Colleges known for it",
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
                    {o.college}
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
                {o.college}
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
          <Link href="/" className="underline hover:text-[#8f2e31]">
            College Predictor
          </Link>
          .
        </p>
      </>
    ) : (
      <>
        <p>{c.top_colleges.join(", ")}</p>
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
      href="/colleges"
      className="mt-2 inline-block text-sm text-[#8f2e31] underline hover:text-[#B52326]"
    >
      Browse all colleges
    </Link>
  </>
);

export default function Careers() {
  const [all, setAll] = useState([]);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch(DATA_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        setAll(d);
        // /careers#mechanical-engineering — deep link from a branch chip
        const h = window.location.hash.replace("#", "");
        setSelected(
          h && d.some((c) => c.career_id === h) ? h : d[0]?.career_id
        );
      })
      .catch(() => setError("Could not load careers right now."));
  }, []);

  const filtered = useMemo(() => {
    const raw = q.trim().toLowerCase();
    if (!raw) return all;
    return all.filter((c) =>
      raw.split(/\s+/).every((w) => c.name.toLowerCase().includes(w))
    );
  }, [all, q]);

  // browser back/forward between careers (and back INTO this page from an
  // exam chip) re-selects from the hash
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace("#", "");
      if (h) setSelected(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const current = all.find((c) => c.career_id === selected);

  const pick = (id) => {
    setSelected(id);
    // keep the URL shareable — PRESERVE history.state: Next.js stores its
    // route data there, and nulling it breaks the browser back button
    window.history.replaceState(window.history.state, "", `#${id}`);
  };

  return (
    <>
      <Head>
        <title>Careers - Avanti Fellows</title>
        <meta
          name="description"
          content="What each career actually looks like: day-to-day work, pay, recruiters, and the entrance exams that lead there."
        />
      </Head>
      <div className="min-h-screen bg-[#faf5ef] px-3 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-[#eee1d7] bg-white p-4 shadow-sm sm:p-8">
          <h1 className="text-center text-3xl font-bold text-[#332724]">
            Careers
          </h1>
          <p className="mt-2 text-center text-sm text-[#6d5550]">
            Pay figures are typical ranges from public reports — treat them as
            direction, not promises.
          </p>

          {error ? (
            <p className="py-10 text-center text-sm text-[#8f2e31]">{error}</p>
          ) : all.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#6d5550]">
              Loading careers…
            </p>
          ) : (
            <div className="mt-6 gap-8 md:grid md:grid-cols-[16rem_1fr]">
              {/* phone: one picker; desktop: searchable list */}
              <div className="mb-6 md:hidden">
                <Dropdown
                  options={all.map((c) => ({
                    value: c.career_id,
                    label: c.name,
                  }))}
                  selectedValue={selected}
                  onChange={(o) => pick(o.value)}
                  className="w-full"
                  hideValueWhileSearching
                />
              </div>
              <div className="hidden md:block md:border-r md:border-[#eaded8] md:pr-5">
                <div className="relative mb-3">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#b9a8a2]"
                  />
                  <input
                    type="text"
                    value={q}
                    onChange={(ev) => setQ(ev.target.value)}
                    placeholder="Search careers"
                    className="w-full rounded-xl border border-[#d8c7c1] bg-[#fffdfa] py-2 pl-8 pr-3 text-sm text-[#2f2320] outline-none transition placeholder:text-[#7a6159] focus:border-[#b52326]"
                  />
                </div>
                <nav className="max-h-[70vh] space-y-0.5 overflow-y-auto pr-1">
                  {filtered.map((c) => (
                    <button
                      key={c.career_id}
                      type="button"
                      onClick={() => pick(c.career_id)}
                      className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition ${
                        selected === c.career_id
                          ? "bg-[#f8efec] font-semibold text-[#8f2e31]"
                          : "text-[#5b3a34] hover:bg-[#fdf8f4]"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                  {filtered.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-[#6d5550]">
                      No careers match.
                    </p>
                  ) : null}
                </nav>
              </div>
              <div className="min-w-0">
                {current ? <CareerDetail c={current} /> : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
