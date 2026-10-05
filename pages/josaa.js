import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import BackLink from "../components/BackLink";
import { Intro, Quiz } from "../components/CounsellingQuiz";

// JoSAA landing: a short awareness quiz on how seat allotment works, then
// the mock allotment simulator. Round counts change year to year (2023: 6,
// 2024: 5, 2025: 6 — the official archive our simulator data comes from),
// so the rounds question names the year.
const SIM_HREF = "/mock-allotment?exam=josaa";

const QUESTIONS = [
  {
    q: "How many rounds did JoSAA seat allotment have in 2025?",
    opts: ["1", "5", "6"],
    correct: 2,
    fb: "JoSAA 2025 ran 6 rounds. In each round you are allotted a seat based on your rank and your choice list. The number can change from year to year.",
  },
  {
    q: "How many choices can you fill?",
    opts: ["Less than 10", "Less than 100", "Unlimited"],
    correct: 2,
    fb: "There is no limit. Fill every college and branch you would be willing to join, in the order you want them.",
  },
  {
    q: "Can you change your choices between rounds?",
    opts: ["Yes", "No"],
    correct: 1,
    fb: "No. You lock your choices before round 1, and after that you cannot change them.",
  },
  {
    lead: "After each round, if you have been allotted a seat, you get 3 options: freeze, float or slide.",
    q: "What does 'freeze' mean?",
    opts: [
      "Accept the seat allotted to me and exit the process",
      "Accept the seat but stay in the process",
    ],
    correct: 0,
    fb: "Freeze means you accept the seat allotted to you and exit the process. You will not be considered in later rounds.",
  },
  {
    q: "What does 'float' mean?",
    opts: [
      "Keep the current seat but stay in the process for a better seat at any college",
      "Keep the current seat but stay in the process for a better seat at the same college",
      "Give up the current seat and wait for a better seat in the next round",
    ],
    correct: 0,
    fb: "Float keeps your current seat while you stay in the process for a better seat at any college.",
  },
  {
    q: "What does 'slide' mean?",
    opts: [
      "Keep the current seat but stay in the process for a better seat at any college",
      "Keep the current seat but stay in the process for a better seat at the same college",
      "Give up the current seat and wait for a better seat in the next round",
    ],
    correct: 1,
    fb: "Slide keeps your current seat while you stay in the process for a better branch at the same college.",
    extra:
      "Don't worry! You won't lose your seat if you choose to float or slide.",
  },
  {
    q: "What if you don't have a seat at the end of the last JoSAA round?",
    opts: [
      "I can't do anything",
      "I can apply for CSAB to try again for any vacant seats",
    ],
    correct: 1,
    fb: "CSAB is a special round after JoSAA's last round, where remaining vacant seats are allotted to eligible candidates. You apply for CSAB separately and fill a fresh set of choices.",
    notes: [
      {
        kind: "plain",
        text: "You can apply for CSAB even if you have frozen your seat in JoSAA.",
      },
      {
        kind: "warn",
        lead: "Be careful",
        text: " — if you are allotted a seat through CSAB, you automatically lose your JoSAA seat!",
      },
      {
        kind: "rec",
        lead: "Our recommendation",
        text: " — take part in CSAB only if you don't have a seat, or if you are applying for a much better seat than your JoSAA seat.",
      },
    ],
  },
];

export default function JoSAA() {
  const router = useRouter();
  // ?quiz=1 is its own history entry, so Back from the quiz lands on the
  // intro instead of leaving the page
  const inQuiz = router.query.quiz === "1";
  return (
    <>
      <Head>
        <title>JoSAA Quiz and Simulator - Futures</title>
        <meta
          name="description"
          content="How JoSAA seat allotment works: a short quiz on rounds, choices, freeze, float, slide and CSAB, then a mock allotment to try it yourself."
        />
      </Head>
      <div className="min-h-screen px-3 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto mb-3 max-w-2xl">
          <BackLink />
        </div>
        {inQuiz ? (
          <Quiz
            questions={QUESTIONS}
            onExit={() => router.push("/josaa", undefined, { shallow: true })}
            doneHeading="Try the JoSAA seat allotment simulation yourself!"
            doneCta="Open the JoSAA seat allotment simulator"
            simHref={SIM_HREF}
          />
        ) : (
          <Intro
            onQuiz={() =>
              router.push("/josaa?quiz=1", undefined, { shallow: true })
            }
            heading="Congrats! You cleared JEE!"
            lead="The next step is to choose your college and course in the JoSAA seat allotment process."
            quizCta="Take this short quiz to understand how JoSAA seat allotment works"
            simCta="Try the JoSAA seat allotment simulation yourself"
            simHref={SIM_HREF}
          />
        )}
      </div>
    </>
  );
}
