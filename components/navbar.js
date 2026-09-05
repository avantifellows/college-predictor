import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import {
  Award,
  Briefcase,
  Building2,
  ChevronDown,
  ClipboardList,
  Facebook,
  FileText,
  Instagram,
  Target,
} from "lucide-react";
import { usePathname } from "next/navigation";

// Navbar in the futures-standalone style: two grouped menus plus Datasets,
// instead of seven flat links. Groups open on click (works on touch), close
// on outside click or navigation.

const DASHBOARDS = [
  { href: "/careers", icon: Briefcase, label: "Careers" },
  { href: "/colleges", icon: Building2, label: "Colleges" },
  { href: "/exams", icon: ClipboardList, label: "Exams" },
  { href: "/scholarships", icon: Award, label: "Scholarships" },
];

const TOOLS = [
  { href: "/predictor", icon: Target, label: "College Predictor" },
  {
    href: "https://cv-generator.avantifellows.org/",
    icon: FileText,
    label: "CV Generator",
    external: true,
  },
];

const NavGroup = ({ label, items, pathname, open, onToggle }) => {
  const active = items.some((i) => i.href === pathname);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
          active || open ? "bg-white/20" : "hover:bg-white/10"
        }`}
      >
        {label}
        <ChevronDown
          size={14}
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="absolute left-1/2 top-[calc(100%+10px)] z-50 min-w-[220px] -translate-x-1/2 rounded-xl border border-[#eaded8] bg-white p-2 shadow-lg">
          <span className="absolute -top-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-[#eaded8] bg-white" />
          {items.map(({ href, icon: Icon, label: l, external }) => (
            <Link
              key={l}
              href={href}
              {...(external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[#2f2320] transition hover:bg-[#fbeeec]"
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#fbeeec] text-[#B52326]">
                <Icon size={18} />
              </span>
              <span className="text-[15px] font-bold leading-tight">{l}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const Navbar = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(null);
  const barRef = useRef(null);

  useEffect(() => setOpen(null), [pathname]);
  useEffect(() => {
    const onDoc = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="border-b border-[#eaded8] bg-white shadow-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-row items-center justify-between px-5 py-2.5 md:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="relative block h-8 w-28 md:h-10 md:w-36">
            <img
              src="https://cdn.avantifellows.org/af_logos/avanti_logo_black_text.webp"
              alt="Avanti Fellows logo"
              className="h-full w-full cursor-pointer object-contain"
            />
          </Link>
          <Link
            href="/"
            className="hidden border-l border-[#eaded8] pl-3 text-xl font-black text-[#2f2320] transition hover:text-[#B52326] sm:block"
          >
            futures
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
      <div
        ref={barRef}
        className="w-full bg-[#B52326] py-3 text-white"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-5 md:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <NavGroup
              label="Dashboards"
              items={DASHBOARDS}
              pathname={pathname}
              open={open === "dash"}
              onToggle={() => setOpen(open === "dash" ? null : "dash")}
            />
            <NavGroup
              label="Tools"
              items={TOOLS}
              pathname={pathname}
              open={open === "tools"}
              onToggle={() => setOpen(open === "tools" ? null : "tools")}
            />
            <Link
              href="/datasets"
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                pathname === "/datasets"
                  ? "bg-white/20"
                  : "hover:bg-white/10 cursor-pointer"
              }`}
            >
              Datasets
            </Link>
          </div>
          {/* right side stays empty until Sign in ships */}
          <div />
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
