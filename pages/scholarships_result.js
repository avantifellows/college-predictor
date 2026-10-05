import Head from "next/head";
import ScholarshipReferenceBrowser from "../components/ScholarshipReferenceBrowser";

const ScholarshipsResultPage = () => {
  return (
    <>
      <Head>
        <title>Scholarship Finder - Futures</title>
      </Head>
      <ScholarshipReferenceBrowser />
    </>
  );
};

export default ScholarshipsResultPage;
