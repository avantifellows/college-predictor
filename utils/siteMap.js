import {
  BarChart3,
  Briefcase,
  GraduationCap,
  School,
  ClipboardList,
  FileText,
  HelpCircle,
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
    line: "Explore careers, take the quiz, make a CV",
    items: [
      {
        href: "/careers",
        icon: Search,
        name: "Explore careers",
        line: "What each career pays and needs",
      },
      {
        href: "/quiz",
        icon: HelpCircle,
        name: "Career Quiz",
        line: "Find the path to a career",
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
