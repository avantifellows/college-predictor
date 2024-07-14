import React, { useState, useEffect } from "react";
import Script from "next/script";
import Dropdown from "../components/dropdown";
import { useRouter } from "next/router";
import { scholarshipConfig } from "../scholarshipConfig";
import Head from "next/head";

const ScholarshipPage = () => {
  const [formData, setFormData] = useState({});
  const [isClient, setIsClient] = useState(false);
  console.log(formData);

  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    // Initialize formData with empty values for each field
    const initialFormData = {};
    scholarshipConfig.fields.forEach((field) => {
      initialFormData[field.name] = "";
    });
    setFormData(initialFormData);
  }, []);

  const handleDropdownChange = (name) => (selectedOption) => {
    setFormData((prevData) => ({
      ...prevData,
      [name]: selectedOption.value,
    }));
  };

  const handleSubmit = () => {
    const queryString = Object.entries(formData)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");
    router.push(`/scholarships_result?${queryString}`);
  };

  const isSubmitDisabled = Object.values(formData).some((value) => !value);

  const dropdownProps = {
    menuPortalTarget: isClient ? document.body : null,
    styles: isClient
      ? {
          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        }
      : {},
    className: "w-full",
  };

  return (
    <>
      <Head>
        <title>Scholarships - Home</title>
      </Head>

      <div className="flex flex-col justify-start items-center w-full mt-8 pb-10">
        <div className="text-center flex flex-col items-center w-full sm:w-3/4 md:w-2/3 lg:w-1/2 mt-8 p-8 pb-10 bg-[#f8f9fa] shadow-inner drop-shadow-md rounded-md">
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
            {scholarshipConfig.name}
          </h1>
          <div className="flex flex-col sm:flex-row flex-wrap w-full justify-center items-center">
            {scholarshipConfig.fields.map((field) => (
              <div key={field.name} className="my-4 w-full sm:w-3/4">
                <label className="block text-md font-semibold text-gray-700 mb-2 -translate-x-4">
                  {field.label}
                </label>
                <Dropdown
                  options={field.options}
                  onChange={handleDropdownChange(field.name)}
                  {...dropdownProps}
                />
                {field.helperText &&
                  field.helperText.map((text, index) => (
                    <p key={index} className="text-sm text-gray-700 mt-1">
                      {text}
                    </p>
                  ))}
              </div>
            ))}
          </div>
          <button
            className={
              "mt-6 px-8 py-2.5 rounded-lg bg-red-600 text-white cursor-pointer hover:bg-red-700 active:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed -translate-x-4"
            }
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
          >
            Submit
          </button>
          {isSubmitDisabled && (
            <p className="text-red-600 text-sm mt-2 -translate-x-4">
              Please fill all the fields before submitting!
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default ScholarshipPage;
