import Head from "next/head";
import dynamic from "next/dynamic";
import BackLink from "../components/BackLink";

// Client-only: reads/writes localStorage and fetches each exam's round
// data, same reasoning as the Dropdown component in pages/index.js.
const MockAllotment = dynamic(() => import("../components/MockAllotment"), {
  ssr: false,
});

const MockAllotmentPage = () => {
  return (
    <>
      <Head>
        <title>Mock Allotment - Futures</title>
      </Head>
      {/* the way out of the simulator: wherever the student came from */}
      <div className="mx-auto w-full max-w-5xl px-4 pt-6 md:px-6">
        <BackLink />
      </div>
      <MockAllotment />
    </>
  );
};

export default MockAllotmentPage;
