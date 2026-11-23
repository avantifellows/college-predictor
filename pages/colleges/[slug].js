import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import BackLink from "../../components/BackLink";
import CollegeView from "../../components/CollegeView";
import DetailBackLink from "../../components/DetailBackLink";
import { collegeAtSlug, loadColleges, slugMap } from "../../utils/collegesData";

// One college, on its own page (/colleges/<name>). This file loads the data;
// components/CollegeView.js draws it.
export default function CollegePage() {
  const router = useRouter();
  const [college, setCollege] = useState(undefined);

  useEffect(() => {
    if (!router.isReady) return;
    loadColleges()
      .then((all) => {
        const c = collegeAtSlug(all, router.query.slug);
        // an old link lands on the card's current address
        const now = c && slugMap(all)[c.college_id];
        if (now && now !== router.query.slug)
          router.replace(`/colleges/${now}`, undefined, { shallow: true });
        setCollege(c);
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
  return (
    <>
      <Head>
        <title>{`${c.display_name} - Futures`}</title>
        <meta
          name="description"
          content={`${c.display_name}: programmes, closing ranks, NIRF rank, placements and fees.`}
        />
      </Head>
      <CollegeView
        c={c}
        backSlot={<DetailBackLink list="/colleges" listLabel="All colleges" />}
      />
    </>
  );
}
