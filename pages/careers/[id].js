import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import DetailBackLink from "../../components/DetailBackLink";
import { CareerDetail, loadCareers } from "../../components/careerShared";

// One career on its own page (/careers/<id>).
export default function CareerPage() {
  const router = useRouter();
  const [career, setCareer] = useState(undefined);

  useEffect(() => {
    if (!router.isReady) return;
    window.scrollTo({ top: 0 });
    loadCareers()
      .then((all) =>
        setCareer(all.find((c) => c.career_id === router.query.id) || null)
      )
      .catch(() => setCareer(null));
  }, [router.isReady, router.query.id]);

  return (
    <>
      <Head>
        <title>{`${career?.name || "Careers"} - Futures`}</title>
        {career ? (
          <meta
            name="description"
            content={`${career.name}: what the work looks like, pay, recruiters, and the exams and colleges that lead there.`}
          />
        ) : null}
      </Head>
      <div className="min-h-screen px-3 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3">
            <DetailBackLink list="/careers" listLabel="All careers" />
          </div>
          <div className="rounded-2xl border border-[#eee1d7] bg-white p-4 shadow-sm sm:p-8">
            {career === undefined ? (
              <p className="py-10 text-center text-sm text-[#6d5550]">
                Loading…
              </p>
            ) : career === null ? (
              <p className="py-10 text-center text-sm text-[#6d5550]">
                We could not find this career.{" "}
                <Link
                  href="/careers"
                  className="font-semibold text-[#8f2e31] underline"
                >
                  Browse all careers
                </Link>
              </p>
            ) : (
              <CareerDetail c={career} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
