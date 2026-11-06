// The old career-path quiz, unlinked since the Career Quiz replaced it.
// Links saved or shared before land on the Career Quiz.
export function getServerSideProps() {
  return { redirect: { destination: "/career-quiz", permanent: true } };
}

export default function Quiz() {
  return null;
}
