import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import BackLink from "../../components/BackLink";
import ExamView from "../../components/ExamView";
import DetailBackLink from "../../components/DetailBackLink";
import { loadExams } from "../../components/examShared";

// One exam on its own page (/exams/<id>). This file loads the data;
// components/ExamView.js draws it.
export default function ExamPage() {
  const router = useRouter();
  const [exam, setExam] = useState(undefined);

  useEffect(() => {
    if (!router.isReady) return;
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
  return (
    <>
      <Head>
        <title>{`${e.acronym || e.name} - Futures`}</title>
        <meta
          name="description"
          content={`${e.name}: eligibility, dates, fee, paper pattern and the colleges it leads to.`}
        />
      </Head>
      <ExamView
        e={e}
        backSlot={<DetailBackLink list="/exams" listLabel="All exams" />}
      />
    </>
  );
}
