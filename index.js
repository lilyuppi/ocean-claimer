import { OceanClaimer } from "./OceanClaimer.js";
import XLSX from "xlsx";
import fs from "fs";

function readExcelFile(filePath) {
  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    return;
  }
  // Read the workbook
  const workbook = XLSX.readFile(filePath);
  // Get the first sheet name
  const sheetName = workbook.SheetNames[0];
  // Get the first sheet
  const worksheet = workbook.Sheets[sheetName];
  // Convert sheet to JSON
  const data = XLSX.utils.sheet_to_json(worksheet);
  return data;
}

const filePath = "/Users/lilyuppi/Documents/WaveWallet.xlsx";
const data = readExcelFile(filePath);

for (const row of data) {
  const seedPhrase = row["Seedphrase"];
  console.log("Seedphrase:", seedPhrase);
  const oceanClaimer = new OceanClaimer(seedPhrase);
  await oceanClaimer.syncInfo();
  oceanClaimer.autoClaim();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
while (true) {
  await sleep(1000 * 60);
}
// // // Replace this with your seed phrase
// const seedPhrase =
//   "very lunch rail layer huge luxury link fork steak census rocket vendor";

// const oceanClaimer = new OceanClaimer(seedPhrase);
// await oceanClaimer.syncInfo();
// await oceanClaimer.autoClaim();
