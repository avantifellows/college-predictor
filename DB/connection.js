import { Pool } from "pg"
import { DB_URL } from "../utils/env_values.js";

if (!DB_URL) {
    throw new Error("Database URL is not defined. Check NEON_DB_URL in .env.local and env_values.js path resolution.");
}

console.log("DB_URL loaded:", DB_URL);

const sslConfig = DB_URL.includes("sslmode=require") || DB_URL.includes("sslmode=verify-full") || DB_URL.includes("sslmode=prefer")
    ? { rejectUnauthorized: false }
    : false;

export const pool = new Pool({
    connectionString: DB_URL,
    ssl: sslConfig,
});