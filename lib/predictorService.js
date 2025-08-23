let ort;
let session = null;
let isInitialized = false;

// Constants (matching your Python config)
const TOTAL_CANDIDATES = 1200000;
const MIN_PERCENTILE = 0.001;
const MAX_PERCENTILE = 99.999;

// Initialize ONNX Runtime Web
export async function initONNX() {
  if (typeof window !== "undefined" && !ort) {
    ort = await import("onnxruntime-web");
  }
}

// Load the model
export async function loadModel(modelPath = "/model/model.onnx") {
  try {
    if (session) return session;

    await initONNX();

    console.log("Loading ONNX model...");
    session = await ort.InferenceSession.create(modelPath);
    isInitialized = true;

    console.log("✅ Model loaded successfully");
    console.log("Input name:", session.inputNames[0]);
    console.log("Output name:", session.outputNames[0]);

    return session;
  } catch (error) {
    console.error("❌ Error loading model:", error);
    throw error;
  }
}

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

// Main prediction function: marks (out of 300) + category -> full prediction
export async function predictFromMarks(
  marksOutOf300,
  category,
  noiseStd = 0.0
) {
  try {
    if (!session) {
      await loadModel();
    }

    // Validation
    if (
      typeof marksOutOf300 !== "number" ||
      marksOutOf300 < 0 ||
      marksOutOf300 > 300
    ) {
      throw new Error("Marks must be a number between 0 and 300");
    }

    const validCategories = ["GEN", "OBC", "SC"];
    if (!validCategories.includes(category.toUpperCase())) {
      throw new Error("Category must be one of: GEN, OBC, SC");
    }

    // Convert marks to percentage (model input)
    const scorePercentage = marksToPercentage(marksOutOf300);

    // Predict percentile using the model
    const inputName = session.inputNames[0];
    const inputTensor = new ort.Tensor("float32", [scorePercentage], [1, 1]);

    const feeds = { [inputName]: inputTensor };
    const results = await session.run(feeds);

    const outputName = session.outputNames[0];
    let percentile = results[outputName].data[0];

    // Add optional noise for realistic variation
    if (noiseStd && noiseStd > 0) {
      percentile += (Math.random() - 0.5) * 2 * noiseStd; // Simple noise approximation
    }

    // Clip percentile to safe range
    percentile = safeClipPercentile(percentile);

    // Calculate AIR and category rank
    const air = percentileToAIR(percentile);
    const categoryRank = airToCategoryRank(category, air);

    return {
      marksOutOf300: Math.round(marksOutOf300 * 100) / 100,
      scorePercentage: Math.round(scorePercentage * 100) / 100,
      percentile: Math.round(percentile * 1000) / 1000,
      air: air,
      categoryRank: categoryRank,
      category: category.toUpperCase(),
    };
  } catch (error) {
    console.error("Prediction error:", error);
    throw error;
  }
}

// Batch prediction for multiple students
export async function predictBatchFromMarks(studentsData) {
  try {
    if (!session) {
      await loadModel();
    }

    if (!Array.isArray(studentsData) || studentsData.length === 0) {
      throw new Error("Students data must be a non-empty array");
    }

    const results = [];

    for (const student of studentsData) {
      const { marks, category, name } = student;

      if (typeof marks !== "number" || marks < 0 || marks > 300) {
        throw new Error(
          `Invalid marks for student ${name || "unknown"}: ${marks}`
        );
      }

      const validCategories = ["GEN", "OBC", "SC"];
      if (!validCategories.includes(category.toUpperCase())) {
        throw new Error(
          `Invalid category for student ${name || "unknown"}: ${category}`
        );
      }

      const prediction = await predictFromMarks(marks, category);

      results.push({
        name: name || `Student ${results.length + 1}`,
        ...prediction,
      });
    }

    return results;
  } catch (error) {
    console.error("Batch prediction error:", error);
    throw error;
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

// Check if model is loaded
export function isModelLoaded() {
  return isInitialized && session !== null;
}
