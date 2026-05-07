import Head from "next/head";
import ScholarshipReferenceBrowser from "../components/ScholarshipReferenceBrowser";

const scholarshipRetryOptions = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 3000,
};

const ScholarshipsPage = () => {
  return (
    <>
      <Head>
        <title>Scholarships Reference - Home</title>
      </Head>
      <ScholarshipReferenceBrowser retryOptions={scholarshipRetryOptions} />
    </>
  );
};

export default ScholarshipsPage;
