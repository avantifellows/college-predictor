import Head from "next/head";
import { useRouter } from "next/router";
import BackLink from "../../components/BackLink";
import IconTile from "../../components/IconTile";
import { SECTIONS } from "../../utils/siteMap";

// /sections/careers, /sections/colleges, /sections/exams: the tiles inside
// each home tile (same items as the navbar menus).
export default function Section() {
  const router = useRouter();
  const s = SECTIONS[router.query.section];
  if (!router.isReady) return null;
  if (!s) {
    if (typeof window !== "undefined") router.replace("/");
    return null;
  }
  const Icon = s.icon;
  return (
    <>
      <Head>
        <title>{`${s.title} - Futures`}</title>
      </Head>
      <div className="min-h-screen bg-[#fdf8f6] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-[900px]">
          <BackLink />
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#B52326] text-white">
              <Icon size={24} />
            </span>
            <h1 className="text-3xl font-black text-[#2f2320]">{s.title}</h1>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">
            {s.items.map((it) => (
              <IconTile
                key={it.name}
                href={it.href}
                icon={it.icon}
                title={it.name}
                line={it.line}
                external={it.external}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
