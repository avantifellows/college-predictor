import React from "react";


function ScholarshipCard({scholarship}) {
  return (
    <div className="flex gap-x-4 rounded-xl bg-white p-6 shadow-lg outline outline-black/5 dark:bg-slate-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">
      <h1>{scholarship["Scholarship Name"]}</h1>
      <p>Amount: ₹ {scholarship["Scholarship Amount"]}</p>
      <button>View Details</button>
      <button>Apply Now</button>
    </div>
  );
}

function CardTable () {
    return (
        <div></div>
    );
}
export default ScholarshipCard;