import React from "react";
import Head from "next/head";
import { ArrowRight, ChevronRight } from "lucide-react";
import {
  ALL_INDIA_LOGIN_URL,
  PROGRAMME_GROUPS,
  SIGNUP_URL,
  portalUrl,
} from "../utils/portalSession";

// Log in or sign up. The Avanti portal asks different things of each group
// (an ID and date of birth, a mobile number, …), so a student picks the
// group they study with and goes to that group's login, set to come back
// to Futures. Students who signed up on their own are AllIndiaStudents,
// the one group new students can join (Sign up free).

const card = "rounded-2xl border border-[#eaded8] bg-white p-5 sm:p-6";

export default function Login() {
  return (
    <>
      <Head>
        <title>Log in - Futures</title>
        <meta
          name="description"
          content="Log in or sign up to save your plan, colleges and careers on Futures."
        />
      </Head>
      <div className="min-h-screen bg-[#fdf8f6] px-4 pb-16 pt-10">
        <div className="mx-auto flex max-w-[520px] flex-col gap-5">
          <h1 className="text-[28px] font-black leading-tight text-[#2f2320]">
            Log in
          </h1>

          <section className={card}>
            <h2 className="text-lg font-black text-[#2f2320]">
              Who do you study with?
            </h2>
            <ul className="mt-4 flex flex-col divide-y divide-[#f1e5e1] overflow-hidden rounded-xl border border-[#eaded8]">
              {[
                ...PROGRAMME_GROUPS.map(({ group, label }) => ({
                  label,
                  href: portalUrl(group),
                })),
                { label: "None of these", href: ALL_INDIA_LOGIN_URL },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="flex items-center justify-between gap-3 px-4 py-3 font-bold text-[#2f2320] transition hover:bg-[#fdf8f6] hover:text-[#B52326]"
                  >
                    {label}
                    <ChevronRight size={18} className="text-[#B52326]" />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section
            className={`${card} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
          >
            <div>
              <h2 className="text-lg font-black text-[#2f2320]">New here?</h2>
              <p className="mt-0.5 text-sm text-[#7a635d]">
                Sign up with your mobile number.
              </p>
            </div>
            <a
              href={SIGNUP_URL}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#B52326] px-5 py-3 text-base font-black text-white transition hover:bg-[#9E1F22]"
            >
              Sign up free <ArrowRight size={18} />
            </a>
          </section>
        </div>
      </div>
    </>
  );
}
