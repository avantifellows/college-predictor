import Link from "next/link";
import React, { useEffect, useState } from "react";

// One footer for every page: who made it, when the data last moved, and the
// one link that matters for trust (the open data behind the site).
const Footer = () => {
  const [updated, setUpdated] = useState(null);
  useEffect(() => {
    fetch("/data/last_updated.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUpdated(d.date))
      .catch(() => {});
  }, []);

  return (
    <footer className="border-t border-[#eaded8] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-1.5 px-4 py-6 text-center text-xs text-[#7a635d] sm:flex-row sm:justify-between sm:text-left">
        <p>© {new Date().getFullYear()} Avanti Fellows</p>
        <p>
          <Link href="/datasets" className="transition hover:text-[#B52326]">
            Built with open data
          </Link>
          {updated ? ` · Updated ${updated}` : ""}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
