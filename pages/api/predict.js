import {
  TOTAL_CANDIDATES,
  MIN_PERCENTILE,
  MAX_PERCENTILE,
  marksToPercentage,
  percentileToAIR,
  airToCategoryRank,
  safeClipPercentile,
  validateMarks,
  validateCategory,
} from "../../lib/predictorService.js";

let serverSession = null;
let ort = null;

async function initServerModel() {
  if (!serverSession) {
    try {
      // Dynamic import to avoid issues during build
      if (typeof window === "undefined") {
        // Server-side: use onnxruntime-node with fallback handling
        try {
          ort = require("onnxruntime-node");
        } catch (requireError) {
          console.error("Failed to require onnxruntime-node:", requireError);
          // Try dynamic import as fallback
          const onnxModule = await import("onnxruntime-node");
          ort = onnxModule.default || onnxModule;
        }
      } else {
        // Client-side: this shouldn't happen in API routes, but just in case
        throw new Error("API routes should only run server-side");
      }

      const fs = require("fs");
      const path = require("path");
      console.log("hello");
      const modelPath = path.join(
        process.cwd(),
        "public",
        "model",
        "model.onnx"
      );

      if (!fs.existsSync(modelPath)) {
        throw new Error("Model file not found at: " + modelPath);
      }

      serverSession = await ort.InferenceSession.create(modelPath);
      console.log("✅ Server model loaded successfully");
    } catch (error) {
      console.error("❌ Server model loading failed:", error);
      throw error;
    }
  }
  return serverSession;
}

async function predictFromMarks(marksOutOf300, category, noiseStd = 0.0) {
  let session;

  try {
    session = await initServerModel();
  } catch (error) {
    console.error("Failed to initialize model:", error);
    throw new Error("Model initialization failed. Please try again later.");
  }

  // Validation
  validateMarks(marksOutOf300);
  validateCategory(category);

  // Convert marks to percentage (model input)
  const scorePercentage = marksToPercentage(marksOutOf300);

  try {
    // Predict percentile using the model
    const inputName = session.inputNames[0];
    const inputTensor = new ort.Tensor("float32", [scorePercentage], [1, 1]);

    const feeds = { [inputName]: inputTensor };
    const results = await session.run(feeds);

    const outputName = session.outputNames[0];
    let percentile = results[outputName].data[0];

    // Add optional noise for realistic variation
    if (noiseStd && noiseStd > 0) {
      percentile += (Math.random() - 0.5) * 2 * noiseStd;
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
    throw new Error(
      "Failed to run prediction. Please check your input and try again."
    );
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method === "POST") {
    try {
      const { marks, category, students } = req.body;

      if (students) {
        // Batch prediction
        if (!Array.isArray(students) || students.length === 0) {
          return res.status(400).json({
            error: "Students must be a non-empty array",
          });
        }

        if (students.length > 100) {
          return res.status(400).json({
            error: "Maximum 100 students allowed per request",
          });
        }

        const results = [];

        for (const student of students) {
          const {
            name,
            marks: studentMarks,
            category: studentCategory,
          } = student;

          try {
            validateMarks(studentMarks, name);
            validateCategory(studentCategory, name);
          } catch (error) {
            return res.status(400).json({ error: error.message });
          }

          const prediction = await predictFromMarks(
            studentMarks,
            studentCategory
          );
          results.push({
            name: name || `Student ${results.length + 1}`,
            ...prediction,
          });
        }

        res.status(200).json({
          success: true,
          count: students.length,
          predictions: results,
        });
      } else if (typeof marks === "number" && category) {
        // Single prediction
        try {
          validateMarks(marks);
          validateCategory(category);
        } catch (error) {
          return res.status(400).json({ error: error.message });
        }

        const prediction = await predictFromMarks(marks, category);

        res.status(200).json({
          success: true,
          input: { marks, category },
          prediction,
        });
      } else {
        res.status(400).json({
          error:
            'Either provide "marks" and "category" for single prediction, or "students" array for batch prediction',
        });
      }
    } catch (error) {
      console.error("API Error:", error);
      res.status(500).json({
        error: "Prediction failed",
        message: error.message,
      });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
