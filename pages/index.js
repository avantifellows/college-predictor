import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowRight } from "lucide-react";

// The landing page: what exists here and where to start. Adapted from the
// futures standalone's landing, stripped to what is actually shipped — no
// section labels, no stat tiles, no duplicate Datasets card (it lives in
// the navbar). The predictor form itself moved to /predictor.

const FEATURES = [
  {
    href: "/predictor",
    title: "College Predictor",
    desc: "Enter your exam rank and see which colleges you could get.",
  },
  {
    href: "/careers",
    title: "Careers",
    desc: "What each career pays, who hires, and the exams that lead there.",
  },
  {
    href: "/colleges",
    title: "Colleges",
    desc: "Rankings, fees, placements and branches, college by college.",
  },
  {
    href: "/exams",
    title: "Exams",
    desc: "Dates, eligibility, fees and paper format for every entrance exam.",
  },
  {
    href: "/scholarships",
    title: "Scholarships",
    desc: "Find scholarships you qualify for, with amounts and deadlines.",
  },
  {
    href: "https://cv-generator.avantifellows.org/",
    title: "CV Generator",
    desc: "Build a clean one-page resume in minutes.",
    external: true,
  },
];

export default function Home() {
  const router = useRouter();
  const [updated, setUpdated] = useState(null);

  // old deep links (/?exam=KCET) predate the landing — forward them to the
  // predictor form so nothing anyone bookmarked or shared breaks
  useEffect(() => {
    if (router.isReady && router.query.exam) {
      router.replace({ pathname: "/predictor", query: router.query });
    }
  }, [router.isReady, router.query, router]);

  useEffect(() => {
    fetch("/data/last_updated.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUpdated(d.date))
      .catch(() => {});
  }, []);

  return (
    <>
      <Head>
        <title>Avanti Fellows - Futures</title>
        <meta
          name="description"
          content="Free guidance for life after Class 12: predict your colleges, explore careers, compare colleges, and understand every entrance exam."
        />
      </Head>
      <div className="min-h-screen bg-[#faf5ef] px-3 py-10 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-center text-3xl font-black leading-tight text-[#2f2320] sm:text-4xl">
            Your guide to life after Class 12
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-center text-[15px] leading-7 text-[#5f514c]">
            Exams, colleges, careers and scholarships in one place. Free, and
            built from official data.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <Link
                key={f.title}
                href={f.href}
                {...(f.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="group rounded-xl border border-[#eaded8] bg-white p-5 shadow-sm transition hover:border-[#b52326]/40 hover:shadow"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#2f2320]">
                    {f.title}
                  </h2>
                  <ArrowRight
                    size={18}
                    className="shrink-0 text-[#b9a8a2] transition group-hover:translate-x-0.5 group-hover:text-[#b52326]"
                  />
                </div>
                <p className="mt-1.5 text-sm leading-6 text-[#5f514c]">
                  {f.desc}
                </p>
              </Link>
            ))}
          </div>

          {updated ? (
            <p className="mt-10 text-center text-xs text-[#9b8a82]">
              Data last updated {updated}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
