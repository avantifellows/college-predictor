import Link from "next/link";
import { courseMax, coursePapers } from "../utils/cuetRules";
import { ExternalLink } from "lucide-react";

// Pieces shared by the colleges list and the college page.

// NIRF publishes yearly; a rank from an older cycle means the college has not
// appeared in the ranked band since, which is worth showing rather than hiding.
export const LATEST_NIRF = 2025;
export const nirfSortRank = (c) =>
  c.nirf?.rank ??
  (c.nirf?.latest_band ? parseInt(c.nirf.latest_band.band, 10) : 9e9);

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
export const fmtFee = (v) => {
  if (v === null || v === undefined) return null;
  return v >= 100000
    ? `₹${(v / 100000).toFixed(1)} L`
    : `₹${v.toLocaleString("en-IN")}`;
};

export const fmtSalary = (v) => {
  if (v === null || v === undefined) return null;
  // Indian students read lakhs, not 1,400,000.
  const lakh = v / 100000;
  return lakh >= 100
    ? `₹${(lakh / 100).toFixed(2)} Cr`
    : `₹${lakh.toFixed(1)} L`;
};

export const Dash = () => <span className="text-[#b9a8a2]">—</span>;

// the programs table's number column(s). One column per card normally; a
// card mixing annual seats (MBBS) and closing ranks (AIIMS nursing) gets
// both, so a rank never sits under an "Annual seats" header.
export const valueCols = (list) => {
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
export const NirfTrend = ({ history }) => {
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

/** The NIRF cell: exact rank with its list, or the band it sits in. */
export const NirfCell = ({ nirf }) => (
  <>
    {nirf?.latest_band ? (
      // Slid out of the exact-rank list into a band: the band IS the
      // current NIRF position, the old exact rank is history. Showing
      // "#87 (2022)" here would be staler than what NIRF publishes.
      <span
        className="font-semibold text-[#332724]"
        title={
          nirf.rank != null
            ? `In NIRF's ${nirf.latest_band.band} band in ${nirf.latest_band.year}; last exact rank #${nirf.rank} in ${nirf.ranking_year}`
            : `In NIRF's ${nirf.latest_band.band} band in ${nirf.latest_band.year}`
        }
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
  </>
);

/** Programmes with their closing ranks / seats / CUET scores. */
export const ProgramsTable = ({ c }) => (
  <>
    {c.programs.count ? (
      <>
        <div className="rounded-lg border border-[#eaded8] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#f8efec] text-[#5b1f20]">
              <tr>
                <th className="px-2 py-1.5 text-left font-semibold">Branch</th>
                <th className="px-2 py-1.5 text-left font-semibold">Degree</th>
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
                        href={`/careers/${p.career_id}`}
                        className="underline decoration-[#e3d1cb] underline-offset-2 transition hover:text-[#8f2e31] hover:decoration-[#8f2e31]"
                      >
                        {p.branch}
                      </Link>
                    ) : (
                      p.branch
                    )}
                    {/* CUET courses: the papers this course adds up */}
                    {p.cuet_rule ? (
                      <span className="block text-[11px] text-[#7a6159]">
                        {coursePapers(p.cuet_rule)}
                      </span>
                    ) : null}
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
                      {col.key === "score" &&
                      p.cuet_rule &&
                      col.value(p) != null ? (
                        <span className="text-[#7a6159]">
                          {" "}
                          / {courseMax(p.cuet_rule)}
                        </span>
                      ) : null}
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
  </>
);

/** NIRF trend, fees, placement details and the about block. */
export const CollegeFacts = ({ c, showAbout = true }) => {
  const nirf = c.nirf;
  const pl = c.placement;
  return (
    <>
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
              <dd className="tabular-nums">{fmtFee(c.fees.annual_fee)}/yr</dd>
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
            First-year figure incl. one-time charges; later years are usually
            lower.{" "}
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
                <dd className="tabular-nums">{pl.higher_studies_selected}</dd>
              </div>
            ) : null}
            {pl.percentage_placed != null ? (
              <div className="flex justify-between gap-3">
                <dt>Placed in a job</dt>
                <dd className="tabular-nums">{pl.percentage_placed}%</dd>
              </div>
            ) : null}
            {pl.percentage_with_outcome != null ? (
              <div className="flex justify-between gap-3">
                <dt>Placed or in higher studies</dt>
                <dd className="tabular-nums">{pl.percentage_with_outcome}%</dd>
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
            {/* who the numbers are about, in plain words; NIRF
              is only named as the source */}
            {pl.source?.includes("Medical")
              ? "MBBS"
              : pl.source?.includes("3-year")
              ? "3-year degree"
              : pl.source?.includes("5-year")
              ? "5-year degree"
              : pl.includes_dual_degree
              ? "4- and 5-year"
              : "4-year degree"}{" "}
            graduates, {pl.academic_year} · NIRF {pl.ranking_year}
          </p>
        </div>
      ) : null}

      {showAbout ? (
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
      ) : null}
    </>
  );
};
