import React from "react";
import Head from "next/head";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import BackLink from "../components/BackLink";

// JoSAA: what the counselling is, in four lines, then the mock allotment.
// No quiz; the mock itself explains freeze, float and slide when the
// student first has to choose. Round counts change year to year (2023: 6,
// 2024: 5, 2025: 6, the official archive the simulator's data comes from),
// so the line names the year.
const SIM_HREF = "/mock-allotment?exam=josaa";

const FACTS = [
  "JoSAA fills seats at the IITs, NITs, IIITs and other government-funded institutes. In 2025 it ran 6 rounds.",
  "You fill a list of colleges and branches in the order you want them. There is no limit, and you lock it before round 1.",
  "After each round you are offered a seat, and you choose to freeze, float or slide.",
  "With no seat after the last round, CSAB fills the seats left over, in a separate round you apply for.",
];

export default function JoSAA() {
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
        <div className="mx-auto max-w-2xl">
          <BackLink />
          <div className="mt-4 rounded-2xl border border-[#eaded8] bg-white p-6 sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#B52326]">
              Start here
            </p>
            <h1 className="mt-1.5 text-[clamp(24px,3.6vw,32px)] font-black leading-tight text-[#2f2320]">
              What is JoSAA counselling?
            </h1>
            <ul className="mt-4 flex flex-col gap-3">
              {FACTS.map((f, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fbeeec] text-xs font-black text-[#B52326]">
                    {i + 1}
                  </span>
                  <span className="text-[#4f403a]">{f}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[15px] text-[#4f403a]">
              In the mock you do the same with last year&apos;s cutoffs.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={SIM_HREF}
                className="inline-flex items-center gap-2 rounded-[10px] bg-[#B52326] px-5 py-3 text-base font-black text-white transition hover:bg-[#9E1F22]"
              >
                Try the mock allotment <ArrowRight size={18} />
              </Link>
              <span className="text-sm text-[#7a635d]">
                About 10 minutes · practice only, nothing is sent to JoSAA
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
