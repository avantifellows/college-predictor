const DEFAULT_RETRYABLE_STATUSES = [408, 425, 500, 502, 503, 504];
const DEFAULT_RETRYABLE_METHODS = ["GET", "HEAD", "OPTIONS"];

export const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  initialDelayMs: 400,
  maxDelayMs: 3000,
  backoffMultiplier: 2,
  jitterRatio: 0.15,
  retryableStatuses: DEFAULT_RETRYABLE_STATUSES,
  retryableMethods: DEFAULT_RETRYABLE_METHODS,
  safeToRetry: false,
};

const wait = (delayMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

const getRequestUrl = (input) => {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input?.url || "";
};

const normalizeMethod = (init) => (init?.method || "GET").toUpperCase();

const getRetryAfterDelayMs = (response) => {
  const retryAfterHeader = response.headers.get("retry-after");
  if (!retryAfterHeader) {
    return null;
  }

  const retryAfterSeconds = Number(retryAfterHeader);
  if (!Number.isNaN(retryAfterSeconds)) {
    return retryAfterSeconds * 1000;
  }

  const retryAfterDate = new Date(retryAfterHeader);
  const retryAfterTimestamp = retryAfterDate.getTime();
  if (Number.isNaN(retryAfterTimestamp)) {
    return null;
  }

  return Math.max(0, retryAfterTimestamp - Date.now());
};

const normalizeRetryOptions = (retryOptions = {}) => ({
  ...DEFAULT_RETRY_OPTIONS,
  ...retryOptions,
  retryableStatuses:
    retryOptions.retryableStatuses || DEFAULT_RETRY_OPTIONS.retryableStatuses,
  retryableMethods:
    retryOptions.retryableMethods || DEFAULT_RETRY_OPTIONS.retryableMethods,
});

const isMethodRetryable = (method, retryOptions) =>
  retryOptions.safeToRetry || retryOptions.retryableMethods.includes(method);

const calculateRetryDelay = ({
  attempt,
  retryOptions,
  retryAfterDelayMs = null,
}) => {
  if (retryAfterDelayMs !== null) {
    return Math.min(retryOptions.maxDelayMs, retryAfterDelayMs);
  }

  const exponentialDelay =
    retryOptions.initialDelayMs *
    Math.pow(retryOptions.backoffMultiplier, attempt);
  const jitter = exponentialDelay * retryOptions.jitterRatio * Math.random();

  return Math.min(
    retryOptions.maxDelayMs,
    Math.round(exponentialDelay + jitter)
  );
};

const shouldRetryResponse = ({ response, attempt, method, retryOptions }) =>
  attempt < retryOptions.maxRetries &&
  isMethodRetryable(method, retryOptions) &&
  retryOptions.retryableStatuses.includes(response.status);

const shouldRetryError = ({ attempt, method, retryOptions }) =>
  attempt < retryOptions.maxRetries && isMethodRetryable(method, retryOptions);

export class ApiClientError extends Error {
  constructor(message, { status, data, response, cause, url } = {}) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.data = data;
    this.response = response;
    this.cause = cause;
    this.url = url;
  }
}

export const formatRetryDelay = (delayMs) => {
  if (delayMs >= 1000) {
    const seconds = delayMs / 1000;
    return `${seconds % 1 === 0 ? seconds.toFixed(0) : seconds.toFixed(1)}s`;
  }

  return `${delayMs}ms`;
};

export const createRetryMessage = ({
  attempt,
  maxRetries,
  delayMs,
  resourceLabel = "Request",
}) =>
  `${resourceLabel} failed temporarily. Retrying ${attempt} of ${maxRetries} in ${formatRetryDelay(delayMs)}...`;

export const fetchWithRetry = async (input, init = {}, retryOptions = {}) => {
  const normalizedRetryOptions = normalizeRetryOptions(retryOptions);
  const method = normalizeMethod(init);
  const url = getRequestUrl(input);

  for (
    let attempt = 0;
    attempt <= normalizedRetryOptions.maxRetries;
    attempt += 1
  ) {
    try {
      const response = await fetch(input, init);

      if (
        !response.ok &&
        shouldRetryResponse({
          response,
          attempt,
          method,
          retryOptions: normalizedRetryOptions,
        })
      ) {
        const delayMs = calculateRetryDelay({
          attempt,
          retryOptions: normalizedRetryOptions,
          retryAfterDelayMs: getRetryAfterDelayMs(response),
        });

        normalizedRetryOptions.onRetry?.({
          attempt: attempt + 1,
          maxRetries: normalizedRetryOptions.maxRetries,
          delayMs,
          method,
          response,
          url,
        });

        await wait(delayMs);
        continue;
      }

      return response;
    } catch (error) {
      if (
        !shouldRetryError({
          attempt,
          method,
          retryOptions: normalizedRetryOptions,
        })
      ) {
        throw error;
      }

      const delayMs = calculateRetryDelay({
        attempt,
        retryOptions: normalizedRetryOptions,
      });

      normalizedRetryOptions.onRetry?.({
        attempt: attempt + 1,
        maxRetries: normalizedRetryOptions.maxRetries,
        delayMs,
        method,
        error,
        url,
      });

      await wait(delayMs);
    }
  }

  throw new ApiClientError("Request failed after retrying.", { url });
};

export const parseResponseData = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text || null;
  } catch (error) {
    return null;
  }
};

const getResponseErrorMessage = (response, data) => {
  if (data && typeof data === "object") {
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }

    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  }

  if (response.statusText) {
    return response.statusText;
  }

  return `Request failed with status ${response.status}`;
};

export const fetchJsonWithRetry = async (
  input,
  init = {},
  retryOptions = {}
) => {
  const response = await fetchWithRetry(input, init, retryOptions);
  const data = await parseResponseData(response);

  if (!response.ok) {
    throw new ApiClientError(getResponseErrorMessage(response, data), {
      status: response.status,
      data,
      response,
      url: getRequestUrl(input),
    });
  }

  return { data, response };
};
