import Head from "next/head";
import ScholarshipReferenceBrowser from "../components/ScholarshipReferenceBrowser";

const ScholarshipsPage = () => {
  return (
    <>
      <Head>
        <title>Scholarship Finder - Futures</title>
      </Head>
      <ScholarshipReferenceBrowser />
    </>
  );
};

export default ScholarshipsPage;
