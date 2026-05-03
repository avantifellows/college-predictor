import dotenv from "dotenv"
import path from "path";

dotenv.config({path:path.resolve("../.env.local")});

export const DB_URL = process.env.NEON_DB_URL
// console.log(DB_URL)