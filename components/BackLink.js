import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// "← Home" / "← All colleges": the way back, same look on every page.
export default function BackLink({ href = "/", children = "Home" }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8f2e31] hover:underline"
    >
      <ArrowLeft size={15} /> {children}
    </Link>
  );
}
