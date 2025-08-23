

let serverSession = null;
let ort = null;

// Constants
const TOTAL_CANDIDATES = 1200000;
const MIN_PERCENTILE = 0.001;
const MAX_PERCENTILE = 99.999;

// Helper functions (matching your Python implementation)
function marksToPercentage(marksOutOf300) {
    return Math.max(0.0, Math.min(100.0, (marksOutOf300 / 300.0) * 100.0));
}

function percentileToAIR(percentile, totalCandidates = TOTAL_CANDIDATES) {
    const air = totalCandidates * (1.0 - (percentile / 100.0));
    return Math.max(1, Math.round(air));
}

function airToCategoryRank(category, air) {
    const cat = category.toUpperCase();

    if (cat === "GEN") {
        return Math.max(1, Math.round(air));
    }
    else if (cat === "OBC") {
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
    }
    else if (cat === "SC") {
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
    }
    else {
        throw new Error("Unsupported category. Use GEN, OBC, or SC.");
    }
}

function safeClipPercentile(percentile) {
    return Math.max(MIN_PERCENTILE, Math.min(MAX_PERCENTILE, percentile));
}

async function initServerModel() {
    if (!serverSession) {
        try {
            ort = require('onnxruntime-node');
            const fs = require('fs');
            const path = require('path');

            const modelPath = path.join(process.cwd(), 'public', 'model', 'model.onnx');

            if (!fs.existsSync(modelPath)) {
                throw new Error('Model file not found at: ' + modelPath);
            }

            serverSession = await ort.InferenceSession.create(modelPath);
            console.log('✅ Server model loaded successfully');
        } catch (error) {
            console.error('❌ Server model loading failed:', error);
            throw error;
        }
    }
    return serverSession;
}

async function predictFromMarks(marksOutOf300, category, noiseStd = 0.0) {
    const session = await initServerModel();

    // Validation
    if (typeof marksOutOf300 !== 'number' || marksOutOf300 < 0 || marksOutOf300 > 300) {
        throw new Error('Marks must be a number between 0 and 300');
    }

    const validCategories = ['GEN', 'OBC', 'SC'];
    if (!validCategories.includes(category.toUpperCase())) {
        throw new Error('Category must be one of: GEN, OBC, SC');
    }

    // Convert marks to percentage (model input)
    const scorePercentage = marksToPercentage(marksOutOf300);

    // Predict percentile using the model
    const inputName = session.inputNames[0];
    const inputTensor = new ort.Tensor('float32', [scorePercentage], [1, 1]);

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
        category: category.toUpperCase()
    };
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'POST') {
        try {
            const { marks, category, students } = req.body;

            if (students) {
                // Batch prediction
                if (!Array.isArray(students) || students.length === 0) {
                    return res.status(400).json({
                        error: 'Students must be a non-empty array'
                    });
                }

                if (students.length > 100) {
                    return res.status(400).json({
                        error: 'Maximum 100 students allowed per request'
                    });
                }

                const results = [];

                for (const student of students) {
                    const { name, marks: studentMarks, category: studentCategory } = student;

                    if (typeof studentMarks !== 'number' || studentMarks < 0 || studentMarks > 300) {
                        return res.status(400).json({
                            error: `Invalid marks for student ${name}: ${studentMarks}`
                        });
                    }

                    const validCategories = ['GEN', 'OBC', 'SC'];
                    if (!validCategories.includes(studentCategory.toUpperCase())) {
                        return res.status(400).json({
                            error: `Invalid category for student ${name}: ${studentCategory}`
                        });
                    }

                    const prediction = await predictFromMarks(studentMarks, studentCategory);
                    results.push({
                        name: name || `Student ${results.length + 1}`,
                        ...prediction
                    });
                }

                res.status(200).json({
                    success: true,
                    count: students.length,
                    predictions: results
                });

            } else if (typeof marks === 'number' && category) {
                // Single prediction
                if (marks < 0 || marks > 300) {
                    return res.status(400).json({
                        error: 'Marks must be between 0 and 300'
                    });
                }

                const validCategories = ['GEN', 'OBC', 'SC'];
                if (!validCategories.includes(category.toUpperCase())) {
                    return res.status(400).json({
                        error: 'Category must be one of: GEN, OBC, SC'
                    });
                }

                const prediction = await predictFromMarks(marks, category);

                res.status(200).json({
                    success: true,
                    input: { marks, category },
                    prediction
                });

            } else {
                res.status(400).json({
                    error: 'Either provide "marks" and "category" for single prediction, or "students" array for batch prediction'
                });
            }

        } catch (error) {
            console.error('API Error:', error);
            res.status(500).json({
                error: 'Prediction failed',
                message: error.message
            });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}