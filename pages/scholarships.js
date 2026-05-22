import SeoHead from "../components/SeoHead";
import ScholarshipReferenceBrowser from "../components/ScholarshipReferenceBrowser";

const ScholarshipsPage = () => {
  return (
    <>
      <SeoHead 
        title="Scholarships Reference - Home | Avanti Fellows" 
        description="Explore various scholarships available for students." 
      />
      <ScholarshipReferenceBrowser />
    </>
  );
};

export default ScholarshipsPage;
