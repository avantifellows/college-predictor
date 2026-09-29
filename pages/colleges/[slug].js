import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  CalendarDays,
  ExternalLink,
  Globe,
  MapPin,
  Medal,
  Users,
  UserRound,
} from "lucide-react";
import BackLink from "../../components/BackLink";
import {
  CollegeFacts,
  Dash,
  NirfCell,
  ProgramsTable,
} from "../../components/collegeShared";
import { loadColleges, slugMap } from "../../utils/collegesData";
import { listBackHref } from "../../utils/listReturn";

// One college, on its own page (/colleges/<name>), laid out like the futures
// v2 mockup: who it is, a row of fact cards, then exams, programmes and the
// NIRF / placement / fee details.

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

export default function CollegePage() {
  const router = useRouter();
  const [college, setCollege] = useState(undefined);
  const [back, setBack] = useState("/colleges");

  useEffect(() => {
    if (!router.isReady) return;
    setBack(listBackHref("/colleges"));
    loadColleges()
      .then((all) => {
        const slugs = slugMap(all);
        setCollege(
          all.find((c) => slugs[c.college_id] === router.query.slug) || null
        );
      })
      .catch(() => setCollege(null));
  }, [router.isReady, router.query.slug]);

  if (college === undefined) {
    return (
      <div className="min-h-screen bg-[#fdf8f6] px-4 py-10 text-center text-sm text-[#6d5550]">
        Loading…
      </div>
    );
  }
  if (college === null) {
    return (
      <div className="min-h-screen bg-[#fdf8f6] px-4 py-6">
        <div className="mx-auto max-w-5xl">
          <BackLink href="/colleges">All colleges</BackLink>
          <p className="mt-8 text-center text-[#6d5550]">
            We could not find this college.{" "}
            <Link
              href="/colleges"
              className="font-semibold text-[#8f2e31] underline"
            >
              Browse all colleges
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const c = college;
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
    <>
      <Head>
        <title>{`${c.display_name} - Futures`}</title>
        <meta
          name="description"
          content={`${c.display_name}: programmes, closing ranks, NIRF rank, placements and fees.`}
        />
      </Head>
      <div className="min-h-screen bg-[#fdf8f6] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <BackLink href={back}>All colleges</BackLink>

          <div className="mt-4 rounded-2xl border border-[#eaded8] bg-white p-4 sm:p-6">
            <div className="text-xs font-black uppercase tracking-wide text-[#B52326]">
              College
            </div>
            <h1 className="mt-1 text-2xl font-black leading-tight text-[#2f2320] sm:text-3xl">
              {c.display_name}
            </h1>
            {kind ? (
              <p className="mt-1 text-sm text-[#6d5550]">{kind}</p>
            ) : null}
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

          <section className="mt-6 grid gap-4 rounded-2xl border border-[#eaded8] bg-white p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
            <CollegeFacts c={c} showAbout={false} />
          </section>
        </div>
      </div>
    </>
  );
}
