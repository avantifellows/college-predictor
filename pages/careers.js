import React, { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { useStudentProfile } from "../utils/portalSession";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { Search } from "lucide-react";
import { matchesQuery } from "../utils/search";
import useUrlParams from "../utils/useUrlParams";

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

const CareerDetail = ({ c }) => (
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

export default function Careers() {
  const router = useRouter();
  const [all, setAll] = useState([]);
  const [error, setError] = useState(null);
  // list filters live in the URL (shareable; Back returns to them). stream
  // = the 11th-12th stream, values from the sheet's controlled vocabulary
  const [params, setParam, urlReady] = useUrlParams({
    q: "",
    stream: "All",
    domain: "All",
  });
  const { q, stream, domain } = params;
  const setQ = (v) => setParam("q", v);
  const setStream = (v) => setParam("stream", v);
  const setDomain = (v) => setParam("domain", v);
  // a signed-in student's stream pre-selects the class-12 filter (they can
  // still switch it); engineering -> PCM, medical -> PCB, CA -> Commerce.
  // Once, and never over a stream the link already carries.
  const student = useStudentProfile();
  const profileApplied = useRef(false);
  useEffect(() => {
    if (!urlReady || profileApplied.current || !student?.stream) return;
    profileApplied.current = true;
    const map = {
      engineering: "Science (PCM)",
      medical: "Science (PCB)",
      ca: "Commerce",
    };
    if (!router.query.stream && map[student.stream])
      setStream(map[student.stream]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.stream, urlReady]);
  // the list's filters when a career was opened, for "← All careers"
  const listSearch = useRef("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch(DATA_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        setAll(d);
        // /careers#mechanical-engineering — deep link from a branch chip
        const h = window.location.hash.replace("#", "");
        // no hash -> the list page, not a default career
        setSelected(h && d.some((c) => c.career_id === h) ? h : null);
      })
      .catch(() => setError("Could not load careers right now."));
  }, []);

  const filtered = useMemo(() => {
    const raw = q.trim().toLowerCase();
    let rows = all;
    if (domain !== "All") rows = rows.filter((c) => c.domain === domain);
    if (stream !== "All") {
      // a career with "All" in the sheet is open to every stream
      rows = rows.filter(
        (c) =>
          !c.eligible_streams ||
          c.eligible_streams.includes("All") ||
          c.eligible_streams.includes(stream)
      );
    }
    if (!raw) return rows;
    return rows.filter((c) => matchesQuery([c.name, c.domain || ""], raw));
  }, [all, q, stream, domain]);

  // browser back/forward between careers (and back INTO this page from an
  // exam chip) re-selects from the hash
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace("#", "");
      setSelected(h || null);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const current = all.find((c) => c.career_id === selected);
  const domains = useMemo(
    () => [
      "All",
      ...Array.from(new Set(all.map((c) => c.domain).filter(Boolean))).sort(),
    ],
    [all]
  );

  const pick = (id) => {
    listSearch.current = window.location.search;
    setSelected(id);
    window.scrollTo({ top: 0 });
    // shallow PUSH: every pick is a history entry, so the browser's Back
    // walks back through the careers viewed instead of leaving the page.
    // (Raw replaceState once left Next's history at '/careers' and broke
    // returning from an exam chip; shallow keeps Next's record correct.)
    router.push(`/careers#${id}`, undefined, {
      shallow: true,
      scroll: false,
    });
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
      <div className="min-h-screen px-3 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {current ? (
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                window.scrollTo({ top: 0 });
                router.push(`/careers${listSearch.current}`, undefined, {
                  shallow: true,
                  scroll: false,
                });
              }}
              className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#8f2e31] hover:underline"
            >
              ← All careers
            </button>
          ) : null}
          <div className="mx-auto max-w-6xl rounded-2xl border border-[#eee1d7] bg-white p-4 shadow-sm sm:p-8">
            {!current ? (
              <>
                <h1 className="text-center text-3xl font-bold text-[#332724]">
                  Careers
                </h1>
                <p className="mt-2 text-center text-sm text-[#6d5550]">
                  Pay figures are typical ranges from public reports — treat
                  them as direction, not promises.
                </p>
              </>
            ) : null}

            {error ? (
              <p className="py-10 text-center text-sm text-[#8f2e31]">
                {error}
              </p>
            ) : all.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#6d5550]">
                Loading careers…
              </p>
            ) : (
              <>
                {current ? (
                  <div className="mt-1">
                    <CareerDetail c={current} />
                  </div>
                ) : (
                  <>
                    {/* one column, two dropdowns, a numbered list — the
                      side-by-side list + detail read as stuffed to students */}
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#7a635d]">
                          Career domain
                        </span>
                        <Dropdown
                          options={domains.map((d) => ({
                            value: d,
                            label: d === "All" ? "All domains" : d,
                          }))}
                          selectedValue={domain}
                          onChange={(o) => setDomain(o.value)}
                          isSearchable={false}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#7a635d]">
                          Not sure of the domain? Pick your class 12 stream
                        </span>
                        <Dropdown
                          options={[
                            "All",
                            "Science (PCM)",
                            "Science (PCB)",
                            "Commerce",
                            "Arts",
                          ].map((st) => ({
                            value: st,
                            label: st === "All" ? "All streams" : st,
                          }))}
                          selectedValue={stream}
                          onChange={(o) => setStream(o.value)}
                          isSearchable={false}
                        />
                      </label>
                    </div>
                    <div className="relative mt-4">
                      <Search
                        size={14}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#b9a8a2]"
                      />
                      <input
                        type="text"
                        value={q}
                        onChange={(ev) => setQ(ev.target.value)}
                        placeholder="Search careers"
                        className="w-full rounded-xl border border-[#d8c7c1] bg-[#fffdfa] py-2.5 pl-8 pr-3 text-sm text-[#2f2320] outline-none transition placeholder:text-[#7a6159] focus:border-[#b52326]"
                      />
                    </div>
                    <p className="mt-5 text-sm text-[#5b3a34]">
                      Showing{" "}
                      <span className="font-bold">{filtered.length}</span>{" "}
                      career{filtered.length === 1 ? "" : "s"} for you. Click
                      any of them to know more.
                    </p>
                    <ol className="mt-3 overflow-hidden rounded-xl border border-[#eaded8]">
                      <li className="bg-[#f8efec] px-4 py-2 text-[11px] font-black uppercase tracking-wide text-[#5b1f20]">
                        Career
                      </li>
                      {filtered.map((c, i) => (
                        <li
                          key={c.career_id}
                          className="border-t border-[#f0e6e1]"
                        >
                          <button
                            type="button"
                            onClick={() => pick(c.career_id)}
                            className="flex w-full items-baseline gap-4 bg-white px-4 py-3 text-left text-[15px] transition hover:bg-[#fdf8f4]"
                          >
                            <span className="w-7 shrink-0 text-xs tabular-nums text-[#a89a94]">
                              {i + 1}
                            </span>
                            <span className="font-semibold text-[#2f2320]">
                              {c.name}
                            </span>
                            <span className="ml-auto hidden text-xs text-[#a89a94] sm:inline">
                              {c.domain}
                            </span>
                          </button>
                        </li>
                      ))}
                      {filtered.length === 0 ? (
                        <li className="border-t border-[#f0e6e1] bg-white px-4 py-4 text-sm text-[#6d5550]">
                          No careers match these filters.
                        </li>
                      ) : null}
                    </ol>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
