const getFirstValidationMessage = (errors = {}) => {
  const messages = Object.values(errors);
  return messages[0] || "Invalid request parameters.";
};

export const withValidation =
  ({ validateQuery, validateBody } = {}, handler) =>
  async (req, res) => {
    if (validateQuery) {
      const validationResult = validateQuery(req.query, req);
      if (!validationResult.isValid) {
        return res.status(400).json({
          error: getFirstValidationMessage(validationResult.errors),
          fieldErrors: validationResult.errors,
        });
      }
      req.validatedQuery = validationResult.data;
    }

    if (validateBody) {
      const validationResult = validateBody(req.body, req);
      if (!validationResult.isValid) {
        return res.status(400).json({
          error: getFirstValidationMessage(validationResult.errors),
          fieldErrors: validationResult.errors,
        });
      }
      req.validatedBody = validationResult.data;
    }

    return handler(req, res);
  };
