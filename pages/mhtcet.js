import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import BackLink from "../components/BackLink";
import { Intro, Quiz } from "../components/CounsellingQuiz";

// MHT-CET landing: the same "learn it, then simulate it" shape as /josaa
// (both render components/CounsellingQuiz), because the thing students get
// wrong is the PROCESS, not the arithmetic. The facts here are CAP's, not
// JoSAA's — different rounds, a cap on choices, an institute-level quota
// JoSAA has no equivalent of — so the questions are written fresh rather
// than reworded from the JoSAA set.
//
// Round count is what our own data carries: public/data/MHTCET has R1-R4
// (B.Design only R2-R4, which is why the simulator reads each seat's own
// last round rather than one global round number — see utils/mhtcetSimulator).
const SIM_HREF = "/mock-allotment?exam=mhtcet";

const QUESTIONS = [
  {
    q: "After your MHT-CET result, how do you actually get a seat?",
    opts: [
      "Apply to each college separately",
      "Through CAP, one common round of choice filling",
    ],
    correct: 1,
    fb: "Through CAP (Centralised Admission Process). You register once, fill one preference list, and the seats are allotted centrally on your merit number.",
  },
  {
    q: "How many CAP rounds does the engineering admission run?",
    opts: ["1", "4", "8"],
    correct: 1,
    fb: "CAP ran four rounds in the year our cutoffs come from. Round 1 is the one everyone fills choices for, and it is the round our simulator shows you. Later rounds allot the seats left over, and their cutoffs are usually tighter, not looser.",
  },
  {
    q: "Your home university region decides what?",
    opts: [
      "Nothing, everyone competes in one list",
      "A large share of seats reserved for students from that region",
    ],
    correct: 1,
    fb: "Most seats in a college are reserved for students whose home university region matches it. The same college can close at a very different merit number for a home-region student than for everyone else.",
    notes: [
      {
        kind: "plain",
        text: "This is why the simulator asks for your home university region, not just your state.",
      },
    ],
  },
  {
    q: "Does the order of your preference list matter?",
    opts: [
      "No, the best college I qualify for is allotted",
      "Yes, I get the highest choice on my list that I clear",
    ],
    correct: 1,
    fb: "Order is everything. CAP walks your list from choice 1 downwards and stops at the first seat your merit number clears. A college you want more must sit higher, even if it feels out of reach.",
  },
  {
    q: "What happens if your merit number clears nothing on your list?",
    opts: [
      "A seat is allotted anyway",
      "No seat that round, so a short list is a real risk",
    ],
    correct: 1,
    fb: "You get nothing that round. This is the most common mistake: a list of only dream colleges. Keep some choices you comfortably clear at the bottom.",
    notes: [
      {
        kind: "rec",
        lead: "Our recommendation",
        text: " — mix reach, match and safety choices. The simulator scores your list on exactly this after it runs.",
      },
    ],
  },
  {
    q: "Is a TFWS seat worth adding to your list?",
    opts: [
      "Only if my family income qualifies",
      "Always, it is free for everyone",
    ],
    correct: 0,
    fb: "TFWS (Tuition Fee Waiver Scheme) seats waive tuition, but they are a small quota with their own income limit and their own cutoff. Add them only if you qualify.",
  },
];

export default function MhtCet() {
  const router = useRouter();
  // ?quiz=1 is its own history entry, so Back from the quiz lands on the
  // intro instead of leaving the page — same as /josaa
  const inQuiz = router.query.quiz === "1";
  return (
    <>
      <Head>
        <title>MHT CET Quiz and Simulator - Futures</title>
        <meta
          name="description"
          content="How MHT-CET CAP seat allotment works: a short quiz on rounds, home university seats, preference order and TFWS, then a mock allotment to try it yourself."
        />
      </Head>
      <div className="min-h-screen px-3 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto mb-3 max-w-2xl">
          <BackLink />
        </div>
        {inQuiz ? (
          <Quiz
            questions={QUESTIONS}
            onExit={() => router.push("/mhtcet", undefined, { shallow: true })}
            doneHeading="Try the MHT CET seat allotment simulation yourself!"
            doneCta="Open the MHT CET seat allotment simulator"
            simHref={SIM_HREF}
          />
        ) : (
          <Intro
            onQuiz={() =>
              router.push("/mhtcet?quiz=1", undefined, { shallow: true })
            }
            heading="Done with MHT CET!"
            lead="The next step is CAP, where you fill one preference list and seats are allotted on your merit number."
            quizCta="Take this short quiz to understand how CAP seat allotment works"
            simCta="Try the MHT CET seat allotment simulation yourself"
            simHref={SIM_HREF}
          />
        )}
      </div>
    </>
  );
}
