import {
  BarChart3,
  Briefcase,
  GraduationCap,
  School,
  ClipboardList,
  FileText,
  LineChart,
  ListChecks,
  Search,
} from "lucide-react";

// The site's shape, in one place: the home tiles, the navbar menus and the
// section pages all read this, so they can't drift apart. One short plain
// line per item (no dashes, no jargon); students read these, not us.
export const CV_URL = "https://cv-generator.avantifellows.org/";

export const SECTIONS = {
  careers: {
    title: "Careers",
    icon: Briefcase,
    line: "What careers pay, and make a CV",
    items: [
      {
        href: "/careers",
        icon: Search,
        name: "Explore careers",
        line: "What each career pays and needs",
      },
      {
        href: CV_URL,
        icon: FileText,
        name: "CV Generator",
        line: "A clean resume in minutes",
        external: true,
      },
    ],
  },
  colleges: {
    title: "Colleges",
    icon: School,
    line: "Rankings, placements, fees and cutoffs",
    items: [
      {
        href: "/colleges",
        icon: Search,
        name: "Explore colleges",
        line: "Rankings, placements and fees",
      },
      {
        href: "/compare",
        icon: BarChart3,
        name: "Compare",
        line: "Colleges side by side",
      },
      {
        href: "/predictor",
        icon: LineChart,
        name: "College Predictor",
        line: "Colleges you can get with your rank",
      },
    ],
  },
  exams: {
    title: "Exams",
    icon: ClipboardList,
    line: "Dates, eligibility, cutoffs and JoSAA",
    items: [
      {
        href: "/exams",
        icon: Search,
        name: "Explore exams",
        line: "Dates, eligibility and paper pattern",
      },
      {
        href: "/predictor",
        icon: LineChart,
        name: "College Predictor",
        line: "Colleges you can get with your rank",
      },
      {
        href: "/josaa",
        icon: ListChecks,
        name: "JoSAA Quiz and Simulator",
        line: "How JoSAA seat allotment works",
      },
    ],
  },
};

// the four home tiles; Scholarships goes straight to the finder
export const HOME_TILES = [
  { key: "careers", href: "/sections/careers", ...SECTIONS.careers },
  { key: "colleges", href: "/sections/colleges", ...SECTIONS.colleges },
  { key: "exams", href: "/sections/exams", ...SECTIONS.exams },
  {
    key: "scholarships",
    href: "/scholarships",
    title: "Scholarships",
    icon: GraduationCap,
    line: "Scholarships you can apply for",
  },
];

// which menu a page belongs to, so exactly one lights up. The predictor is
// listed under both Colleges and Exams but lives under Colleges.
export const MENU_OF_PATH = [
  ["/careers", "careers"],
  ["/colleges", "colleges"],
  ["/compare", "colleges"],
  ["/predictor", "colleges"],
  ["/college_predictor", "colleges"],
  ["/exams", "exams"],
  ["/josaa", "exams"],
  ["/mock-allotment", "exams"],
];
export const menuOf = (pathname = "") => {
  const hit = MENU_OF_PATH.find(
    ([p]) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (hit) return hit[1];
  const m = pathname.match(/^\/sections\/(\w+)/);
  return m ? m[1] : null;
};
