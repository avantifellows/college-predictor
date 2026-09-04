import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadPersistedState, ProfileChips } from "../../components/MockAllotment";
import { cardClass, formatRank } from "../../components/mockAllotmentTheme";
import { TOTAL_ROUNDS } from "../../utils/josaaSimulator";

// Standalone page for the "Rounds History" link in the Simulation view —
// same reasoning as pages/mock-allotment/choices.js: a real route reading
// the persisted trail from localStorage, not an inline toggle.
const RoundsHistoryPage = () => {
  const [state, setState] = useState(null);

  useEffect(() => {
    setState(loadPersistedState());
  }, []);

  if (!state) return null;

  const { trail, profile } = state;

  return (
    <>
      <Head>
        <title>Rounds History — JoSAA Mock Allotment</title>
      </Head>
      <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            <Link
              href="/mock-allotment"
              aria-label="Back to Simulation"
              title="Back to Simulation"
              className="shrink-0 rounded-full border border-[#d8c7c1] px-3 py-1.5 text-lg font-bold leading-none text-[#5b4a45] hover:bg-[#f8efec]"
            >
              ←
            </Link>
            <h1 className="text-2xl font-bold text-[#3a2c28] md:text-3xl">
              Rounds History
            </h1>
          </div>
          <div className="mt-2">
            <ProfileChips profile={profile} />
          </div>

          {trail.length === 0 ? (
            <p className="mt-4 text-sm text-[#7a655f]">
              No rounds yet — lock your choices to start the simulation.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {trail.map((r) => (
                <div key={r.round} className={cardClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#b52326]">
                    Round {r.round} of {TOTAL_ROUNDS}
                    {r.mode ? ` — ${r.mode}` : ""}
                  </p>
                  {r.provisional ? (
                    <>
                      <p className="mt-1 font-semibold text-[#3a2c28]">
                        {r.provisional.choice.institute}
                      </p>
                      <p className="text-sm text-[#7a655f]">
                        {r.provisional.choice.program}
                      </p>
                      <p className="mt-2 text-xs text-[#7a655f]">
                        Opening {formatRank(r.provisional.opening)} / Closing{" "}
                        {formatRank(r.provisional.closing)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-[#7a655f]">
                      No seat reachable this round.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default RoundsHistoryPage;
