import { mhtcetDB } from "./schema.js";

console.log("Task Execution Started")

async function main() {
    await mhtcetDB();  
    console.log("Task Successfully Executed");
}

main();