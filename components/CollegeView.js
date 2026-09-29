import Link from "next/link";
import {
  CalendarDays,
  ExternalLink,
  Globe,
  MapPin,
  Medal,
  Users,
  UserRound,
} from "lucide-react";
import BackLink from "./BackLink";
import {
  Dash,
  NirfCell,
  NirfTrend,
  ProgramsTable,
  fmtFee,
  fmtSalary,
  nirfListLabel,
} from "./collegeShared";

// What a college page shows (pages/colleges/[slug].js loads the data):
// who it is, a row of fact cards, then exams, programmes, placements,
// rankings and fees. Pure, so scripts/check-pages can render every college.

const InfoCard = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-2 rounded-xl border border-[#eaded8] bg-white px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
    <Icon size={17} className="mt-0.5 shrink-0 text-[#B52326]" />
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wide text-[#8f2e31] sm:text-[11px]">
        {label}
      </div>
      <div className="mt-0.5 break-words text-[13px] font-semibold text-[#2f2320] sm:text-sm">
        {children}
      </div>
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <section className="mt-6 rounded-2xl border border-[#eaded8] bg-white p-4 sm:p-6">
    <h2 className="mb-3 text-lg font-black text-[#2f2320]">{title}</h2>
    {children}
  </section>
);

// a big number with a small label: the placement / fee headline figures
const Stat = ({ label, value }) => (
  <div className="rounded-xl bg-[#fdf6f4] px-3 py-3 sm:px-4">
    <div className="text-xl font-black tabular-nums text-[#2f2320] sm:text-2xl">
      {value ?? <Dash />}
    </div>
    <div className="mt-0.5 text-xs leading-snug text-[#6d5550]">{label}</div>
  </div>
);

// who the placement numbers are about, in plain words
const cohortOf = (pl) =>
  pl.source?.includes("Medical")
    ? "MBBS"
    : pl.source?.includes("3-year")
    ? "3-year degree"
    : pl.source?.includes("5-year")
    ? "5-year degree"
    : pl.includes_dual_degree
    ? "4- and 5-year"
    : "4-year degree";

export default function CollegeView({ c, back = "/colleges", backSlot }) {
  const place = c.state
    ? `${c.district ? `${c.district}, ` : ""}${c.state}`
    : null;
  const website = c.website
    ? c.website.startsWith("http")
      ? c.website
      : `https://${c.website}`
    : null;
  const kind = [c.ownership, c.counselling].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen bg-[#fdf8f6] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {backSlot || <BackLink href={back}>All colleges</BackLink>}

        <div className="mt-4 rounded-2xl border border-[#eaded8] bg-white p-4 sm:p-6">
          <div className="text-xs font-black uppercase tracking-wide text-[#B52326]">
            College
          </div>
          <h1 className="mt-1 text-2xl font-black leading-tight text-[#2f2320] sm:text-3xl">
            {c.display_name}
          </h1>
          {kind ? <p className="mt-1 text-sm text-[#6d5550]">{kind}</p> : null}
          {c.disciplines?.length ? (
            <p className="mt-1 text-sm text-[#6d5550]">
              {c.disciplines.join(" · ")}
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-3">
            <InfoCard icon={MapPin} label="Location">
              {place || <Dash />}
            </InfoCard>
            <InfoCard icon={Medal} label="NIRF rank">
              {c.nirf ? <NirfCell nirf={c.nirf} /> : <Dash />}
            </InfoCard>
            <InfoCard icon={CalendarDays} label="Established">
              {c.year_established || <Dash />}
            </InfoCard>
            <InfoCard icon={Users} label="First-year intake">
              {c.placement?.first_year_intake ?? <Dash />}
            </InfoCard>
            <InfoCard icon={UserRound} label="Women among students">
              {c.ug_gender ? `${c.ug_gender.female_pct}%` : <Dash />}
            </InfoCard>
            <InfoCard icon={Globe} label="Official website">
              {website ? (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#8f2e31] hover:underline"
                >
                  {c.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  <ExternalLink size={12} />
                </a>
              ) : (
                <Dash />
              )}
            </InfoCard>
          </div>
        </div>

        {c.entrance_exams?.length ? (
          <Section title="Entrance exams">
            <div className="flex flex-wrap gap-2">
              {c.entrance_exams.map((e) => (
                <Link
                  key={e}
                  href={`/exams?q=${encodeURIComponent(e)}`}
                  className="rounded-full border border-[#e3d1cb] bg-[#fffdfa] px-3 py-1 text-sm font-semibold text-[#5b3a34] transition hover:border-[#8f2e31] hover:text-[#8f2e31]"
                >
                  {e}
                </Link>
              ))}
            </div>
            <Link
              href="/predictor"
              className="mt-3 inline-block text-sm font-semibold text-[#8f2e31] hover:underline"
            >
              Check your chances in the College Predictor
            </Link>
          </Section>
        ) : null}

        <Section title={`Programmes offered (${c.programs.count})`}>
          <div className="overflow-x-auto">
            <ProgramsTable c={c} />
          </div>
        </Section>

        {c.placement ? (
          <Section title="Placements">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <Stat
                label="Median salary"
                value={fmtSalary(c.placement.median_salary)}
              />
              <Stat
                label="Placed or in higher studies"
                value={
                  c.placement.percentage_with_outcome != null
                    ? `${c.placement.percentage_with_outcome}%`
                    : null
                }
              />
              <Stat
                label="Placed in a job"
                value={
                  c.placement.percentage_placed != null
                    ? `${c.placement.percentage_placed}%`
                    : null
                }
              />
              <Stat
                label="Students placed"
                value={c.placement.students_placed}
              />
            </div>
            <p className="mt-3 text-xs text-[#6d5550]">
              {cohortOf(c.placement)} graduates, {c.placement.academic_year} ·
              NIRF {c.placement.ranking_year}
            </p>
          </Section>
        ) : null}

        {c.nirf || c.naac?.grade ? (
          <Section title="Rankings">
            <div className="grid gap-5 sm:grid-cols-[14rem_1fr] sm:gap-8">
              <div className="space-y-3">
                {c.nirf ? (
                  <div>
                    <div className="text-3xl font-black text-[#2f2320]">
                      {c.nirf.latest_band
                        ? c.nirf.latest_band.band
                        : `#${c.nirf.rank}`}
                    </div>
                    <div className="text-xs text-[#6d5550]">
                      NIRF {nirfListLabel(c.nirf.category)},{" "}
                      {c.nirf.latest_band
                        ? c.nirf.latest_band.year
                        : c.nirf.ranking_year}
                    </div>
                  </div>
                ) : null}
                {c.naac?.grade ? (
                  <div>
                    <div className="text-xl font-black text-[#2f2320]">
                      {c.naac.grade}
                    </div>
                    <div className="text-xs text-[#6d5550]">NAAC grade</div>
                  </div>
                ) : null}
              </div>
              {c.nirf?.rank_history?.length > 1 ? (
                <div>
                  <NirfTrend
                    history={[...c.nirf.rank_history]
                      .sort((x, y) => y.year - x.year)
                      .slice(0, 4)}
                  />
                  <p className="mt-2 text-xs text-[#6d5550]">
                    Bars show the NIRF score out of 100.
                  </p>
                </div>
              ) : null}
            </div>
          </Section>
        ) : null}

        {c.fees ? (
          <Section title={`Fees (${c.fees.cycle})`}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
              <Stat
                label="Tuition and institute fees, per year"
                value={fmtFee(c.fees.annual_fee)}
              />
              {c.fees.annual_hostel_mess != null ? (
                <Stat
                  label="Hostel and mess, per year"
                  value={fmtFee(c.fees.annual_hostel_mess)}
                />
              ) : null}
              {c.fees.annual_fee_waived != null ? (
                <Stat
                  label="With SC/ST/PwD tuition waiver"
                  value={fmtFee(c.fees.annual_fee_waived)}
                />
              ) : null}
            </div>
            <p className="mt-3 text-xs text-[#6d5550]">
              First-year figures. Later years are usually lower.{" "}
              {c.fees.source_url ? (
                <a
                  href={c.fees.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-[#8f2e31]"
                >
                  Source
                </a>
              ) : null}
            </p>
          </Section>
        ) : null}
      </div>
    </div>
  );
}
