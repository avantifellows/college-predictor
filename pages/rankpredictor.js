import Head from "next/head";
import PredictionRank from "../components/predictionRank";

export default function Home() {
  return (
    <>
      <Head>
        <title>Futures</title>
        <meta
          name="description"
          content="Predict JEE percentile using ML model"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="container mx-auto px-4">
          <PredictionRank />
        </div>
      </main>
    </>
  );
}
