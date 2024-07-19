import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import getConstants from "../constants";
import ScholarshipTable from "../components/ScholarshipTable";
import Script from "next/script";
import Head from "next/head";
import Fuse from "fuse.js";

const fuseOptions = {
  isCaseSensitive: false,
  includeScore: false,
  shouldSort: true,
  includeMatches: false,
  findAllMatches: false,
  minMatchCharLength: 1,
  location: 0,
  threshold: 0.3,
  distance: 100,
  useExtendedSearch: true,
  ignoreLocation: true,
  ignoreFieldNorm: false,
  fieldNormWeight: 1,
  keys: ["Scholarship Name"],
};

const ScholarshipFinder = () => {
  const router = useRouter();
  const { grade, stream, gender, familyIncome, category } = router.query;
  const [filteredData, setFilteredData] = useState([]);
  const [fullData, setFullData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState([]);

  const toggleRowExpansion = (index) => {
    const updatedExpandedRows = [...expandedRows];
    updatedExpandedRows[index] = !updatedExpandedRows[index];
    setExpandedRows(updatedExpandedRows);
  };
  const fuse = new Fuse(filteredData, fuseOptions);

  const searchFun = (e) => {
    if (e.target.value === "") {
      setFilteredData(fullData);
      return;
    }
    const searchValue = e.target.value;
    const result = fuse.search(searchValue);
    setFilteredData(result.map((r) => r.item));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams(Object.entries(router.query));
        const queryString = params.toString();
        const response = await fetch(`/api/scholarship-data?${queryString}`);
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        setFilteredData(data);
        setFullData(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
        setFilteredData([]);
        setFullData([]);
      }
    };
    fetchData();
  }, [router.query]);

  return (
    <>
      <Head>
        <title>Scholarship - Result</title>
      </Head>

      <div className="flex flex-col items-center  mt-8 pb-10">
        <div className="flex flex-col items-center justify-center w-full sm:w-5/6 md:w-3/4  bg-white p-6 rounded-lg shadow-lg">
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
            <>
              <div className="mb-4 w-full flex flex-col left justify-center items-center">
                <label className="block text-md font-semibold text-gray-700 content-center mx-2">
                  Search: &#128269;
                </label>
                <input
                  onChange={searchFun}
                  placeholder="Scholarship Name"
                  className="border border-gray-300 rounded text-center h-fit p-1 sm:w-5/12 w-3/4"
                />
              </div>
              <ScholarshipTable
                filteredData={filteredData}
                toggleRowExpansion={toggleRowExpansion}
                expandedRows={expandedRows}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ScholarshipFinder;
