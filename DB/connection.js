import {Pool} from "pg"
import { DB_URL } from "../utils/env_values.js";

// Connecting with hosted NeonDB Database
export const pool = new Pool({
    connectionString:DB_URL,
    ssl: false
})
