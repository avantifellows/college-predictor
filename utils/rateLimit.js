import crypto from "crypto";
import net from "net";

const GLOBAL_STORE_KEY = "__avantiRateLimitStore__";
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_REQUESTS = 100;
const PROXY_HEADER_NAMES = [
  "cf-connecting-ip",
  "true-client-ip",
  "x-real-ip",
  "x-forwarded-for",
  "fly-client-ip",
  "fastly-client-ip",
  "x-client-ip",
  "x-cluster-client-ip",
  "forwarded",
];

const getGlobalStore = () => {
  if (!globalThis[GLOBAL_STORE_KEY]) {
    globalThis[GLOBAL_STORE_KEY] = new Map();
  }

  return globalThis[GLOBAL_STORE_KEY];
};

const normalizeIp = (candidate) => {
  if (typeof candidate !== "string") {
    return "";
  }

  let value = candidate.trim();
  if (!value) {
    return "";
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    value = value.slice(1, -1);
  }

  if (value.toLowerCase().startsWith("for=")) {
    value = value.slice(4);
  }

  if (value.startsWith("::ffff:")) {
    value = value.slice(7);
  }

  if (value === "::1") {
    value = "127.0.0.1";
  }

  if (value.includes("%")) {
    value = value.split("%")[0];
  }

  return value.trim();
};

const isValidIp = (candidate) => net.isIP(normalizeIp(candidate)) !== 0;

const isPrivateIpv4 = (ip) => {
  const octets = ip.split(".").map((value) => Number.parseInt(value, 10));

  if (octets.length !== 4 || octets.some((value) => Number.isNaN(value))) {
    return false;
  }

  const [first, second] = octets;

  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 100 && second >= 64 && second <= 127)
  );
};

const isPrivateIpv6 = (ip) => {
  const lowered = ip.toLowerCase();

  return (
    lowered === "::1" ||
    lowered.startsWith("fc") ||
    lowered.startsWith("fd") ||
    lowered.startsWith("fe80:")
  );
};

const isPrivateOrLoopbackIp = (candidate) => {
  const normalizedIp = normalizeIp(candidate);
  const ipVersion = net.isIP(normalizedIp);

  if (ipVersion === 4) {
    return isPrivateIpv4(normalizedIp);
  }

  if (ipVersion === 6) {
    return isPrivateIpv6(normalizedIp);
  }

  return false;
};

const parseForwardedHeader = (value) => {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((segment) => {
      const match = segment.match(/for=(?:"?\[?)([^;\],"]+)/i);
      return match ? match[1] : "";
    })
    .filter(Boolean);
};

const getHeaderCandidates = (headerName, headerValue) => {
  if (headerName === "forwarded") {
    return parseForwardedHeader(headerValue).map((value) => ({
      value,
      source: headerName,
    }));
  }

  if (Array.isArray(headerValue)) {
    return headerValue.flatMap((value) =>
      String(value)
        .split(",")
        .map((candidate) => ({
          value: candidate,
          source: headerName,
        }))
    );
  }

  if (typeof headerValue === "string") {
    return headerValue.split(",").map((candidate) => ({
      value: candidate,
      source: headerName,
    }));
  }

  return [];
};

const getBestHeaderIp = (req) => {
  const validCandidates = [];

  for (const headerName of PROXY_HEADER_NAMES) {
    const headerValue = req.headers[headerName];
    const candidates = getHeaderCandidates(headerName, headerValue);

    for (const candidate of candidates) {
      const normalizedIp = normalizeIp(candidate.value);
      if (!isValidIp(normalizedIp)) {
        continue;
      }

      validCandidates.push({
        value: normalizedIp,
        source: candidate.source,
      });
    }
  }

  if (validCandidates.length === 0) {
    return null;
  }

  return (
    validCandidates.find(
      (candidate) => !isPrivateOrLoopbackIp(candidate.value)
    ) || validCandidates[0]
  );
};

const shouldTrustProxy = (remoteIp, trustProxy) => {
  if (typeof trustProxy === "boolean") {
    return trustProxy;
  }

  return (
    process.env.TRUST_PROXY === "true" ||
    Boolean(process.env.VERCEL) ||
    !remoteIp ||
    isPrivateOrLoopbackIp(remoteIp)
  );
};

const buildFallbackIdentifier = (req) => {
  const fingerprint = [
    req.socket?.remoteAddress || "",
    req.connection?.remoteAddress || "",
    req.headers["user-agent"] || "",
    req.headers.host || "",
    req.headers["accept-language"] || "",
  ].join("|");

  return `anonymous-${crypto
    .createHash("sha256")
    .update(fingerprint)
    .digest("hex")
    .slice(0, 16)}`;
};

export const getClientIdentifier = (req, options = {}) => {
  const remoteIp = normalizeIp(
    req.socket?.remoteAddress || req.connection?.remoteAddress || ""
  );
  const trustProxy = shouldTrustProxy(remoteIp, options.trustProxy);

  if (trustProxy) {
    const forwardedIp = getBestHeaderIp(req);
    if (forwardedIp) {
      return forwardedIp;
    }
  }

  if (isValidIp(remoteIp)) {
    return {
      value: remoteIp,
      source: "remoteAddress",
    };
  }

  const headerIp = getBestHeaderIp(req);
  if (headerIp) {
    return headerIp;
  }

  return {
    value: buildFallbackIdentifier(req),
    source: "fingerprint",
  };
};

export const createMemoryRateLimitStore = () => {
  const buckets = getGlobalStore();

  return {
    async increment(key, windowMs) {
      const now = Date.now();
      const current = buckets.get(key);

      if (!current || current.resetTime <= now) {
        const next = {
          count: 1,
          resetTime: now + windowMs,
        };

        buckets.set(key, next);

        if (buckets.size > 1000) {
          for (const [storedKey, entry] of buckets.entries()) {
            if (entry.resetTime <= now) {
              buckets.delete(storedKey);
            }
          }
        }

        return next;
      }

      current.count += 1;
      buckets.set(key, current);
      return current;
    },
  };
};

const defaultStore = createMemoryRateLimitStore();

const validateLimiterOptions = ({
  namespace,
  windowMs,
  maxRequests,
  store,
}) => {
  if (!namespace || typeof namespace !== "string") {
    throw new Error("Rate limiter namespace must be a non-empty string.");
  }

  if (!Number.isInteger(windowMs) || windowMs <= 0) {
    throw new Error("Rate limiter windowMs must be a positive integer.");
  }

  if (!Number.isInteger(maxRequests) || maxRequests <= 0) {
    throw new Error("Rate limiter maxRequests must be a positive integer.");
  }

  if (!store || typeof store.increment !== "function") {
    throw new Error(
      "Rate limiter store must implement an increment(key, windowMs) method."
    );
  }
};

const setRateLimitHeaders = (
  res,
  { maxRequests, remaining, resetTime, windowMs }
) => {
  const resetAfterSeconds = Math.max(
    0,
    Math.ceil((resetTime - Date.now()) / 1000)
  );
  const policy = `${maxRequests};w=${Math.ceil(windowMs / 1000)}`;

  res.setHeader("RateLimit-Limit", String(maxRequests));
  res.setHeader("RateLimit-Remaining", String(remaining));
  res.setHeader("RateLimit-Reset", String(resetAfterSeconds));
  res.setHeader("RateLimit-Policy", policy);
  res.setHeader("X-RateLimit-Limit", String(maxRequests));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(resetAfterSeconds));

  return resetAfterSeconds;
};

export const createRateLimiter = ({
  namespace,
  windowMs = DEFAULT_WINDOW_MS,
  maxRequests = DEFAULT_MAX_REQUESTS,
  message = "Too many requests. Please try again later.",
  store = defaultStore,
  trustProxy = "auto",
} = {}) => {
  validateLimiterOptions({ namespace, windowMs, maxRequests, store });

  return async (req, res) => {
    const client = getClientIdentifier(req, { trustProxy });
    const key = `${namespace}:${client.value}`;
    const entry = await store.increment(key, windowMs);
    const remaining = Math.max(0, maxRequests - entry.count);
    const retryAfter = setRateLimitHeaders(res, {
      maxRequests,
      remaining,
      resetTime: entry.resetTime,
      windowMs,
    });

    if (entry.count > maxRequests) {
      res.setHeader("Retry-After", String(retryAfter));

      console.warn("[RATE_LIMIT] Request blocked", {
        namespace,
        identifier: client.value,
        source: client.source,
        method: req.method,
        path: req.url,
        count: entry.count,
        resetTime: new Date(entry.resetTime).toISOString(),
      });

      res.status(429).json({
        error: message,
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter,
        windowSeconds: Math.ceil(windowMs / 1000),
      });

      return {
        allowed: false,
        retryAfter,
      };
    }

    return {
      allowed: true,
      identifier: client.value,
      source: client.source,
      remaining,
      resetTime: entry.resetTime,
    };
  };
};
