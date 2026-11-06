// The old scholarship results page. Scholarships live at /scholarships now;
// links saved or shared before keep working, filters and all.
export function getServerSideProps({ query }) {
  const qs = new URLSearchParams(query).toString();
  return {
    redirect: {
      destination: `/scholarships${qs ? `?${qs}` : ""}`,
      permanent: true,
    },
  };
}

export default function ScholarshipsResult() {
  return null;
}
