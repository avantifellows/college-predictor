import crypto from "crypto";

const DEFAULT_MESSAGES = {
  400: "Invalid request.",
  405: "Method not allowed.",
  429: "Too many requests. Please try again later.",
  500: "Something went wrong. Please try again later.",
};

const getNormalizedHeaderValue = (value) => {
  if (Array.isArray(value)) {
    return value[0]?.trim() || "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
};

export const attachRequestId = (req, res) => {
  const existingHeader = getNormalizedHeaderValue(req.headers["x-request-id"]);
  const existingResponseHeader = getNormalizedHeaderValue(
    res.getHeader("X-Request-Id")
  );

  const requestId =
    existingResponseHeader || existingHeader || crypto.randomUUID();

  res.setHeader("X-Request-Id", requestId);
  return requestId;
};

const logApiEvent = (level, label, payload) => {
  if (level === "error") {
    console.error(label, payload);
    return;
  }

  if (level === "warn") {
    console.warn(label, payload);
  }
};

export const sendErrorResponse = (
  req,
  res,
  {
    statusCode = 500,
    userMessage,
    code = null,
    error = null,
    context = null,
    logLevel = null,
    logLabel = "[API_ERROR]",
  } = {}
) => {
  const requestId = attachRequestId(req, res);
  const safeMessage =
    userMessage || DEFAULT_MESSAGES[statusCode] || DEFAULT_MESSAGES[500];
  const resolvedLogLevel = logLevel || (statusCode >= 500 ? "error" : null);

  if (resolvedLogLevel) {
    logApiEvent(resolvedLogLevel, logLabel, {
      requestId,
      statusCode,
      code,
      method: req.method || null,
      path: req.url || null,
      message: error?.message || safeMessage,
      stack: error?.stack || null,
      context,
    });
  }

  const responseBody = {
    error: safeMessage,
    requestId,
  };

  if (code) {
    responseBody.code = code;
  }

  return res.status(statusCode).json(responseBody);
};

export const methodNotAllowed = (req, res, allowedMethods) => {
  res.setHeader("Allow", allowedMethods.join(", "));

  return sendErrorResponse(req, res, {
    statusCode: 405,
    userMessage: "Method not allowed.",
    code: "METHOD_NOT_ALLOWED",
    context: { allowedMethods },
  });
};

export const badRequest = (req, res, userMessage, options = {}) =>
  sendErrorResponse(req, res, {
    statusCode: 400,
    userMessage,
    ...options,
  });

export const rateLimitExceeded = (req, res, options = {}) =>
  sendErrorResponse(req, res, {
    statusCode: 429,
    userMessage: "Too many requests. Please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
    logLevel: "warn",
    logLabel: "[API_RATE_LIMIT]",
    ...options,
  });

export const internalServerError = (req, res, userMessage, options = {}) =>
  sendErrorResponse(req, res, {
    statusCode: 500,
    userMessage: userMessage || DEFAULT_MESSAGES[500],
    logLabel: "[API_INTERNAL_ERROR]",
    ...options,
  });
