import { useEffect, useState } from "react";
import Script from "next/script";

// Google Analytics for the whole site. It used to load only on the predictor
// form, so a visit that never opened the predictor went uncounted. Test
// copies (a developer's machine, Vercel / Amplify branch previews) don't
// report, so the numbers are real students only.
const GA_ID = "G-FHGVRT52L7";
const isTestCopy = (host) =>
  host === "localhost" ||
  host === "127.0.0.1" ||
  host.endsWith(".vercel.app") ||
  host.endsWith(".amplifyapp.com");

export default function Analytics() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(!isTestCopy(window.location.hostname)), []);
  if (!on) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
