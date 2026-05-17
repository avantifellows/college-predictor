import { cuttoffs_db } from "./schemas/cuttoffs_tables.js";
import { masterDB } from "./schemas/master_tables.js";

console.log("Task Execution Started")

async function main() {
    await masterDB();
    await cuttoffs_db();
    console.log("Task Successfully Executed");
}

main();