# Scholarship Configuration Guide

This document provides an overview of the scholarship configuration structure used in our system and instructions on how to modify or extend the scholarship finder functionality.

## Table of Contents
1. [Current Structure](#current-structure)
2. [Configuration Object Properties](#configuration-object-properties)
3. [Modifying the Scholarship Configuration](#modifying-the-scholarship-configuration)
4. [Adding New Fields](#adding-new-fields)
5. [Best Practices](#best-practices)

## Current Structure

The scholarship configuration is stored in the `scholarshipConfig.js` file. It contains a single configuration object `scholarshipConfig` that defines various properties specific to the scholarship finder functionality.

## Configuration Object Properties

The `scholarshipConfig` object has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | String | The name of the configuration (e.g., "Scholarship Finder") |
| `fields` | Array | An array of objects defining form fields for the scholarship finder |

### The `fields` Array

Each object in the `fields` array represents a form field and should have the following properties:

- `name`: The name of the field (used as a key in queries)
- `label`: The display label for the field
- `options`: An array of option objects for the field
- `helperText` (optional): An array of strings providing additional information about the field

Each option object in the `options` array should have:
- `value`: The value to be used in queries
- `label`: The display text for the option

## Modifying the Scholarship Configuration

To modify the existing scholarship configuration:

1. Open the `scholarshipConfig.js` file.
2. Locate the `scholarshipConfig` object.
3. Modify the desired properties or fields as needed.

### Example: Modifying an Existing Field

To modify the options for the "grade" field:

```javascript
{
  name: "grade",
  label: "Enter Grade",
  options: [
    { value: "11", label: "Class 11" },
    { value: "12", label: "Class 12" },
    { value: "12th pass", label: "12th Passed" },
    { value: "UG", label: "Undergraduate" },  // Modified label
    { value: "PG", label: "Postgraduate" },   // Modified label
    { value: "Diploma/ITI", label: "Diploma/ITI" },
    { value: "PhD", label: "Doctorate" },     // New option
  ],
},
```

## Adding New Fields

To add a new field to the scholarship finder:

1. Create a new object in the `fields` array with the required properties.
2. Ensure the new field aligns with the existing data structure and filtering logic.

### Example: Adding a New Field

```javascript
{
  name: "disabilityStatus",
  label: "Disability Status",
  options: [
    { value: "none", label: "No Disability" },
    { value: "physical", label: "Physical Disability" },
    { value: "visual", label: "Visual Impairment" },
    { value: "hearing", label: "Hearing Impairment" },
    { value: "other", label: "Other Disability" },
  ],
  helperText: ["Select if you have any disability that might qualify for specific scholarships"],
},
```

## Best Practices

1. **Consistency**: Maintain consistency in naming conventions and structure across all fields.
2. **Clear Labeling**: Use clear and concise labels for fields and options to ensure user understanding.
3. **Inclusive Options**: Ensure that options are comprehensive and inclusive where possible.
4. **Helper Text**: Use helper text to provide additional context or instructions for complex fields.
5. **Data Alignment**: Ensure that any new fields or modifications align with the backend data structure and filtering logic.
6. **Testing**: After making changes, thoroughly test the scholarship finder to ensure all functionalities work as expected.
7. **Documentation**: Update any related documentation or comments in the code to reflect changes made to the configuration.

Remember to coordinate with the backend team when adding new fields or significantly changing existing ones, as this may require updates to the data processing and filtering logic on the server side.
