import SeoHead from "../components/SeoHead";
import ScholarshipReferenceBrowser from "../components/ScholarshipReferenceBrowser";

const ScholarshipsResultPage = () => {
  return (
    <>
      <SeoHead 
        title="Scholarships Results | Avanti Fellows" 
        description="View scholarships applicable to your profile." 
      />
      <ScholarshipReferenceBrowser />
    </>
  );
};

export default ScholarshipsResultPage;
