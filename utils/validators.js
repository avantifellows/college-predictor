import examConfigs from "../examConfig";

export const DEFAULT_PRIMARY_INPUT_CONFIG = {
  label: "Enter Rank",
  placeholder: "Enter your rank",
  step: "1",
  min: "0",
  allowDecimal: false,
};

const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/g;
const COLLAPSE_WHITESPACE_REGEX = /\s+/g;
const UNSAFE_TEXT_REGEX = /[<>`]/g;
const ADVANCED_RANK_REGEX = /^\d+[pP]?$/;
const VALID_RANK_MODES = new Set(["estimate", "known"]);
const DEFAULT_TEXT_LIMIT = 120;

const toSafeString = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  if (Array.isArray(value)) {
    return String(value[0] ?? "");
  }

  return String(value);
};

const createValidationResult = (data, errors) => ({
  isValid: Object.keys(errors).length === 0,
  data,
  errors,
});

const getFieldByName = (config, fieldName) =>
  config?.fields?.find((field) => field.name === fieldName);

const normalizeNumericText = (value) =>
  sanitizeTextInput(value, { maxLength: 32 }).replace(/,/g, "");

const normalizeConfiguredFieldValue = (field, value) => {
  const sanitizedValue = sanitizeTextInput(value);

  if (!field?.options) {
    return { value: sanitizedValue };
  }

  const matchedOption = field.options.find((option) => {
    if (typeof option === "string") {
      return option === sanitizedValue;
    }

    return option.label === sanitizedValue || option.value === sanitizedValue;
  });

  if (!matchedOption) {
    return {
      value: sanitizedValue,
      error: `Invalid value for ${field.name}.`,
    };
  }

  return {
    value:
      typeof matchedOption === "string" ? matchedOption : matchedOption.label,
  };
};

export const getPrimaryInputConfig = (exam, configs = examConfigs) =>
  configs[exam]?.primaryInput || DEFAULT_PRIMARY_INPUT_CONFIG;

export const getCleanObject = (data = {}) =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );

export const getCleanQueryEntries = (data = {}) =>
  Object.entries(getCleanObject(data));

export const sanitizeTextInput = (
  value,
  { maxLength = DEFAULT_TEXT_LIMIT, allowNewLines = false } = {}
) => {
  let sanitizedValue = toSafeString(value).replace(CONTROL_CHAR_REGEX, "");

  if (!allowNewLines) {
    sanitizedValue = sanitizedValue.replace(/\r?\n/g, " ");
  }

  sanitizedValue = sanitizedValue
    .replace(UNSAFE_TEXT_REGEX, "")
    .replace(COLLAPSE_WHITESPACE_REGEX, " ")
    .trim();

  if (maxLength > 0 && sanitizedValue.length > maxLength) {
    sanitizedValue = sanitizedValue.slice(0, maxLength).trim();
  }

  return sanitizedValue;
};

export const sanitizeSearchTerm = (value, options = {}) =>
  sanitizeTextInput(value, { maxLength: 120, ...options });

export const normalizePrimaryInputValue = (
  exam,
  value,
  configs = examConfigs
) => {
  const sanitizedValue = normalizeNumericText(value);

  if (sanitizedValue === "") {
    return "";
  }

  const inputConfig = getPrimaryInputConfig(exam, configs);
  if (inputConfig.allowDecimal) {
    return sanitizedValue;
  }

  const numericValue = Number(sanitizedValue);
  if (Number.isNaN(numericValue)) {
    return "";
  }

  return String(Math.floor(numericValue));
};

export const validatePrimaryInputValue = (
  exam,
  value,
  configs = examConfigs
) => {
  if (value === "") {
    return "";
  }

  const inputConfig = getPrimaryInputConfig(exam, configs);
  const numericValue = Number(value);
  const rangeMessage =
    inputConfig.max !== undefined
      ? `Please enter a value between ${inputConfig.min} and ${inputConfig.max}.`
      : `Please enter a value greater than or equal to ${inputConfig.min}.`;

  if (Number.isNaN(numericValue)) {
    return "Please enter a valid value.";
  }

  if (inputConfig.min !== undefined && numericValue < Number(inputConfig.min)) {
    return rangeMessage;
  }

  if (inputConfig.max !== undefined && numericValue > Number(inputConfig.max)) {
    return rangeMessage;
  }

  return "";
};

export const normalizeAdvancedRank = (value) => {
  let normalizedValue = sanitizeTextInput(value, { maxLength: 16 }).replace(
    /\s+/g,
    ""
  );

  if (normalizedValue.endsWith("p")) {
    normalizedValue =
      normalizedValue.slice(0, normalizedValue.length - 1) + "P";
  }

  return normalizedValue;
};

export const validateAdvancedRank = (value) => {
  if (value === "") {
    return "";
  }

  if (!ADVANCED_RANK_REGEX.test(value)) {
    return "Please enter a valid rank (e.g., 104 or 104P)";
  }

  return "";
};

export const validateBoundedNumberInput = ({
  value,
  min,
  max,
  label = "value",
  allowDecimal = true,
}) => {
  if (value === "") {
    return "";
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return `Please enter a valid ${label}.`;
  }

  if (!allowDecimal && !Number.isInteger(numericValue)) {
    return `Please enter a whole number for ${label}.`;
  }

  if (min !== undefined && numericValue < min) {
    if (max !== undefined) {
      return `Please enter ${label} between ${min} and ${max}.`;
    }
    return `Please enter ${label} greater than or equal to ${min}.`;
  }

  if (max !== undefined && numericValue > max) {
    if (min !== undefined) {
      return `Please enter ${label} between ${min} and ${max}.`;
    }
    return `Please enter ${label} less than or equal to ${max}.`;
  }

  return "";
};

export const sanitizePredictorQuery = (query, configs = examConfigs) => {
  const sanitizedQuery = {};
  const exam = sanitizeTextInput(query?.exam, { maxLength: 64 });

  if (exam) {
    sanitizedQuery.exam = exam;
  }

  const config = configs[exam];

  if (config?.code) {
    sanitizedQuery.code = config.code;
  } else if (query?.code) {
    sanitizedQuery.code = sanitizeTextInput(query.code, { maxLength: 64 });
  }

  Object.entries(query || {}).forEach(([key, rawValue]) => {
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      return;
    }

    if (key === "exam" || key === "code") {
      return;
    }

    if (key === "advRank") {
      sanitizedQuery[key] = normalizeAdvancedRank(rawValue);
      return;
    }

    if (key === "rank") {
      sanitizedQuery[key] = normalizePrimaryInputValue(exam, rawValue, configs);
      return;
    }

    if (key === "mainRank") {
      sanitizedQuery[key] = normalizePrimaryInputValue(
        "JoSAA",
        rawValue,
        configs
      );
      return;
    }

    if (["physicsMarks", "chemistryMarks", "mathsMarks"].includes(key)) {
      sanitizedQuery[key] = normalizeNumericText(rawValue);
      return;
    }

    if (key === "rankMode") {
      sanitizedQuery[key] = sanitizeTextInput(rawValue, { maxLength: 16 });
      return;
    }

    if (key === "searchTerm") {
      sanitizedQuery[key] = sanitizeSearchTerm(rawValue);
      return;
    }

    const matchingField = getFieldByName(config, key);
    if (matchingField) {
      sanitizedQuery[key] = normalizeConfiguredFieldValue(
        matchingField,
        rawValue
      ).value;
      return;
    }

    sanitizedQuery[key] = sanitizeTextInput(rawValue);
  });

  if (
    sanitizedQuery.exam === "JoSAA" &&
    sanitizedQuery.rank &&
    !sanitizedQuery.mainRank
  ) {
    sanitizedQuery.mainRank = sanitizedQuery.rank;
  }

  if (sanitizedQuery.exam === "JEE Advanced" && sanitizedQuery.rank) {
    sanitizedQuery.advRank = sanitizedQuery.rank;
  }

  return getCleanObject(sanitizedQuery);
};

export const validateExamResultQuery = (query, configs = examConfigs) => {
  const sanitizedQuery = sanitizePredictorQuery(query, configs);
  const errors = {};
  const exam = sanitizedQuery.exam;

  if (!exam || !configs[exam]) {
    return createValidationResult(sanitizedQuery, {
      exam: "Invalid or missing exam parameter",
    });
  }

  const config = configs[exam];
  const requiredFields = config.fields || [];

  requiredFields.forEach((field) => {
    const fieldValue = sanitizedQuery[field.name];

    if (!fieldValue) {
      errors[field.name] = `Missing required parameter: ${field.name}`;
      return;
    }

    const normalizedField = normalizeConfiguredFieldValue(field, fieldValue);
    if (normalizedField.error) {
      errors[field.name] = normalizedField.error;
      return;
    }

    sanitizedQuery[field.name] = normalizedField.value;
  });

  const primaryRankKey = exam === "JoSAA" ? "mainRank" : "rank";
  const primaryRankValue = sanitizedQuery[primaryRankKey];

  if (!primaryRankValue) {
    errors[primaryRankKey] = `Missing required parameter: ${primaryRankKey}`;
  } else {
    const primaryRankError = validatePrimaryInputValue(
      exam,
      primaryRankValue,
      configs
    );

    if (primaryRankError) {
      errors[primaryRankKey] = primaryRankError;
    } else {
      const normalizedPrimaryRank = normalizePrimaryInputValue(
        exam,
        primaryRankValue,
        configs
      );
      sanitizedQuery[primaryRankKey] = normalizedPrimaryRank;

      if (exam === "JoSAA") {
        sanitizedQuery.rank = normalizedPrimaryRank;
      }
    }
  }

  if (
    sanitizedQuery.rankMode &&
    !VALID_RANK_MODES.has(sanitizedQuery.rankMode)
  ) {
    errors.rankMode = "Invalid rank mode provided.";
  }

  if (exam === "JoSAA") {
    if (sanitizedQuery.qualifiedJeeAdv === "Yes") {
      if (!sanitizedQuery.advRank) {
        errors.advRank = "Please enter your JEE Advanced rank.";
      }
    } else {
      delete sanitizedQuery.advRank;
    }
  }

  if (sanitizedQuery.advRank) {
    const advancedRankError = validateAdvancedRank(sanitizedQuery.advRank);
    if (advancedRankError) {
      errors.advRank = advancedRankError;
    } else {
      sanitizedQuery.advRank = normalizeAdvancedRank(sanitizedQuery.advRank);
    }
  }

  if (
    exam === "JEE Advanced" &&
    sanitizedQuery.rank &&
    !sanitizedQuery.advRank
  ) {
    sanitizedQuery.advRank = sanitizedQuery.rank;
  }

  [
    ["physicsMarks", "physics marks"],
    ["chemistryMarks", "chemistry marks"],
    ["mathsMarks", "mathematics marks"],
  ].forEach(([fieldName, label]) => {
    const fieldValue = sanitizedQuery[fieldName];
    if (!fieldValue) {
      return;
    }

    const fieldError = validateBoundedNumberInput({
      value: fieldValue,
      min: 0,
      max: 100,
      label,
    });

    if (fieldError) {
      errors[fieldName] = fieldError;
    }
  });

  return createValidationResult(getCleanObject(sanitizedQuery), errors);
};
