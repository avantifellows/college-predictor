import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Facebook, Instagram, UserRound } from "lucide-react";
import { SECTIONS, menuOf } from "../utils/siteMap";
import { usePathname } from "next/navigation";
import { PORTAL_LOGIN_URL, useStudentProfile } from "../utils/portalSession";

// Navbar in the futures v2 style: Careers / Colleges / Exams menus (the same
// items as the section pages, from utils/siteMap), then Scholarships and
// Datasets. Menus open on click (works on touch), close on outside click or
// navigation.
const MENUS = ["careers", "colleges", "exams"].map((k) => ({
  key: k,
  label: SECTIONS[k].title,
  items: SECTIONS[k].items.map((i) => ({
    href: i.href,
    icon: i.icon,
    label: i.name,
    external: i.external,
  })),
}));

const flatLink = (pathname, href) =>
  `rounded-full px-2 py-1.5 text-[13px] font-semibold transition sm:px-3 sm:text-sm ${
    pathname === href || pathname.startsWith(`${href}/`)
      ? "bg-white/20"
      : "hover:bg-white/10 cursor-pointer"
  }`;

const NavGroup = ({ menuKey, label, items, pathname, open, onToggle }) => {
  const active = menuOf(pathname) === menuKey;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center gap-0.5 rounded-full px-2 py-1.5 text-[13px] font-semibold transition sm:gap-1 sm:px-3 sm:text-sm ${
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
        <div className="absolute left-0 top-[calc(100%+10px)] z-50 min-w-[220px] rounded-xl border border-[#eaded8] bg-white p-2 shadow-lg sm:left-1/2 sm:-translate-x-1/2">
          <span className="absolute -top-[7px] left-8 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-[#eaded8] bg-white sm:left-1/2" />
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
  const profile = useStudentProfile();
  const barRef = useRef(null);

  useEffect(() => setOpen(null), [pathname]);
  useEffect(() => {
    const onDoc = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Student login / Student Corner: on the red bar (onRed) from tablet
  // width up, in the white top bar on a phone
  const account = (onRed) =>
    profile ? (
      <Link
        href="/student-corner"
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
          onRed
            ? pathname === "/student-corner"
              ? "bg-white/20 text-white"
              : "bg-white/10 text-white hover:bg-white/20"
            : "bg-[#fbeeec] text-[#B52326]"
        }`}
      >
        <UserRound size={15} />
        <span className="max-w-[140px] truncate">
          {profile.name ? profile.name.split(" ")[0] : "Student Corner"}
        </span>
      </Link>
    ) : (
      <a
        href={PORTAL_LOGIN_URL}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold shadow-sm transition ${
          onRed
            ? "bg-white text-[#B52326] hover:bg-[#f8efec]"
            : "bg-[#B52326] text-white hover:bg-[#9E1F22]"
        }`}
      >
        <UserRound size={15} />
        {onRed ? "Student login" : "Login"}
      </a>
    );

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

        <div className="flex items-center gap-1.5">
          {/* on a phone the login sits up here, so the red bar keeps the
              five menus on one line */}
          <div className="mr-1 sm:hidden">{account(false)}</div>
          <SocialIcon socialLink={"https://www.facebook.com/avantifellows"}>
            <Facebook size={18} color="#fff" fill="#fff" strokeWidth="0.1" />
          </SocialIcon>
          <SocialIcon socialLink={"https://www.instagram.com/avantifellows"}>
            <Instagram size={18} color="#fff" strokeWidth={2.2} />
          </SocialIcon>
        </div>
      </div>
      <div ref={barRef} className="w-full bg-[#B52326] py-3 text-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 sm:px-5 md:px-8">
          <div className="flex flex-wrap items-center gap-0.5 sm:gap-2">
            {MENUS.map((m) => (
              <NavGroup
                key={m.key}
                menuKey={m.key}
                label={m.label}
                items={m.items}
                pathname={pathname || ""}
                open={open === m.key}
                onToggle={() => setOpen(open === m.key ? null : m.key)}
              />
            ))}
            <Link
              href="/scholarships"
              className={flatLink(pathname || "", "/scholarships")}
            >
              Scholarships
            </Link>
            {/* on a phone Datasets lives in the footer ("Built with open
                data"), so the menus stay on one line */}
            <Link
              href="/datasets"
              className={`hidden sm:inline-block ${flatLink(
                pathname || "",
                "/datasets"
              )}`}
            >
              Datasets
            </Link>
          </div>
          <div className="hidden shrink-0 sm:block">{account(true)}</div>
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
