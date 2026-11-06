import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowRight, Check } from "lucide-react";
import BackLink from "../components/BackLink";
import { backupOption, cutoffsHref } from "../utils/onboarding";
import useGetStarted from "../utils/useGetStarted";
import { PREDICTOR_EXAMS } from "../utils/predictorRoutes";

// The plan's backup exams, side by side, so the student picks which one's
// colleges to see instead of being sent to the first. Opened from the
// homepage plan: /backups?exams=TGEAPCET,BITSAT&state=Telangana[&view=full]
// (full: the whole cutoff list; otherwise the rank form). An exam the
// student has already looked at shows a tick.

const KNOWN = new Set(
  PREDICTOR_EXAMS.flatMap((e) => e.counsellings.map((c) => c.key))
);

export default function Backups() {
  const { query, isReady } = useRouter();
  const { answers } = useGetStarted();
  const state = typeof query.state === "string" ? query.state : undefined;
  const full = query.view === "full";
  const keys = String(query.exams || "")
    .split(",")
    .filter((k) => KNOWN.has(k));
  const used = answers?.used || [];
  const hrefOf = (key) =>
    full
      ? cutoffsHref(key, state)
      : `/predictor?exam=${encodeURIComponent(key)}`;

  return (
    <>
      <Head>
        <title>Backup options - Futures</title>
      </Head>
      <div className="min-h-screen bg-[#fdf8f6] px-4 pb-16 pt-8">
        <div className="mx-auto max-w-[560px]">
          <BackLink />
          <h1 className="mt-4 text-[26px] font-black leading-tight text-[#2f2320]">
            Your backup options
          </h1>
          <p className="mt-1.5 text-[15px] text-[#7a635d]">
            {full
              ? "Which exam's cutoffs do you want to see?"
              : "Which exam's colleges do you want to see?"}
          </p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {isReady && keys.length === 0 ? (
              <li className="text-sm text-[#7a635d]">
                No backup exams here.{" "}
                <Link href="/predictor" className="font-bold text-[#B52326]">
                  Open the college predictor
                </Link>
              </li>
            ) : null}
            {keys.map((key) => {
              const o = backupOption(key, { state });
              const seen = used.includes(`predictor:${key}`);
              return (
                <li key={key}>
                  <Link
                    href={hrefOf(key)}
                    className="flex items-center justify-between gap-3 rounded-xl border-[1.5px] border-[#eaded8] bg-white px-4 py-3 transition hover:border-[#B52326]"
                  >
                    <span>
                      <span className="block font-black text-[#2f2320]">
                        {o.name}
                      </span>
                      {o.line ? (
                        <span className="mt-0.5 block text-[13px] text-[#7a635d]">
                          {o.line}
                        </span>
                      ) : null}
                    </span>
                    {seen ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-extrabold uppercase tracking-[0.06em] text-[#3d7a4a]">
                        <Check size={14} strokeWidth={3} /> Seen
                      </span>
                    ) : (
                      <ArrowRight
                        size={18}
                        className="shrink-0 text-[#B52326]"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
