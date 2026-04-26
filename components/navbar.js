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
      {/* Top Section */}
      <div className="flex items-center justify-between px-3 py-1.5 md:px-8">
        <div className="relative h-7 w-20 md:h-10 md:w-36 shrink-0">
          <Link href="/">
            <img
              src="https://cdn.avantifellows.org/af_logos/avanti_logo_black_text.webp"
              alt="Avanti Fellows logo"
              className="h-full w-full object-contain cursor-pointer"
            />
          </Link>
        </div>

        <div className="flex gap-1">
          <SocialIcon socialLink={"https://www.facebook.com/avantifellows"}>
            <Facebook className="h-3.5 w-3.5 md:h-5 md:w-5 text-white"/>
          </SocialIcon>
          <SocialIcon socialLink={"https://www.instagram.com/avantifellows"}>
            <Instagram className="h-3.5 w-3.5 md:h-5 md:w-5 text-white"/>
          </SocialIcon>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="w-full bg-[#B52326] px-2 py-2 text-white md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-1 flex-nowrap">
          
          <div className="flex items-center justify-center gap-1 min-w-0">
            <Link
              href="/"
              className={`rounded-full px-2 py-1 text-[10px] md:text-sm font-semibold transition whitespace-nowrap ${
                pathname === "/"
                  ? "bg-white/20"
                  : "hover:bg-white/10"
              }`}
            >
              {item1}
            </Link>

            <Link
              href="/scholarships"
              className={`rounded-full px-2 py-1 text-[10px] md:text-sm font-semibold transition whitespace-nowrap ${
                pathname === "/scholarships"
                  ? "bg-white/20"
                  : "hover:bg-white/10"
              }`}
            >
              {item2}
            </Link>
          </div>

          <Link
            href="https://cv-generator.avantifellows.org/"
            className="inline-flex shrink items-center justify-center rounded-full bg-white px-2 py-1 text-[10px] md:text-sm font-semibold text-black transition hover:bg-[#f8efec] whitespace-nowrap"
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
      className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full bg-[#B52326]"
    >
      {children}
    </a>
  );
};

export default Navbar;