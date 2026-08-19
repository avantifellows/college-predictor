import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { ChevronDown, ChevronUp, ExternalLink, Search } from "lucide-react";

// The College tab: pure information display, one row per college.
//
// Deliberately NOT a cutoff tool — that is the College Predictor's job, and the
// CTA on each row hands off to it. What lives here is everything a student asks
// *about a college* once a rank has told them it is reachable: where it is, how
// it ranks, what graduates earn, and what it actually teaches.
//
// Layout follows Amogh's spec (2026-08-19): must-haves immediately visible in
// the table, good-to-haves present but behind an expander so the table stays
// scannable on a phone.

const DATA_URL = "/data/colleges/colleges.json";
const PAGE_SIZE = 25;
// NIRF publishes yearly; a rank from an older cycle means the college has not
// appeared in the ranked band since, which is worth showing rather than hiding.
const LATEST_NIRF = 2025;

const fmtSalary = (v) => {
  if (v === null || v === undefined) return null;
  // Indian students read lakhs, not 1,400,000.
  const lakh = v / 100000;
  return lakh >= 100
    ? `₹${(lakh / 100).toFixed(2)} Cr`
    : `₹${lakh.toFixed(1)} L`;
};

const Dash = () => <span className="text-[#b9a8a2]">—</span>;

/** A single college row plus its expandable detail. */
const CollegeRow = ({ c, index, expanded, onToggle }) => {
  const nirf = c.nirf;
  const pl = c.placement;
  return (
    <>
      <tr
        className={`border-b border-[#eaded8] text-xs sm:text-sm ${
          index % 2 === 0 ? "bg-[#fffdfa]" : "bg-white"
        }`}
      >
        <td className="px-3 py-3 align-top">
          <button
            type="button"
            onClick={onToggle}
            className="text-left font-semibold text-[#332724] hover:text-[#8f2e31]"
          >
            {c.display_name}
          </button>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#6d5550]">
            {c.entrance_exams.map((e) => (
              <span
                key={e}
                className="rounded-full border border-[#e3d1cb] bg-white px-1.5 py-0.5"
              >
                {e}
              </span>
            ))}
            {c.kind ? <span>{c.kind}</span> : null}
          </div>
        </td>
        <td className="px-3 py-3 align-top text-[#5b3a34]">
          {c.state ? (
            <>
              {c.district ? `${c.district}, ` : ""}
              {c.state}
              {c.state_is_inferred ? (
                <span title="Location read from the JoSAA institute name; not yet matched to AISHE">
                  {" "}
                  *
                </span>
              ) : null}
            </>
          ) : (
            <Dash />
          )}
        </td>
        <td className="px-3 py-3 align-top tabular-nums">
          {nirf ? (
            <>
              <span className="font-semibold text-[#332724]">#{nirf.engineering_rank}</span>
              {(() => {
                // Direction against LAST year, so a student sees movement in the
                // table without expanding. A LOWER rank number is better, so a
                // negative delta is an improvement — shown as "▲" to match the
                // intuition, not the arithmetic.
                const h = [...nirf.rank_history].sort((a, b) => b.year - a.year);
                if (h.length < 2) return null;
                const d = h[1].rank - h[0].rank;
                // Suppress moves of one or two places. Year-to-year rank churn
                // in a league table is largely noise — Sorz et al. measure it at
                // under 10% in the top 50 rising to 60% in lower bands — and a
                // "▼1" invites a student to read signal into a coin flip. The
                // Premier League table does the same, printing "–" for a
                // one-place shuffle. 11 of our 58 ranked colleges sit here.
                if (Math.abs(d) <= 2) return null;
                return (
                  <span
                    className="ml-1 text-[11px] font-medium text-[#6d5550]"
                    title={`${h[0].year}: #${h[0].rank} vs ${h[1].year}: #${h[1].rank}`}
                  >
                    {d > 0 ? `▲${d}` : `▼${Math.abs(d)}`}
                  </span>
                );
              })()}
              {nirf.ranking_year < LATEST_NIRF ? (
                <span
                  className="ml-1 text-[11px] font-normal text-[#6d5550]"
                  title={`Last ranked in NIRF ${nirf.ranking_year}; not in the ranked band since`}
                >
                  ({nirf.ranking_year})
                </span>
              ) : null}
            </>
          ) : (
            <Dash />
          )}
        </td>
        <td className="px-3 py-3 align-top tabular-nums">
          {pl?.median_salary ? (
            <span className="font-semibold text-[#332724]">{fmtSalary(pl.median_salary)}</span>
          ) : (
            <Dash />
          )}
        </td>
        <td className="px-3 py-3 align-top tabular-nums">
          {pl?.percentage_placed != null ? `${pl.percentage_placed}%` : <Dash />}
        </td>
        <td className="px-3 py-3 align-top">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 rounded-full border border-[#e3d1cb] bg-white px-3 py-1.5 text-xs font-semibold text-[#8f2e31] transition hover:bg-[#f8efec]"
          >
            {expanded ? "Less" : "More"}
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </td>
      </tr>

      {expanded ? (
        <tr className="border-b border-[#eaded8] bg-[#fdf8f5]">
          <td colSpan={6} className="px-3 py-5 sm:px-5">
            <div className="grid gap-6 md:grid-cols-10">
              {/* ── programs: the only field with 100% coverage, so it leads ── */}
              <div className="md:col-span-7">
                <h4 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[#8f2e31]">
                  Programs offered ({c.programs.count})
                </h4>
                {c.programs.count ? (
                  <>
                    <div className="rounded-lg border border-[#eaded8] bg-white">
                      <table className="w-full text-sm">
                        <thead className="bg-[#f8efec] text-[#5b1f20]">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-semibold">Branch</th>
                            <th className="px-2 py-1.5 text-left font-semibold">Degree</th>
                            <th className="px-2 py-1.5 text-right font-semibold">
                              Closing rank
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.programs.list.map((p, i) => (
                            <tr key={`${p.branch}-${p.degree}-${i}`} className="border-t border-[#f0e6e1]">
                              <td className="px-2 py-1.5 text-[#332724]">{p.branch}</td>
                              <td className="px-2 py-1.5 text-[#6d5550]">
                                {p.degree}
                                {p.years ? ` · ${p.years} yr` : ""}
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums text-[#332724]">
                                {p.indicative_closing_rank ?? <Dash />}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </>
                ) : (
                  <p className="text-sm text-[#6d5550]">Not available.</p>
                )}
              </div>

              <div className="space-y-5 md:col-span-3">
                {nirf?.rank_history?.length > 1 ? (
                  <div>
                    <h4 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-[#8f2e31]">
                      NIRF rank and score
                    </h4>
                    <NirfTrend history={nirf.rank_history} />
                    <p className="mt-1.5 text-xs leading-5 text-[#6d5550]">
                      Bars show NIRF score out of 100.
                    </p>
                  </div>
                ) : null}

                {pl ? (
                  <div>
                    <h4 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-[#8f2e31]">
                      Placement detail
                    </h4>
                    <dl className="space-y-1 text-sm text-[#5b3a34]">
                      {pl.students_placed != null ? (
                        <div className="flex justify-between gap-3">
                          <dt>Students placed</dt>
                          <dd className="tabular-nums">{pl.students_placed}</dd>
                        </div>
                      ) : null}
                      {pl.higher_studies_selected != null ? (
                        <div className="flex justify-between gap-3">
                          <dt>Went to higher studies</dt>
                          <dd className="tabular-nums">{pl.higher_studies_selected}</dd>
                        </div>
                      ) : null}
                      {pl.first_year_intake != null ? (
                        <div className="flex justify-between gap-3">
                          <dt>First-year intake</dt>
                          <dd className="tabular-nums">{pl.first_year_intake}</dd>
                        </div>
                      ) : null}
                    </dl>
                    <p className="mt-1.5 text-xs leading-5 text-[#6d5550]">
                      NIRF {pl.ranking_year}, UG 4-year · AY {pl.academic_year}
                    </p>
                  </div>
                ) : null}

                <div>
                  <h4 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-[#8f2e31]">
                    About
                  </h4>
                  <dl className="space-y-1 text-sm text-[#5b3a34]">
                    {c.year_established ? (
                      <div className="flex justify-between gap-3">
                        <dt>Established</dt>
                        <dd className="tabular-nums">{c.year_established}</dd>
                      </div>
                    ) : null}
                    {c.management ? (
                      <div className="flex justify-between gap-3">
                        <dt>Management</dt>
                        <dd className="text-right">{c.management}</dd>
                      </div>
                    ) : null}
                    <div className="flex justify-between gap-3">
                      <dt>NAAC grade</dt>
                      <dd className="text-right">
                        {c.naac.grade ? (
                          <>
                            {c.naac.grade}
                            {c.naac.cgpa ? ` · ${c.naac.cgpa}` : ""}
                          </>
                        ) : c.naac.not_applicable_reason ? (
                          <span title={c.naac.not_applicable_reason}>Not applicable</span>
                        ) : (
                          <Dash />
                        )}
                      </dd>
                    </div>
                  </dl>
                  {c.website ? (
                    <a
                      href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#8f2e31] hover:underline"
                    >
                      Official website <ExternalLink size={12} />
                    </a>
                  ) : null}
                </div>


              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
};


// Students type "NIT Raipur", "IIT B" — never "National Institute of Technology
// Raipur". Expand the common abbreviations before matching so the search works
// the way people actually refer to these colleges.
const ABBREV = [
  [/\bnit\b/g, "national institute of technology"],
  [/\biiit\b/g, "indian institute of information technology"],
  [/\biit\b/g, "indian institute of technology"],
];

const expand = (q) => {
  let out = q;
  for (const [re, full] of ABBREV) out = out.replace(re, full);
  return out;
};

/** NIRF trend: a bar per year on the SCORE, with the rank labelled beside it.
 *
 *  Score, not rank, drives the bars. Rank is ordinal — it moves when OTHER
 *  institutes move — so charting it can invert the story: IIT Ropar's score rose
 *  55.95 -> 59.66 since 2020 while its rank fell #25 -> #32. It improved; the
 *  field improved faster. Score is a property of the college itself, is present
 *  on every Engineering row, and is comparable year to year (the rank-1 score is
 *  88-90 in every cycle).
 *
 *  Bars rather than a line, because bars need no inverted axis to read: longer
 *  is plainly better. Scaled 0-100 (NIRF's own range) so bar length means the
 *  same thing on every college, not just within one card.
 */
const NirfTrend = ({ history }) => {
  const pts = [...history].sort((a, b) => b.year - a.year);
  if (!pts.length) return null;
  return (
    <table className="w-full text-sm tabular-nums">
      <tbody>
        {pts.map((h) => (
          <tr key={h.year}>
            <td className="py-0.5 pr-2 text-[#6d5550]">{h.year}</td>
            <td className="py-0.5 pr-2 font-semibold text-[#332724]">#{h.rank}</td>
            <td className="w-full py-0.5">
              {h.score != null ? (
                <div className="flex items-center gap-1.5">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f0e6e1]">
                    <div
                      className="h-full rounded-full bg-[#8f2e31]"
                      style={{ width: `${Math.max(2, Math.min(100, h.score))}%` }}
                    />
                  </div>
                  <span className="w-9 text-right text-xs text-[#6d5550]">
                    {h.score.toFixed(1)}
                  </span>
                </div>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const SORTS = {
  nirf: { label: "NIRF rank", fn: (a, b) => (a.nirf?.engineering_rank ?? 9e9) - (b.nirf?.engineering_rank ?? 9e9) },
  salary: { label: "Median salary", fn: (a, b) => (b.placement?.median_salary ?? -1) - (a.placement?.median_salary ?? -1) },
  placed: { label: "% placed", fn: (a, b) => (b.placement?.percentage_placed ?? -1) - (a.placement?.percentage_placed ?? -1) },
  name: { label: "Name (A–Z)", fn: (a, b) => a.display_name.localeCompare(b.display_name) },
};

const Colleges = () => {
  const [all, setAll] = useState([]);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [state, setState] = useState("All");
  const [exam, setExam] = useState("All");
  const [sortKey, setSortKey] = useState("nirf");
  const [expanded, setExpanded] = useState({});
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    fetch(DATA_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setAll)
      .catch(() => setError("Could not load the college list right now."));
  }, []);

  const states = useMemo(
    () => ["All", ...Array.from(new Set(all.map((c) => c.state).filter(Boolean))).sort()],
    [all]
  );
  const exams = useMemo(
    () => ["All", ...Array.from(new Set(all.flatMap((c) => c.entrance_exams))).sort()],
    [all]
  );

  const filtered = useMemo(() => {
    const raw = q.trim().toLowerCase();
    // Match on either the literal text or its abbreviation-expanded form, so
    // "NIT Raipur" and "National Institute of Technology Raipur" both work.
    const needles = raw ? Array.from(new Set([raw, expand(raw)])) : [];
    const needle = raw;
    const out = all.filter((c) => {
      if (state !== "All" && c.state !== state) return false;
      if (exam !== "All" && !c.entrance_exams.includes(exam)) return false;
      if (!needle) return true;
      // Search the branch list too: "who teaches Aerospace" is a real question,
      // and the branch names are the richest text we hold.
      const hay = [
        c.display_name,
        c.state || "",
        c.district || "",
        ...c.programs.list.map((p) => p.branch),
      ]
        .join(" ")
        .toLowerCase();
      return needles.some((n) => hay.includes(n));
    });
    return out.sort(SORTS[sortKey].fn);
  }, [all, q, state, exam, sortKey]);

  useEffect(() => setShown(PAGE_SIZE), [q, state, exam, sortKey]);

  const th = "px-3 py-2 text-left text-xs font-semibold text-[#5b1f20]";

  return (
    <>
      <Head>
        <title>Colleges - Avanti Fellows</title>
        <meta
          name="description"
          content="Engineering colleges in JoSAA counselling — location, NIRF rank, placement outcomes, and the programs each one offers."
        />
      </Head>

      <div className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-4">
        <div className="rounded-2xl border border-[#eaded8] bg-white p-4 shadow-sm sm:p-6">
          <h1 className="text-center text-2xl font-bold text-[#332724] sm:text-3xl">
            Colleges
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm leading-6 text-[#6d5550]">
            Closing ranks here are indicative and open-category. For full
            cutoffs, use the{" "}
            <Link href="/" className="font-semibold text-[#8f2e31] hover:underline">
              College Predictor
            </Link>
            .
          </p>
          {/* ── controls ─────────────────────────────────────────────── */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#b9a8a2]"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a college, city, or branch"
                className="w-full rounded-xl border border-[#d8c7c1] bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#b52326] focus:ring-2 focus:ring-[#f4d5d6]"
              />
            </div>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="rounded-xl border border-[#d8c7c1] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#b52326]"
            >
              {states.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All states" : `State: ${s}`}
                </option>
              ))}
            </select>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="rounded-xl border border-[#d8c7c1] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#b52326]"
            >
              {Object.entries(SORTS).map(([k, v]) => (
                <option key={k} value={k}>
                  Sort: {v.label}
                </option>
              ))}
            </select>
          </div>

          {exams.length > 2 ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-[#5b1f20]">Entrance test:</span>
              {exams.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setExam(e)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    exam === e
                      ? "border-[#8f2e31] bg-[#8f2e31] text-white"
                      : "border-[#e3d1cb] bg-white text-[#5b3a34] hover:bg-[#f8efec]"
                  }`}
                >
                  {e === "All" ? "Any" : e}
                </button>
              ))}
            </div>
          ) : null}

          {error ? (
            <p className="py-10 text-center text-sm text-red-600">{error}</p>
          ) : !all.length ? (
            <p className="py-10 text-center text-sm text-[#6d5550]">Loading colleges…</p>
          ) : (
            <>
              <p className="mt-4 text-sm text-[#5b3a34]">
                Showing {Math.min(shown, filtered.length)} of {filtered.length}{" "}
                {filtered.length === 1 ? "college" : "colleges"}
              </p>

              <div className="mt-2 overflow-x-auto rounded-xl border border-[#eaded8]">
                <table className="w-full min-w-[760px] border-collapse">
                  <thead className="bg-[#f8efec]">
                    <tr>
                      <th className={th}>College</th>
                      <th className={th}>Location</th>
                      <th className={th}>NIRF</th>
                      <th className={th}>Median salary</th>
                      <th className={th}>Placed</th>
                      <th className={th} />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, shown).map((c, i) => (
                      <CollegeRow
                        key={c.college_id}
                        c={c}
                        index={i}
                        expanded={!!expanded[c.college_id]}
                        onToggle={() =>
                          setExpanded((p) => ({
                            ...p,
                            [c.college_id]: !p[c.college_id],
                          }))
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {shown < filtered.length ? (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setShown((s) => s + PAGE_SIZE)}
                    className="rounded-full border border-[#8f2e31] px-5 py-2 text-sm font-semibold text-[#8f2e31] transition hover:bg-[#f8efec]"
                  >
                    Show {Math.min(PAGE_SIZE, filtered.length - shown)} more
                  </button>
                </div>
              ) : null}

              {filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#6d5550]">
                  No colleges match. Try clearing the state or entrance-test filter.
                </p>
              ) : null}

              <p className="mt-6 border-t border-[#eaded8] pt-3 text-[11px] leading-5 text-[#6d5550]">
                Sources: AISHE 2024-25 (identity) · NIRF 2025 (rank, placement) ·
                NAAC (accreditation) · JoSAA 2025 (branches). A dash means we do
                not have that figure.
              </p>

            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Colleges;
