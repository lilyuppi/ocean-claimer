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

export { readExcelFile };
