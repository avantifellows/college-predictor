import Head from "next/head";
import dynamic from "next/dynamic";

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
      <MockAllotment />
    </>
  );
};

export default MockAllotmentPage;
