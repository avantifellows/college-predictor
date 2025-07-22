import React, { useState } from "react";

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

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors duration-200"
          >
            View Details
          </button>
          <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors duration-200">
            Apply Now
          </button>
        </div>
      </div>

      {/* Empty Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="float-right text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
            <div className="mt-4">{/* Empty popup content */}</div>
          </div>
        </div>
      )}
    </>
  );
}

function CardTable() {
  return <div></div>;
}
export default ScholarshipCard;
