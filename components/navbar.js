import Link from "next/link";
import React from "react";
import { Facebook } from "lucide-react";
import { Instagram } from "lucide-react";
import { usePathname } from "next/navigation";

// Renders Navbar as General Component
const Navbar = ({ item1, item2 }) => {
  const pathname = usePathname();
  const isScholarshipsRoute =
    pathname === "/scholarships" || pathname === "/scholarships_result";

  return (
    <header className="sticky top-0 z-40 border-b border-[#e2e8f0] bg-white/96 backdrop-blur-sm">
      <div className="app-page flex items-center justify-between gap-4 py-3">
        <div className="relative h-8 w-28 sm:h-9 sm:w-32 md:h-10 md:w-36">
          <Link href="/">
            <img
              src="https://cdn.avantifellows.org/af_logos/avanti_logo_black_text.webp"
              alt="Avanti Fellows logo"
              className="h-full w-full cursor-pointer object-contain"
            />
          </Link>
        </div>

        <div className="hidden items-center gap-2.5 sm:flex">
          <SocialIcon socialLink={"https://www.facebook.com/avantifellows"}>
            <Facebook size={16} color="#fff" fill="#fff" strokeWidth="0.4" />
          </SocialIcon>
          <SocialIcon socialLink={"https://www.instagram.com/avantifellows"}>
            <Instagram size={16} color="#fff" />
          </SocialIcon>
        </div>
      </div>

      <div className="border-t border-[#e2e8f0] bg-white">
        <div className="app-page flex flex-wrap items-center justify-between gap-2 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                pathname === "/"
                  ? "bg-[#b63a30] text-white"
                  : "text-[#475569] hover:bg-[#f8fafc]"
              }`}
            >
              {item1}
            </Link>
            <Link
              href="/scholarships"
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                isScholarshipsRoute
                  ? "bg-[#b63a30] text-white"
                  : "text-[#475569] hover:bg-[#f8fafc]"
              }`}
            >
              {item2}
            </Link>
          </div>

          <Link
            href="https://cv-generator.avantifellows.org/"
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-[#d1d5db] bg-white px-3 py-1.5 text-sm font-semibold text-[#b63a30] transition hover:border-[#b63a30] hover:bg-[#f8fafc]"
            target="_blank"
            rel="noopener noreferrer"
          >
            CV Generator
          </Link>
        </div>
      </div>
    </header>
  );
};

const SocialIcon = ({ children, socialLink }) => {
  return (
    <a
      href={socialLink}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b63a30] shadow-sm transition hover:scale-105 hover:bg-[#9e3128]"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
};

export default Navbar;
