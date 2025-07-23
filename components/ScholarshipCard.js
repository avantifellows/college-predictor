import React, { useState } from "react";
import Link from "next/link";

function ScholarshipCard({ scholarship }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="rounded-xl bg-stone-50 p-6 shadow-lg  outline-black/5 mb-4">
        {/* Scholarship Name - Top of card, single line */}
        <h1
          className="text-lg font-bold text-gray-900 dark:text-white mb-4 truncate"
          title={scholarship["Scholarship Name"]}
        >
          {scholarship["Scholarship Name"]}
        </h1>

        {/* Amount */}
        <p className="text-lg font-semibold mb-4">
          Amount: ₹ {scholarship["Scholarship Amount"]}
        </p>
        <p className="text-lg font-semibold mb-4">
          Gender: {scholarship["Gender"]}
        </p>
        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors duration-200"
          >
            View Details
          </button>
          <Link
            href={scholarship["Pre-filled Form Link"] || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors duration-200 inline-block text-center"
          >
            Apply Now
          </Link>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="float-right text-gray-500 hover:text-gray-700 text-2xl md:text-lg p-2 md:p-0"
            >
              ×
            </button>
            <div className="mt-4">
              <h2 className="text-lg font-bold mb-4">Eligibility</h2>
              <p>{scholarship["Eligibility"]}</p>
              <h2 className="text-lg font-bold mb-4">Benefits</h2>
              <p>{scholarship["Benefits"]}</p>
              <h2 className="text-lg font-bold mb-4">Documents Required</h2>
              <p>{scholarship["Doc Required"]}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export default ScholarshipCard;
