import Link from "next/link";
import React from "react";
import { Facebook } from "lucide-react";
import { Instagram } from "lucide-react";
import { usePathname } from "next/navigation";

// Renders Navbar as General Component
const Navbar = ({ item1, item2 }) => {
  const pathname = usePathname();
  const tools = [
    { label: item1, href: "/" },
    { label: item2, href: "/scholarships" },
    { label: "Futures V2", href: "/futures-v2" },
    { label: "CV Generator", href: "https://cv-generator.avantifellows.org/" },
  ];
  const currentTool =
    tools.find((tool) => tool.href === pathname)?.href || "";

  const handleToolChange = (event) => {
    const value = event.target.value;
    if (!value) return;
    if (value.startsWith("http")) {
      window.open(value, "_blank", "noopener,noreferrer");
      event.target.value = currentTool;
      return;
    }
    window.location.href = value;
  };

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
            <Facebook size={18} color="#fff" fill="#fff" strokeWidth="0.1" />
          </SocialIcon>
          <SocialIcon socialLink={"https://www.instagram.com/avantifellows"}>
            <Instagram size={18} color="#fff" strokeWidth={2.2} />
          </SocialIcon>
        </div>
      </div>
      <div className="w-full bg-[#B52326] px-4 py-2 text-white md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="md:hidden">
            <label className="sr-only" htmlFor="mobile-tools-nav">
              Tools
            </label>
            <select
              id="mobile-tools-nav"
              value={currentTool}
              onChange={handleToolChange}
              className="w-full rounded-full border border-white/30 bg-white px-4 py-2 text-sm font-bold text-[#2f2320]"
            >
              <option value="" disabled>
                Tools
              </option>
              {tools.map((tool) => (
                <option key={tool.href} value={tool.href}>
                  {tool.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mx-auto hidden max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 md:grid">
          <div />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/"
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                pathname === "/"
                  ? "bg-white/20"
                  : "hover:bg-white/10 cursor-pointer"
              }`}
            >
              {item1}
            </Link>
            <Link
              href="/scholarships"
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                pathname === "/scholarships"
                  ? "bg-white/20"
                  : "hover:bg-white/10 cursor-pointer"
              }`}
            >
              {item2}
            </Link>
            <Link
              href="/futures-v2"
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                pathname === "/futures-v2"
                  ? "bg-white/20"
                  : "hover:bg-white/10 cursor-pointer"
              }`}
            >
              Futures V2
            </Link>
          </div>
          <Link
            href="https://cv-generator.avantifellows.org/"
            className="ml-auto inline-flex shrink-0 items-center justify-center rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-black transition hover:bg-[#f8efec]"
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
      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#B52326]"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
};

export default Navbar;
