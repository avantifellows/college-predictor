// Constants (matching your Python config)
export const TOTAL_CANDIDATES = 1200000;
export const MIN_PERCENTILE = 0.001;
export const MAX_PERCENTILE = 99.999;

// Convert marks out of 300 to percentage
export function marksToPercentage(marksOutOf300) {
  return Math.max(0.0, Math.min(100.0, (marksOutOf300 / 300.0) * 100.0));
}

// Convert percentile to AIR (All India Rank)
export function percentileToAIR(
  percentile,
  totalCandidates = TOTAL_CANDIDATES
) {
  const air = totalCandidates * (1.0 - percentile / 100.0);
  return Math.max(1, Math.round(air));
}

// Convert AIR to Category Rank
export function airToCategoryRank(category, air) {
  const cat = category.toUpperCase();

  if (cat === "GEN") {
    return Math.max(1, Math.round(air));
  } else if (cat === "OBC") {
    let cr;
    if (air >= 1 && air < 10000) {
      cr = 0.232 * air - 131;
    } else if (air >= 10000 && air <= 50000) {
      cr = 0.313 * air - 1180;
    } else if (air >= 50000 && air <= 100000) {
      cr = 0.351 * air - 2833;
    } else {
      cr = 0.389 * air - 7865;
    }
    return Math.max(1, Math.round(cr));
  } else if (cat === "SC") {
    let cr;
    if (air < 10000) {
      cr = 0.0251 * air - 19.5;
    } else if (air <= 30000) {
      cr = 0.0276 * air - 51.9;
    } else if (air <= 50000) {
      cr = 0.0383 * air - 373;
    } else if (air <= 75000) {
      cr = 0.0429 * air - 605;
    } else if (air <= 100000) {
      cr = 0.0515 * air - 1297;
    } else if (air <= 150000) {
      cr = 0.0571 * air - 1854;
    } else if (air <= 300000) {
      cr = 0.0738 * air - 4542;
    } else if (air <= 500000) {
      cr = 0.0892 * air - 9217;
    } else if (air <= 1000000) {
      cr = 0.106 * air - 17937;
    } else {
      cr = 0.118 * air - 30183;
    }
    return Math.max(1, Math.round(cr));
  } else {
    throw new Error("Unsupported category. Use GEN, OBC, or SC.");
  }
}

// Clip percentile to safe range
export function safeClipPercentile(percentile) {
  return Math.max(MIN_PERCENTILE, Math.min(MAX_PERCENTILE, percentile));
}

// Validation functions
export function validateMarks(marks, studentName = "unknown") {
  if (typeof marks !== "number") {
    throw new Error(
      `Marks for student ${studentName} must be a number: ${marks}`
    );
  }

  if (!Number.isInteger(marks)) {
    throw new Error(
      `Marks for student ${studentName} must be a whole number (no decimals): ${marks}`
    );
  }

  if (marks < -75 || marks > 300) {
    throw new Error(
      `Marks for student ${studentName} must be between -75 and 300: ${marks}`
    );
  }
}

export function validateCategory(category, studentName = "unknown") {
  const validCategories = ["GEN", "OBC", "SC"];
  if (!validCategories.includes(category.toUpperCase())) {
    throw new Error(
      `Invalid category for student ${studentName}: ${category}. Must be one of: ${validCategories.join(
        ", "
      )}`
    );
  }
}

// Get performance category based on percentile
export function getPerformanceCategory(percentile) {
  if (percentile >= 99.5) return "Excellent (Top 0.5%)";
  if (percentile >= 99.0) return "Outstanding (Top 1%)";
  if (percentile >= 95.0) return "Very Good (Top 5%)";
  if (percentile >= 85.0) return "Good (Top 15%)";
  if (percentile >= 70.0) return "Above Average (Top 30%)";
  if (percentile >= 50.0) return "Average (Top 50%)";
  return "Below Average";
}

// API call function for single prediction
export async function predictFromMarks(
  marksOutOf300,
  category,
  noiseStd = 0.0
) {
  try {
    // Client-side validation
    validateMarks(marksOutOf300);
    validateCategory(category);

    const response = await fetch("/api/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        marks: marksOutOf300,
        category: category,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Prediction failed");
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Prediction failed");
    }

    return data.prediction;
  } catch (error) {
    console.error("Prediction error:", error);
    throw error;
  }
}

// API call function for batch prediction
export async function predictBatchFromMarks(studentsData) {
  try {
    if (!Array.isArray(studentsData) || studentsData.length === 0) {
      throw new Error("Students data must be a non-empty array");
    }

    // Client-side validation
    studentsData.forEach((student, index) => {
      const { marks, category, name } = student;
      validateMarks(marks, name || `Student ${index + 1}`);
      validateCategory(category, name || `Student ${index + 1}`);
    });

    const response = await fetch("/api/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        students: studentsData,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Batch prediction failed");
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Batch prediction failed");
    }

    return data.predictions;
  } catch (error) {
    console.error("Batch prediction error:", error);
    throw error;
  }
}

// Mock functions for backward compatibility
export async function loadModel() {
  // No longer needed - model loading happens server-side
  console.log("Model loading is handled server-side");
  return true;
}

export function isModelLoaded() {
  // Always return true since server handles model loading
  return true;
}
