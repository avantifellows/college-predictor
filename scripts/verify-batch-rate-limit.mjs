#!/usr/bin/env node
// End-to-end verification for the batch-predict rate limiter (issue #307).
//
// Launches its own Next dev server with BATCH_PREDICT_RATE_LIMIT_MAX=3, then
// drives /api/batch-predict with cheap invalid bodies (400 when allowed) from
// distinct x-forwarded-for values. No test framework is installed in this
// repo, so this standalone script follows scripts/verify-local-routes.mjs.
//
//   node scripts/verify-batch-rate-limit.mjs [port]
//   npm run verify:rate-limit
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.argv[2] || process.env.PORT || "3017";
const baseUrl = `http://127.0.0.1:${port}`;
const max = 3; // must match the BATCH_PREDICT_RATE_LIMIT_MAX the server gets
const batchPath = "/api/batch-predict";
const examPath = "/api/exam-result?exam=INVALID";
const cheapBody = { exam: "INVALID" };
const exhaustedIp = "203.0.113.11";
const freshIp = "203.0.113.22";
const rateLimitError = "Too many requests. Please try again later.";

let failed = false;
let assertions = 0;

const check = (name, ok, detail) => {
  assertions += 1;
  if (ok) {
    console.log(`[PASS] ${name}: ${detail}`);
  } else {
    console.error(`[FAIL] ${name}: ${detail}`);
    failed = true;
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const send = async (pathname, { ip, method = "GET", body } = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      "x-forwarded-for": ip,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // non-JSON responses are fine; assertions describe what we expect
  }
  return { status: response.status, headers: response.headers, text, json };
};

const postBatch = (ip) =>
  send(batchPath, { ip, method: "POST", body: cheapBody });

const isRateLimitError = (result) =>
  result.json &&
  result.json.error === rateLimitError &&
  Object.keys(result.json).length === 1;

const waitForServer = async () => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/favicon.ico`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) return true;
    } catch {
      // not listening (or not ready) yet
    }
    await delay(500);
  }
  return false;
};

const alreadyListening = async () => {
  try {
    await fetch(`${baseUrl}/favicon.ico`, {
      signal: AbortSignal.timeout(1000),
    });
    return true;
  } catch {
    return false;
  }
};

if (await alreadyListening()) {
  console.error(`[FAIL] port ${port} is already in use; refusing to start`);
  process.exit(1);
}

const server = spawn(
  process.execPath,
  [
    path.join(ROOT, "node_modules", "next", "dist", "bin", "next"),
    "dev",
    "-p",
    port,
  ],
  {
    cwd: ROOT,
    detached: true,
    env: {
      ...process.env,
      BATCH_PREDICT_RATE_LIMIT_MAX: String(max),
    },
    stdio: ["ignore", "pipe", "pipe"],
  }
);

let serverStderr = "";
server.stderr.on("data", (chunk) => {
  serverStderr += chunk.toString();
});
server.stdout.on("data", () => {
  // drain stdout so the child never blocks on a full pipe
});

const stopServer = async () => {
  if (!server.pid) return;
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    try {
      server.kill("SIGTERM");
    } catch {
      // already gone
    }
  }
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    delay(2000),
  ]);
};

try {
  if (!(await waitForServer())) {
    throw new Error(`dev server did not become ready on ${baseUrl}`);
  }

  console.log(`Rate limit verification against ${baseUrl} (max=${max})`);

  // (a) The first `max` requests for one IP are allowed. An invalid exam
  // reaches the handler and returns 400; remaining counts down to zero.
  for (let hit = 1; hit <= max; hit += 1) {
    const result = await postBatch(exhaustedIp);
    const expectedRemaining = String(max - hit);
    check(
      `allowed request ${hit}/${max} returns 400 with diminishing quota`,
      result.status === 400 &&
        result.headers.get("ratelimit-limit") === String(max) &&
        result.headers.get("ratelimit-remaining") === expectedRemaining,
      `status=${result.status} RateLimit-Limit=${result.headers.get(
        "ratelimit-limit"
      )} RateLimit-Remaining=${result.headers.get(
        "ratelimit-remaining"
      )} expected Remaining=${expectedRemaining} body=${result.text}`
    );
  }

  // (b) Requests past the limit are blocked with the exact error JSON and a
  // Retry-After header. Two in a row also prove the block is not one-shot.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await postBatch(exhaustedIp);
    const retryAfter = result.headers.get("retry-after");
    check(
      `blocked request ${attempt} returns 429 with exact error and Retry-After`,
      result.status === 429 &&
        isRateLimitError(result) &&
        Number(retryAfter) > 0 &&
        result.headers.get("ratelimit-remaining") === "0",
      `status=${result.status} body=${
        result.text
      } Retry-After=${retryAfter} RateLimit-Remaining=${result.headers.get(
        "ratelimit-remaining"
      )}`
    );
  }

  // (c) Independence: a separate limiter instance and a separate store mean
  // the exhausted IP is not blocked on exam-result, and a fresh IP is still
  // allowed on batch-predict.
  const examResult = await send(examPath, { ip: exhaustedIp });
  check(
    "exhausted batch IP is not blocked on exam-result",
    examResult.status === 400 &&
      examResult.json?.error === "Invalid or missing exam parameter",
    `status=${examResult.status} body=${examResult.text}`
  );

  const freshResult = await postBatch(freshIp);
  check(
    "fresh IP is still allowed on batch-predict",
    freshResult.status === 400 &&
      freshResult.headers.get("ratelimit-remaining") === String(max - 1),
    `status=${freshResult.status} RateLimit-Remaining=${freshResult.headers.get(
      "ratelimit-remaining"
    )} body=${freshResult.text}`
  );

  // (d) express-rate-limit v6 sends the 429 itself and does NOT call next().
  // Without an explicit early return the handler keeps going, parses the
  // body and tries a second response: ERR_HTTP_HEADERS_SENT on the server.
  await delay(500);
  const marker = "ERR_HTTP_HEADERS_SENT";
  const leaked = serverStderr.includes(marker);
  check(
    "no ERR_HTTP_HEADERS_SENT in server stderr",
    !leaked,
    leaked
      ? `found ${marker} in server stderr`
      : "server stderr contains no double-response error"
  );

  console.log(
    failed ? "RESULT: FAILED" : `RESULT: PASSED (${assertions} assertions)`
  );
} catch (error) {
  console.error(`[FAIL] verification could not run: ${error.message}`);
  failed = true;
} finally {
  await stopServer();
}

process.exit(failed ? 1 : 0);
