import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import getConstants from "../constants";
import ScholarshipTable from "../components/ScholarshipTable";
import Script from "next/script";
import Head from "next/head";

const ScholarshipFinder = () => {
  const router = useRouter();
  const { status, grade, stream, gender, familyIncome, category } =
    router.query;
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState([]);

  const toggleRowExpansion = (index) => {
    const updatedExpandedRows = [...expandedRows];
    updatedExpandedRows[index] = !updatedExpandedRows[index];
    setExpandedRows(updatedExpandedRows);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `/api/scholarship-data?status=${status}&grade=${grade}&stream=${stream}&gender=${gender}&familyIncome=${familyIncome}&category=${category}`,
        );
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        setFilteredData(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
        setFilteredData([]);
      }
    };
    fetchData();
  }, [status, grade, stream, gender, familyIncome, category]);

  return (
    <>
      <Head>
        <title>Scholarship - Result</title>
      </Head>

      <div className="flex flex-col items-center w-full mt-8 pb-10">
        <div className="text-center flex flex-col items-center w-full sm:w-3/4 md:w-2/3 ">
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-FHGVRT52L7"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){window.dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', 'G-FHGVRT52L7');
                    `}
          </Script>
          <h1 className="text-2xl md:text-3xl font-bold mb-6">
            {getConstants().SCHOLARSHIP_TITLE}
          </h1>
          <h3 className="mb-2 text-lg md:text-xl">Chosen Grade: {grade}</h3>
          <h3 className="mb-2 text-lg md:text-xl">Chosen Gender: {gender}</h3>
          <h3 className="mb-2 text-lg md:text-xl">Chosen Stream: {stream}</h3>
          <h3 className="mb-2 text-lg md:text-xl">
            Chosen Category: {category}
          </h3>
          <h3 className="mb-6 text-lg md:text-xl">
            Chosen Family Income: {familyIncome}
          </h3>
          {isLoading ? (
            <div className="flex flex-col items-center">
              <div className="border-t-4 border-[#B52326] border-solid w-7 h-7 animate-spin rounded-full mb-3"></div>
              <p>Loading...</p>
            </div>
          ) : (
            <ScholarshipTable
              filteredData={filteredData}
              toggleRowExpansion={toggleRowExpansion}
              expandedRows={expandedRows}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default ScholarshipFinder;
