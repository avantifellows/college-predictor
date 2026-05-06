import { Head, Html, Main, NextScript } from "next/document";

const globalErrorLoggingScript = `
  (function () {
    function logError(label, payload) {
      if (window.console && typeof window.console.error === "function") {
        window.console.error(label, payload);
      }
    }

    window.addEventListener("error", function (event) {
      logError("[GlobalError]", {
        message: event.message || "Unknown runtime error",
        source: event.filename || null,
        line: event.lineno || null,
        column: event.colno || null,
        stack: event.error && event.error.stack ? event.error.stack : null,
      });
    });

    window.addEventListener("unhandledrejection", function (event) {
      var reason = event.reason;

      logError("[UnhandledPromiseRejection]", {
        message:
          reason && reason.message ? reason.message : String(reason || "Unknown rejection"),
        stack: reason && reason.stack ? reason.stack : null,
      });
    });
  })();
`;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <script
          dangerouslySetInnerHTML={{
            __html: globalErrorLoggingScript,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
