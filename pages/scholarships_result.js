import Head from "next/head";
import ScholarshipReferenceBrowser from "../components/ScholarshipReferenceBrowser";

const ScholarshipsResultPage = () => {
  return (
    <>
      <Head>
        <title>Scholarship Finder</title>
      </Head>
      <ScholarshipReferenceBrowser />
    </>
  );
};

export default ScholarshipsResultPage;
