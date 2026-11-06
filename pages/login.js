import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { ArrowRight, ChevronRight } from "lucide-react";
import {
  ALL_INDIA_LOGIN_URL,
  PROGRAMME_GROUPS,
  SIGNUP_URL,
  portalUrl,
} from "../utils/portalSession";

// Log in or sign up. The Avanti portal asks different things of each group
// (an ID and date of birth, a mobile number, …), so this page sends each
// student to their own group's login, set to come back to Futures. Anyone
// not in an Avanti programme signs up (or logs in) as AllIndiaStudents.
// "Sign up free" in the header opens this page with ?new=1.

const card = "rounded-2xl border border-[#eaded8] bg-white p-5 sm:p-6";

export default function Login() {
  const { query } = useRouter();
  const isNew = query.new === "1";

  return (
    <>
      <Head>
        <title>{isNew ? "Sign up" : "Log in"} - Futures</title>
        <meta
          name="description"
          content="Log in or create a free account to save colleges, careers and your plan on Futures."
        />
      </Head>
      <div className="min-h-screen bg-[#fdf8f6] px-4 pb-16 pt-10">
        <div className="mx-auto flex max-w-[520px] flex-col gap-5">
          <div>
            <h1 className="text-[28px] font-black leading-tight text-[#2f2320]">
              {isNew ? "Create your free account" : "Log in to Futures"}
            </h1>
            <p className="mt-1.5 text-[15px] text-[#7a635d]">
              Save colleges, careers and your plan. Free, no ads.
            </p>
          </div>

          <section className={card}>
            <h2 className="text-lg font-black text-[#2f2320]">
              New to Avanti Fellows?
            </h2>
            <p className="mt-1 text-sm text-[#7a635d]">
              Sign up with your mobile number.
            </p>
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
              <a
                href={SIGNUP_URL}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-[#B52326] px-5 py-3 text-base font-black text-white transition hover:bg-[#9E1F22]"
              >
                Sign up free <ArrowRight size={18} />
              </a>
              <a
                href={ALL_INDIA_LOGIN_URL}
                className="inline-flex flex-1 items-center justify-center rounded-[10px] border-[1.5px] border-[#e0cfc9] bg-white px-5 py-3 text-base font-bold text-[#2f2320] transition hover:border-[#B52326]"
              >
                Log in
              </a>
            </div>
          </section>

          <section className={card}>
            <h2 className="text-lg font-black text-[#2f2320]">
              Studying with Avanti?
            </h2>
            <p className="mt-1 text-sm text-[#7a635d]">
              Log in the way you do for class and tests. Pick your school or
              state.
            </p>
            <ul className="mt-4 flex flex-col divide-y divide-[#f1e5e1] overflow-hidden rounded-xl border border-[#eaded8]">
              {PROGRAMME_GROUPS.map(({ group, label }) => (
                <li key={group}>
                  <a
                    href={portalUrl(group)}
                    className="flex items-center justify-between gap-3 px-4 py-3 font-bold text-[#2f2320] transition hover:bg-[#fdf8f6] hover:text-[#B52326]"
                  >
                    {label}
                    <ChevronRight size={18} className="text-[#B52326]" />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <p className="text-center text-sm text-[#7a635d]">
            Everything on Futures also works without an account.
          </p>
        </div>
      </div>
    </>
  );
}
