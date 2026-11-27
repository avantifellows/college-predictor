import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import BackLink from "../components/BackLink";
import JosaaFlashCards, { markCardsSeen } from "../components/JosaaFlashCards";

// JoSAA: what the counselling is, as six flash cards (the same ones the
// mock allotment opens on), then the mock allotment. Reading or skipping
// them here marks them seen, so the mock goes straight to the form.
const SIM_HREF = "/mock-allotment?exam=josaa";

export default function JoSAA() {
  const router = useRouter();
  const toMock = () => {
    markCardsSeen();
    router.push(SIM_HREF);
  };
  return (
    <>
      <Head>
        <title>JoSAA counselling - Futures</title>
        <meta
          name="description"
          content="How JoSAA seat allotment works, then a mock allotment with last year's cutoffs: fill your choices, lock them, and play the rounds."
        />
      </Head>
      <div className="min-h-screen bg-[#fdf8f6] px-4 py-8">
        <div className="mx-auto max-w-md">
          <BackLink />
          <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.08em] text-[#B52326]">
            Start here
          </p>
          <h1 className="mt-1 text-[clamp(24px,3.6vw,30px)] font-black leading-tight text-[#2f2320]">
            How JoSAA counselling works
          </h1>
          <div className="mt-4">
            <JosaaFlashCards
              doneLabel="Try the mock allotment"
              onDone={toMock}
              onSkip={toMock}
            />
          </div>
          <p className="mt-4 text-center text-sm text-[#7a635d]">
            About 10 minutes · practice only, nothing is sent to JoSAA
          </p>
        </div>
      </div>
    </>
  );
}
