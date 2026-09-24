import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  Search,
} from "lucide-react";
import { matchesQuery } from "../utils/search";

// The app's shared react-select wrapper — searchable, so a 30-state list can be
// narrowed by typing. A native <select> only jumps on the first letter, which is
// unusable at this length.
const Dropdown = dynamic(() => import("../components/dropdown"), {
  ssr: false,
});

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

// NIRF publishes separate lists; their names as a student should read them
export const nirfListLabel = (category) =>
  ({
    College: "Degree colleges",
    Research: "Research",
    Overall: "Overall",
  }[category] ||
  category ||
  "Engineering");

// Fees span ₹8,760 to ₹4.6L a year — below a lakh, "₹0.2 L" reads worse
// than the plain rupee figure.
const fmtFee = (v) => {
  if (v === null || v === undefined) return null;
  return v >= 100000
    ? `₹${(v / 100000).toFixed(1)} L`
    : `₹${v.toLocaleString("en-IN")}`;
};

const fmtSalary = (v) => {
  if (v === null || v === undefined) return null;
  // Indian students read lakhs, not 1,400,000.
  const lakh = v / 100000;
  return lakh >= 100
    ? `₹${(lakh / 100).toFixed(2)} Cr`
    : `₹${lakh.toFixed(1)} L`;
};

const Dash = () => <span className="text-[#b9a8a2]">—</span>;

// the programs table's number column(s). One column per card normally; a
// card mixing annual seats (MBBS) and closing ranks (AIIMS nursing) gets
// both, so a rank never sits under an "Annual seats" header.
const valueCols = (list) => {
  const score = list.some((p) => p.indicative_min_score != null);
  const rank = list.some((p) => p.indicative_closing_rank != null);
  const seats = list.some((p) => p.seats != null);
  // rows that have seats but no rank (MBBS next to AIIMS nursing); CLAT
  // rows carry both on every row and keep the single rank column
  const seatsOnly = list.some(
    (p) => p.seats != null && p.indicative_closing_rank == null
  );
  if (score)
    return [
      {
        key: "score",
        label: "CUET score",
        value: (p) => p.indicative_min_score,
      },
    ];
  if (rank && seatsOnly)
    return [
      { key: "seats", label: "Annual seats", value: (p) => p.seats },
      {
        key: "rank",
        label: "Closing rank",
        value: (p) => p.indicative_closing_rank,
      },
    ];
  if (seats && !rank)
    return [{ key: "seats", label: "Annual seats", value: (p) => p.seats }];
  return [
    {
      key: "rank",
      label: "Closing rank",
      value: (p) => p.indicative_closing_rank,
    },
  ];
};

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
              <Link
                key={e}
                href={`/exams?q=${encodeURIComponent(e)}`}
                className="rounded-full border border-[#e3d1cb] bg-white px-1.5 py-0.5 transition hover:border-[#8f2e31] hover:text-[#8f2e31]"
              >
                {e}
              </Link>
            ))}
            {/* what kind of place this is, at a glance (Akshay): ownership
                plus the macro education types it admits into */}
            {c.ownership ? (
              <span
                className={`rounded-full px-1.5 py-0.5 font-semibold ${
                  c.ownership === "Private"
                    ? "bg-[#FFB763]/20 text-[#8a5209]"
                    : "bg-[#1F9E8F]/10 text-[#166f64]"
                }`}
              >
                {c.ownership}
              </span>
            ) : null}
            {(c.disciplines || []).map((d) => (
              <span key={d} className="text-[#6d5550]">
                {d}
              </span>
            ))}
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
          {nirf?.latest_band ? (
            // Slid out of the exact-rank list into a band: the band IS the
            // current NIRF position, the old exact rank is history. Showing
            // "#87 (2022)" here would be staler than what NIRF publishes.
            <span
              className="font-semibold text-[#332724]"
              title={`In NIRF's ${nirf.latest_band.band} band in ${nirf.latest_band.year}; last exact rank #${nirf.rank} in ${nirf.ranking_year}`}
            >
              {nirf.latest_band.band}
              <span className="ml-1 text-[11px] font-normal text-[#6d5550]">
                band
              </span>
            </span>
          ) : nirf ? (
            <>
              <span className="font-semibold text-[#332724]">#{nirf.rank}</span>
              {/* every rank names its NIRF list — four lists each have a
                  #1, and NIRF's own "College" label read as "#1 college
                  in India" */}
              <span className="ml-1 text-[11px] font-normal text-[#6d5550]">
                {nirfListLabel(nirf.category)}
              </span>
              {(() => {
                // Direction against LAST year, so a student sees movement in the
                // table without expanding. A LOWER rank number is better, so a
                // negative delta is an improvement — shown as "▲" to match the
                // intuition, not the arithmetic.
                const h = [...nirf.rank_history].sort(
                  (a, b) => b.year - a.year
                );
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
            <span className="font-semibold text-[#332724]">
              {fmtSalary(pl.median_salary)}
            </span>
          ) : (
            <Dash />
          )}
        </td>
        <td className="px-3 py-3 align-top tabular-nums">
          {pl?.percentage_with_outcome != null ? (
            // The combined rate — placed in a job OR admitted to higher
            // studies. NIRF's jobs-only figure makes research-heavy IITs
            // read artificially low (73.8% vs 99.9% at IIT Bombay); the
            // jobs-only split stays in the tooltip and the expander.
            <span
              title={`${pl.percentage_with_outcome}% placed or in higher studies; ${pl.percentage_placed}% in jobs alone`}
            >
              {pl.percentage_with_outcome}%
            </span>
          ) : (
            <Dash />
          )}
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
                            <th className="px-2 py-1.5 text-left font-semibold">
                              Branch
                            </th>
                            <th className="px-2 py-1.5 text-left font-semibold">
                              Degree
                            </th>
                            {valueCols(c.programs.list).map((col) => (
                              <th
                                key={col.key}
                                className="px-2 py-1.5 text-right font-semibold"
                              >
                                {col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {c.programs.list.map((p, i) => (
                            <tr
                              key={`${p.branch}-${p.degree}-${i}`}
                              className="border-t border-[#f0e6e1]"
                            >
                              <td className="px-2 py-1.5 text-[#332724]">
                                {/* a branch is a door to a career — link it
                                    when we know which one */}
                                {p.career_id ? (
                                  <Link
                                    href={`/careers#${p.career_id}`}
                                    className="underline decoration-[#e3d1cb] underline-offset-2 transition hover:text-[#8f2e31] hover:decoration-[#8f2e31]"
                                  >
                                    {p.branch}
                                  </Link>
                                ) : (
                                  p.branch
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-[#6d5550]">
                                {p.degree}
                                {p.years ? ` · ${p.years} yr` : ""}
                              </td>
                              {valueCols(c.programs.list).map((col) => (
                                <td
                                  key={col.key}
                                  className="px-2 py-1.5 text-right tabular-nums text-[#332724]"
                                >
                                  {col.value(p) ?? <Dash />}
                                  {/* a rank on its own scale (AIIMS nursing)
                                      names it */}
                                  {col.key === "rank" && p.rank_label ? (
                                    <span className="block text-[11px] text-[#7a6159]">
                                      {p.rank_label}
                                    </span>
                                  ) : null}
                                </td>
                              ))}
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
                      {nirf.latest_band
                        ? ` Ranked in the ${nirf.latest_band.band} band in ${nirf.latest_band.year} (NIRF publishes no score for bands).`
                        : null}
                    </p>
                  </div>
                ) : null}

                {c.fees ? (
                  <div>
                    <h4 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-[#8f2e31]">
                      Fees ({c.fees.cycle})
                    </h4>
                    <dl className="space-y-1 text-sm text-[#5b3a34]">
                      <div className="flex justify-between gap-3">
                        <dt>Tuition + institute fees</dt>
                        <dd className="tabular-nums">
                          {fmtFee(c.fees.annual_fee)}/yr
                        </dd>
                      </div>
                      {c.fees.annual_fee_waived != null ? (
                        <div className="flex justify-between gap-3">
                          <dt>With SC/ST/PwD tuition waiver</dt>
                          <dd className="tabular-nums">
                            {fmtFee(c.fees.annual_fee_waived)}/yr
                          </dd>
                        </div>
                      ) : null}
                      {c.fees.annual_hostel_mess != null ? (
                        <div className="flex justify-between gap-3">
                          <dt>Hostel + mess</dt>
                          <dd className="tabular-nums">
                            {fmtFee(c.fees.annual_hostel_mess)}/yr
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                    <p className="mt-1.5 text-xs leading-5 text-[#6d5550]">
                      First-year figure incl. one-time charges; later years are
                      usually lower.{" "}
                      {c.fees.source_url ? (
                        <a
                          href={c.fees.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-[#8f2e31]"
                        >
                          source
                        </a>
                      ) : null}
                    </p>
                  </div>
                ) : null}

                {pl ? (
                  <div>
                    <h4 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-[#8f2e31]">
                      Placement details
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
                          <dd className="tabular-nums">
                            {pl.higher_studies_selected}
                          </dd>
                        </div>
                      ) : null}
                      {pl.percentage_placed != null ? (
                        <div className="flex justify-between gap-3">
                          <dt>Placed in a job</dt>
                          <dd className="tabular-nums">
                            {pl.percentage_placed}%
                          </dd>
                        </div>
                      ) : null}
                      {pl.percentage_with_outcome != null ? (
                        <div className="flex justify-between gap-3">
                          <dt>Placed or in higher studies</dt>
                          <dd className="tabular-nums">
                            {pl.percentage_with_outcome}%
                          </dd>
                        </div>
                      ) : null}
                      {pl.first_year_intake != null ? (
                        <div className="flex justify-between gap-3">
                          <dt>First-year intake</dt>
                          <dd className="tabular-nums">
                            {pl.first_year_intake}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                    <p className="mt-1.5 text-xs leading-5 text-[#6d5550]">
                      NIRF {pl.ranking_year},{" "}
                      {pl.source?.includes("Medical")
                        ? "MBBS (UG 5-year)"
                        : pl.source?.includes("3-year")
                        ? "UG 3-year"
                        : pl.includes_dual_degree
                        ? "UG 4- and 5-year"
                        : "UG 4-year"}{" "}
                      · AY {pl.academic_year}
                      {/* NIRF gives one median per programme length; two
                          medians don't combine */}
                      {pl.includes_dual_degree ? " · median: 4-year only" : ""}
                    </p>
                  </div>
                ) : null}

                <div>
                  <h4 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-[#8f2e31]">
                    About
                  </h4>
                  <dl className="space-y-1 text-sm text-[#5b3a34]">
                    {c.ug_gender ? (
                      <div className="flex justify-between gap-3">
                        <dt>Women among UG students</dt>
                        <dd
                          className="tabular-nums"
                          title={`${c.ug_gender.female.toLocaleString()} women / ${(
                            c.ug_gender.male + c.ug_gender.female
                          ).toLocaleString()} UG students, as filed with NIRF ${
                            c.ug_gender.edition_year
                          }`}
                        >
                          {c.ug_gender.female_pct}%
                        </dd>
                      </div>
                    ) : null}
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
                          <span title={c.naac.not_applicable_reason}>
                            Not applicable
                          </span>
                        ) : (
                          <Dash />
                        )}
                      </dd>
                    </div>
                  </dl>
                  {c.website ? (
                    <a
                      href={
                        c.website.startsWith("http")
                          ? c.website
                          : `https://${c.website}`
                      }
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
  [/\baiims\b/g, "all india institute of medical sciences"],
  [/\bgmc\b/g, "government medical college"],
  // how students actually say it vs how the source prints it
  [/\biiser\b/g, "indian institute of science education and research"],
  [/\bnlu\b/g, "national law"],
  [/\bsrcc\b/g, "shri ram college of commerce"],
  [/\blsr\b/g, "lady shri ram"],
  [/\bkmc\b/g, "kirori mal"],
  [/\bstephens?\b/g, "stephen"],
  [/\btrichy\b/g, "tiruchirappalli"],
  [/\bkgp\b/g, "kharagpur"],
  [/\bbangalore\b/g, "bengaluru"],
  [/\bcalcutta\b/g, "kolkata"],
  [/\bmnnit\b/g, "motilal nehru"],
  [/\bmnit\b/g, "malaviya"],
  [/\bvnit\b/g, "visvesvaraya"],
  [/\bsvnit\b/g, "sardar vallabhbhai"],
  [/\bmanit\b/g, "maulana azad"],
  [/\bnitk\b/g, "surathkal"],
  [/\biiest\b/g, "shibpur"],
  [/\bcoep\b/g, "coep"],
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
            <td className="py-0.5 pr-2 font-semibold text-[#332724]">
              #{h.rank}
            </td>
            <td className="w-full py-0.5">
              {h.score != null ? (
                <div className="flex items-center gap-1.5">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f0e6e1]">
                    <div
                      className="h-full rounded-full bg-[#8f2e31]"
                      style={{
                        width: `${Math.max(2, Math.min(100, h.score))}%`,
                      }}
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
  nirf: {
    label: "NIRF rank",
    fn: (a, b) => (a.nirf?.rank ?? 9e9) - (b.nirf?.rank ?? 9e9),
  },
  salary: {
    label: "Median salary",
    fn: (a, b) =>
      (b.placement?.median_salary ?? -1) - (a.placement?.median_salary ?? -1),
  },
  fees: {
    label: "Fees: low to high",
    fn: (a, b) => (a.fees?.annual_fee ?? 9e9) - (b.fees?.annual_fee ?? 9e9),
  },
  placed: {
    label: "% placed",
    // matches the column: the combined placed-or-higher-studies rate
    fn: (a, b) =>
      (b.placement?.percentage_with_outcome ?? -1) -
      (a.placement?.percentage_with_outcome ?? -1),
  },
  name: {
    label: "Name (A–Z)",
    fn: (a, b) => a.display_name.localeCompare(b.display_name),
  },
};

const Colleges = () => {
  const router = useRouter();
  const [all, setAll] = useState([]);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");

  // arriving from a career's college link (/colleges?q=IIT Delhi) or an
  // exam card's "colleges accepting it" (/colleges?exam=JEE Advanced)
  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.q) setQ(String(router.query.q));
    if (router.query.exam) setExam(String(router.query.exam));
    if (router.query.stream) setStream(String(router.query.stream));
    if (router.query.career) setCareer(String(router.query.career));
  }, [router.isReady, router.query.q, router.query.exam]);
  const [state, setState] = useState("All");
  const [exam, setExam] = useState("All");
  // stream = what the college teaches (Engineering / Pharmacy / …). Medical
  // rows carry no discipline badge (the NEET-UG chip says it), so they get
  // their stream here.
  const [stream, setStream] = useState("All");
  // arriving from a career page: only colleges with a branch leading there
  const [career, setCareer] = useState(null);
  const streamsOf = (c) =>
    c.disciplines?.length
      ? c.disciplines
      : String(c.counselling).startsWith("MCC")
      ? ["Medicine"]
      : [];
  const [sortKey, setSortKey] = useState("nirf");
  // Same pattern as the predictor's salary ⓘ: a positioned card, not the
  // browser's native title box (which renders late, unstyled, and turns the
  // cursor into a question mark).
  const [placedTip, setPlacedTip] = useState(null);
  const showPlacedTip = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPlacedTip({ top: rect.bottom + 10, left: rect.right - 280 });
  };
  const hidePlacedTip = () => setPlacedTip(null);
  const [expanded, setExpanded] = useState({});
  // arriving from a link (predictor result, career cutoff, compare header)
  // lands on one college — open it instead of showing a bare row
  const [autoOpened, setAutoOpened] = useState(null);
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    fetch(DATA_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setAll)
      .catch(() => setError("Could not load the college list right now."));
  }, []);

  const states = useMemo(
    () => [
      "All",
      ...Array.from(new Set(all.map((c) => c.state).filter(Boolean))).sort(),
    ],
    [all]
  );
  const streams = useMemo(
    () => [
      "All",
      ...Array.from(new Set(all.flatMap((c) => streamsOf(c)))).sort(),
    ],
    [all]
  );

  const exams = useMemo(
    () => [
      "All",
      ...Array.from(new Set(all.flatMap((c) => c.entrance_exams))).sort(),
    ],
    [all]
  );

  const filtered = useMemo(() => {
    // shared site-wide search: punctuation-blind, word by word, and aware
    // of short forms (iiser, nit trichy, srcc) — see utils/search.js
    const raw = q.trim();
    const out = all.filter((c) => {
      if (state !== "All" && c.state !== state) return false;
      if (exam !== "All" && !c.entrance_exams.includes(exam)) return false;
      if (stream !== "All" && !streamsOf(c).includes(stream)) return false;
      if (career && !c.programs.list.some((p) => p.career_id === career))
        return false;
      if (!raw) return true;
      // Search the branch list too: "who teaches Aerospace" is a real question,
      // and the branch names are the richest text we hold.
      return matchesQuery(
        [
          c.display_name,
          c.state || "",
          c.district || "",
          ...c.programs.list.map((p) => p.branch),
        ],
        raw
      );
    });
    // a query that names a college ("iit bombay") shows only name/place
    // matches; branch text is searched only when nothing matches by name
    // ("aerospace") — otherwise a branch mentioning Bombay leaks in
    if (raw) {
      const byName = out.filter((c) =>
        matchesQuery([c.display_name, c.state || "", c.district || ""], raw)
      );
      if (byName.length) return byName.sort(SORTS[sortKey].fn);
    }
    return out.sort(SORTS[sortKey].fn);
  }, [all, q, state, exam, stream, career, sortKey]);

  useEffect(() => {
    if (!router.query.q || filtered.length !== 1) return;
    const id = filtered[0].college_id;
    if (autoOpened === id) return;
    setAutoOpened(id);
    setExpanded((p) => ({ ...p, [id]: true }));
  }, [filtered, router.query.q, autoOpened]);

  useEffect(
    () => setShown(PAGE_SIZE),
    [q, state, exam, stream, career, sortKey]
  );

  const th = "px-3 py-2 text-left text-xs font-semibold text-[#5b1f20]";

  return (
    <>
      <Head>
        <title>Colleges - Avanti Fellows</title>
        <meta
          name="description"
          content="Engineering and medical colleges — location, NIRF rank, MBBS seats, placement outcomes, and the programs each one offers."
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
            <Link
              href="/"
              className="font-semibold text-[#8f2e31] hover:underline"
            >
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
            <div>
              <Dropdown
                className="text-sm"
                options={states.map((v) => ({
                  value: v,
                  label: v === "All" ? "All states" : v,
                }))}
                selectedValue={state}
                onChange={(o) => setState(o ? o.value : "All")}
                hideValueWhileSearching
              />
            </div>
            {/* the shared control, not a native select — the browser's gray
                option menu doesn't belong in this palette */}
            <div className="min-w-[13rem]">
              <Dropdown
                options={Object.entries(SORTS).map(([k, v]) => ({
                  value: k,
                  label: `Sort: ${v.label}`,
                }))}
                selectedValue={sortKey}
                onChange={(o) => setSortKey(o.value)}
              />
            </div>
          </div>

          {career ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  setCareer(null);
                  router.replace("/colleges", undefined, { shallow: true });
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#fbeeec] px-3 py-1 text-sm font-semibold text-[#8f2e31]"
              >
                Offering {career.replace(/-/g, " ")} <span aria-hidden>×</span>
              </button>
            </div>
          ) : null}
          {/* a 14-exam chip row was clutter — two dropdowns instead */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Dropdown
              options={streams.map((x) => ({
                value: x,
                label: x === "All" ? "Any stream" : x,
              }))}
              selectedValue={stream}
              onChange={(o) => setStream(o.value)}
              isSearchable={false}
            />
            <Dropdown
              options={exams.map((x) => ({
                value: x,
                label: x === "All" ? "Any entrance test" : x,
              }))}
              selectedValue={exam}
              onChange={(o) => setExam(o.value)}
              hideValueWhileSearching
            />
          </div>

          {error ? (
            <p className="py-10 text-center text-sm text-red-600">{error}</p>
          ) : !all.length ? (
            <p className="py-10 text-center text-sm text-[#6d5550]">
              Loading colleges…
            </p>
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
                      <th className={th}>
                        <span className="inline-flex items-center gap-1.5">
                          Placed
                          <button
                            type="button"
                            onMouseEnter={showPlacedTip}
                            onMouseLeave={hidePlacedTip}
                            onFocus={showPlacedTip}
                            onBlur={hidePlacedTip}
                            className="inline-flex items-center text-[#a4837b] hover:text-[#8f2e31]"
                            aria-label="What the Placed percentage means"
                          >
                            {/* the Info glyph is already a circled i — no
                                border ring around it, or it doubles up */}
                            <Info size={14} />
                          </button>
                        </span>
                      </th>
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
                  No colleges match. Try clearing the state or entrance-test
                  filter.
                </p>
              ) : null}

              <p className="mt-6 border-t border-[#eaded8] pt-3 text-[11px] leading-5 text-[#6d5550]">
                Sources: AISHE 2024-25 (identity) · NIRF 2025 (rank, placement)
                · NAAC (accreditation) · JoSAA 2025 (branches) · NMC 2024-25
                (medical colleges, MBBS seats) · State CET Cell 2025
                (Maharashtra colleges, MHT-CET ranks). A dash means we do not
                have that figure.
              </p>
            </>
          )}
        </div>
      </div>
      {placedTip && (
        <div
          className="pointer-events-none fixed z-50 w-72 rounded-xl border border-[#decac3] bg-white p-3 text-left text-xs font-normal leading-5 text-[#5b3a34] shadow-lg"
          style={{
            top: `${Math.max(placedTip.top, 12)}px`,
            left: `${Math.max(placedTip.left, 12)}px`,
          }}
        >
          Share of graduates who got a job or joined higher studies. Expand a
          row for the split.
        </div>
      )}
    </>
  );
};

export default Colleges;
