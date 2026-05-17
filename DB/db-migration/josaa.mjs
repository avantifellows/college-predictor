import fs from "fs";
import path from "path";
import { pool } from "../connection.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE_PATH = path.join(__dirname, "../../public/data/JEE/EWS (PwD).json")
const raw = fs.readFileSync(FILE_PATH, "utf-8");

const data = JSON.parse(raw);
const LOG_FILE = path.join(__dirname, "../../logs/db-logs/insertion.log")
// fs.appendFileSync(LOG_FILE, "TESTING >>>>")

const logChanges = async (status, message, filePath = null, index = null) => {

    const logEntry = {
        timestamp: new Date().toISOString(),
        status: status,
        message: message,
        record_index: index,
        filePath: String(filePath),
    };

    fs.appendFileSync(
        LOG_FILE,
        JSON.stringify(logEntry) + "\n",
        "utf-8"
    );

    return
}


const normalizeText = (value) => {
    if (!value) return null;

    return value.trim();
};

const toInt = (value) => {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    return parseInt(value);
};

const toFloat = (value) => {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    return parseFloat(value);
};


// FUNCTION TO EITHER GET THE ID IF EXISTS OR CREATE & INSERT THE ROW AND GET THE ID
async function getOrCreate({
    table,
    DBfield,
    value,
    extraFields = {}
}) {

    if (!value) return null;

    // TO AVOID ANY REPETATION OF VALUE
    const existing = await pool.query(
        `
        SELECT id
        FROM ${table}
        WHERE ${DBfield} = $1
        LIMIT 1
        `,
        [value]
    );
    if (existing.rows.length > 0) {
        // IT EXISTS , RETURN THE ID
        return existing.rows[0].id;
    }

    const fields = [
        DBfield,
        ...Object.keys(extraFields)
    ];

    const values = [
        value,
        ...Object.values(extraFields)
    ];

    const placeholders = values.map(
        (_, i) => `$${i + 1}`
    );

    // INSERT THE NEW ROW
    const inserted = await pool.query(
        `
    INSERT INTO ${table}
    (${fields.join(", ")})
    VALUES (${placeholders.join(", ")})
    RETURNING id
    `,
        values
    );

    return inserted.rows[0].id;
}


async function importJosaa() {
    logChanges("SUCCESS", "JoSAA import started")
    let i = -1
    for (const row of data) {
        i++
        try {
            // CHECKING FOR UNIQUE VALUES
            const examId = await getOrCreate({
                table: "exams",
                DBfield: "exam_name",
                value: normalizeText(row["Exam"])
            });

            const quotaId = await getOrCreate({
                table: "quotas",
                DBfield: "quota_name",
                value: normalizeText(row["Quota"])
            });

            const genderId = await getOrCreate({
                table: "genders",
                DBfield: "gender_name",
                value: normalizeText(row["Gender"])
            });

            const category_id = await getOrCreate({
                table: "categories",
                DBfield: "category_name",
                value: path.parse(FILE_PATH).name
            });

            const rankID = await getOrCreate({
                table: "clg_rank",
                DBfield: "af_hierarchy",
                value: row["AF Hierarchy"]
            });

            const collegeId = await getOrCreate({
                table: "colleges",
                DBfield: "college_name",
                value: normalizeText(row["Institute"]),
                extraFields: {
                    aishe_code: normalizeText(row["College ID"]),
                    state: normalizeText(row["State"]),
                    college_type: normalizeText(row["College Type"]),
                    managed_by: normalizeText(row["Management Type"])
                    // af_hierarchy: toFloat(row["AF Hierarchy"])
                }
            });

            const courseId = await getOrCreate({
                table: "courses",
                DBfield: "course_name",
                value: normalizeText(row["Academic Program Name"]),
                extraFields: {
                    program_name: "Engineering"
                }
            });

            // INSERTING TO DEDICATED CUTOFF TABLE
            await pool.query(
                `
        INSERT INTO josaa_cutoffs (
          college_id,
          course_id,
          exam_id,
          quota_id,
          gender_id,
          opening_rank,
          closing_rank,
          seat_type,
          expected_salary,
          salary_tier,
          category_id,
          rank_id
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,$11,$12
        )
        `,
                [
                    collegeId,
                    courseId,
                    examId,
                    quotaId,
                    genderId,

                    toInt(row["Opening Rank"]),
                    toInt(row["Closing Rank"]),

                    normalizeText(row["Seat Type"]),

                    toFloat(row["Expected Salary"]),
                    toInt(row["Salary Tier"]),

                    category_id,
                    rankID
                ]
            );

            console.log(
                `Inserted: ${row["Institute"]}`
            );

        } catch (err) {

            logChanges("ERROR", err, FILE_PATH, i)

            console.log(
                `Failed: ${row["Institute"]}`
            );

            console.error(err);
        }
    }

    logChanges("SUCCESS", "JoSAA import completed")
    console.log("JoSAA import completed");
}

importJosaa();