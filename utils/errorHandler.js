import crypto from "crypto";

export const generateRequestId = () => {
  return crypto.randomUUID().slice(0, 8);
};

export const sendError = (res, statusCode, message, requestId) => {
  res.status(statusCode).json({
    error: message,
    requestId,
  });
};

export const withErrorHandler = (handler) => {
  return async (req, res) => {
    const requestId = generateRequestId();
    try {
      return await handler(req, res, requestId);
    } catch (error) {
      console.error(`[${requestId}] Unexpected error:`, error);
      sendError(res, 500, "An unexpected error occurred. Please try again later.", requestId);
    }
  };
};
