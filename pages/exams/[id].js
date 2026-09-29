import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { CalendarDays, IndianRupee, MapPin } from "lucide-react";
import BackLink from "../../components/BackLink";
import {
  Dash,
  ExamDetailBody,
  fmtFee,
  loadExams,
} from "../../components/examShared";
import { listBackHref } from "../../utils/listReturn";

// One exam on its own page (/exams/<id>): what it is, when, who can take it,
// the paper, and where it leads.

const InfoCard = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-2 rounded-xl border border-[#eaded8] bg-white px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
    <Icon size={17} className="mt-0.5 shrink-0 text-[#B52326]" />
    <div className="min-w-0">
      <div className="text-[11px] font-bold uppercase tracking-wide text-[#8f2e31]">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-[#2f2320]">
        {children}
      </div>
    </div>
  </div>
);

export default function ExamPage() {
  const router = useRouter();
  const [exam, setExam] = useState(undefined);
  const [back, setBack] = useState("/exams");

  useEffect(() => {
    if (!router.isReady) return;
    setBack(listBackHref("/exams"));
    loadExams()
      .then((all) =>
        setExam(all.find((e) => e.exam_id === router.query.id) || null)
      )
      .catch(() => setExam(null));
  }, [router.isReady, router.query.id]);

  if (exam === undefined) {
    return (
      <div className="min-h-screen px-4 py-10 text-center text-sm text-[#6d5550]">
        Loading…
      </div>
    );
  }
  if (exam === null) {
    return (
      <div className="min-h-screen px-4 py-6">
        <div className="mx-auto max-w-5xl">
          <BackLink href="/exams">All exams</BackLink>
          <p className="mt-8 text-center text-[#6d5550]">
            We could not find this exam.{" "}
            <Link
              href="/exams"
              className="font-semibold text-[#8f2e31] underline"
            >
              Browse all exams
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const e = exam;
  const scope =
    e.scope_state && e.scope_type === "University"
      ? `${e.scope} · ${e.scope_state}`
      : e.scope;

  return (
    <>
      <Head>
        <title>{`${e.acronym || e.name} - Futures`}</title>
        <meta
          name="description"
          content={`${e.name}: eligibility, dates, fee, paper pattern and the colleges it leads to.`}
        />
      </Head>
      <div className="min-h-screen px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <BackLink href={back}>All exams</BackLink>

          <div className="mt-4 rounded-2xl border border-[#eaded8] bg-white p-4 sm:p-6">
            <div className="text-xs font-black uppercase tracking-wide text-[#B52326]">
              Entrance exam
            </div>
            <h1 className="mt-1 text-2xl font-black leading-tight text-[#2f2320] sm:text-3xl">
              {e.name}
            </h1>
            {e.streams?.length ? (
              <p className="mt-1 text-sm text-[#6d5550]">
                {e.streams.join(" · ")}
              </p>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <InfoCard icon={MapPin} label="For">
                {scope || <Dash />}
              </InfoCard>
              <InfoCard icon={CalendarDays} label="Test month">
                {e.test_month || <Dash />}
              </InfoCard>
              <InfoCard icon={IndianRupee} label="Application fee">
                {fmtFee(e) || <Dash />}
              </InfoCard>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#eaded8] bg-white p-4 sm:p-6">
            <ExamDetailBody e={e} />
          </div>

          <p className="mt-4 text-xs text-[#6d5550]">
            Dates are the typical cycle, not this year&apos;s. Always confirm on
            the official site.
          </p>
        </div>
      </div>
    </>
  );
}
