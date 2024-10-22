# Exam Configuration Guide

This document provides an overview of the exam configuration structure used in our application and instructions on how to add support for a new exam.

## Table of Contents
1. [Current Structure](#current-structure)
2. [Adding a New Exam](#adding-a-new-exam)
3. [Configuration Object Properties](#configuration-object-properties)
4. [Example: Adding a New Exam](#example-adding-a-new-exam)

## Current Structure

The exam configurations are stored in the `examConfigs.js` file. Each exam has its own configuration object that defines various properties and methods specific to that exam. The main `examConfigs` object contains all individual exam configurations, allowing easy access to any exam's settings.

Currently supported exams:
- JEE Main-JOSAA
- JEE Main-JAC
- JEE Advanced
- NEET
- MHT CET
- KCET

## Adding a New Exam

To add support for a new exam, follow these steps:

1. Create a new configuration object for your exam.
2. Define all required properties and methods (see [Configuration Object Properties](#configuration-object-properties)).
3. Add the new configuration object to the `examConfigs` object.

## Configuration Object Properties

Each exam configuration object should include the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | String | The full name of the exam |
| `code` | String | A short code for the exam (if applicable) |
| `fields` | Array | An array of objects defining form fields for the exam |
| `legend` | Array | An array of objects defining legend items for result interpretation |
| `getDataPath` | Function | A function that returns the path to the exam's data file |
| `getFilters` | Function | A function that returns an array of filter functions based on user query |

### The `fields` Array

Each object in the `fields` array should have the following properties:

- `name`: The name of the field (used as a key in queries)
- `label`: The display label for the field
- `options`: An array of option objects or strings for the field

### The `legend` Array

Each object in the `legend` array should have the following properties:

- `key`: A short key or abbreviation
- `value`: The full description of the legend item

## Example: Adding a New Exam

Here's an example of how to add support for a new exam called "Sample Exam":

```javascript
export const sampleExamConfig = {
  name: "Sample Exam",
  code: "SAMPLE",
  fields: [
    {
      name: "category",
      label: "Select Category",
      options: [
        { value: "general", label: "General" },
        { value: "obc", label: "OBC" },
        { value: "sc", label: "SC" },
        { value: "st", label: "ST" },
      ],
    },
    {
      name: "examYear",
      label: "Select Exam Year",
      options: ["2023", "2022", "2021"],
    },
  ],
  legend: [
    { key: "AI", value: "All India" },
    { key: "S", value: "State" },
  ],
  getDataPath: (category) => {
    return path.join(
      process.cwd(),
      "public",
      "data",
      "SAMPLE",
      `${category}.json`
    );
  },
  getFilters: (query) => [
    (item) => item.Category === query.category,
    (item) => item.Year === query.examYear,
  ],
};

// Add the new config to the examConfigs object
export const examConfigs = {
  // ... existing configs ...
  "Sample Exam": sampleExamConfig,
};
```

After adding the new configuration, make sure to:

1. Create the necessary data files in the appropriate directory structure.
2. Update any UI components to include the new exam option.
3. Test the new exam configuration thoroughly to ensure it works as expected.

Remember to maintain consistency with existing exam configurations and follow the established patterns when adding new exams or modifying existing ones.
