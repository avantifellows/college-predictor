import Link from "next/link";
import React from "react";
import { Facebook } from "lucide-react";
import { Instagram } from "lucide-react";
import { usePathname } from "next/navigation";

// Renders Navbar as General Component
const Navbar = ({ item1, item2 }) => {
  const pathname = usePathname();
  return (
    <div className="border-b border-[#eaded8] bg-white shadow-sm">
      <div className="flex flex-row items-center justify-between px-4 py-1.5 md:px-8">
        <div className="relative h-8 w-28 md:h-10 md:w-36">
          <Link href="/">
            <img
              src="https://cdn.avantifellows.org/af_logos/avanti_logo_black_text.webp"
              alt="Avanti Fellows logo"
              className="h-full w-full object-contain cursor-pointer"
            />
          </Link>
        </div>

        <div className="flex gap-1.5">
          <SocialIcon socialLink={"https://www.facebook.com/avantifellows"}>
            <Facebook color="#fff" fill="#fff" strokeWidth="0.1" />
          </SocialIcon>
          <SocialIcon socialLink={"https://www.instagram.com/avantifellows"}>
            <Instagram color="#fff" />
          </SocialIcon>
        </div>
      </div>
      <div className="w-full bg-[#B52326] px-1 py-2 text-white md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-around md:grid md:grid-cols-[1fr_auto_1fr]">
          <div className="hidden md:block" />
          <div className="contents md:flex md:flex-wrap md:items-center md:justify-center md:gap-2">
            <Link
              href="/"
              className={`whitespace-nowrap rounded-full px-2 py-1.5 text-sm font-semibold transition md:px-3 ${
                pathname === "/"
                  ? "bg-white/20"
                  : "hover:bg-white/10 cursor-pointer"
              }`}
            >
              {item1}
            </Link>
            <Link
              href="/scholarships"
              className={`rounded-full px-2 py-1.5 text-sm font-semibold transition whitespace-nowrap md:px-3 ${
                pathname === "/scholarships"
                  ? "bg-white/20"
                  : "hover:bg-white/10 cursor-pointer"
              }`}
            >
              {item2}
            </Link>
          </div>
          <Link
            href="https://cv-generator.avantifellows.org/"
            className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-white px-2 py-1.5 text-sm font-semibold text-black transition hover:bg-[#f8efec] md:px-3 md:ml-auto"
            target="_blank"
            rel="noopener noreferrer"
          >
            CV Generator
          </Link>
        </div>
      </div>
    </div>
  );
};

const SocialIcon = ({ children, socialLink }) => {
  return (
    <a
      href={socialLink}
      className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B52326]"
    >
      {children}
    </a>
  );
};

export default Navbar;
