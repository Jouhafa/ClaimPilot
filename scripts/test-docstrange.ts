#!/usr/bin/env node
/**
 * Test script for DocStrange extraction
 * 
 * Usage:
 *   npx tsx scripts/test-docstrange.ts <pdf_path> [statement_type]
 * 
 * Example:
 *   npx tsx scripts/test-docstrange.ts test-docs/AuthenticatedStatement.pdf debit
 */

import { spawn } from "child_process";
import { join } from "path";
import { existsSync } from "fs";

const pdfPath = process.argv[2];
const statementType = (process.argv[3] || "debit") as "credit" | "debit";

if (!pdfPath) {
  console.error("Usage: npx tsx scripts/test-docstrange.ts <pdf_path> [statement_type]");
  process.exit(1);
}

if (!existsSync(pdfPath)) {
  console.error(`File not found: ${pdfPath}`);
  process.exit(1);
}

console.log(`Testing DocStrange extraction on: ${pdfPath}`);
console.log(`Statement type: ${statementType}`);
console.log("---\n");

// Use ocrenv Python if available, otherwise fallback to system Python
const ocrenvPython = join(process.cwd(), "ocrenv", "bin", "python3");
const pythonPath = process.env.PYTHON_PATH || (existsSync(ocrenvPython) ? ocrenvPython : "python3");
const servicePath = join(process.cwd(), "backend", "docstrange_service.py");
const apiKey = process.env.DOCSTRANGE_API_KEY || "a830e6de-e258-11f0-bf19-a23842209c4a";

// Always pass API key
const args = [servicePath, pdfPath, apiKey];

const pythonProcess = spawn(pythonPath, args, {
  cwd: process.cwd(),
});

let stdout = "";
let stderr = "";

pythonProcess.stdout.on("data", (data) => {
  stdout += data.toString();
});

pythonProcess.stderr.on("data", (data) => {
  stderr += data.toString();
});

pythonProcess.on("close", (code) => {
  if (code !== 0) {
    console.error("DocStrange service failed:");
    console.error(stderr || stdout);
    process.exit(1);
  }
  
  try {
    const result = JSON.parse(stdout);
    
    if (!result.success) {
      console.error("DocStrange extraction failed:");
      console.error(result.error);
      process.exit(1);
    }
    
    console.log("✓ DocStrange extraction successful\n");
    
    // Parse CSV using the parser
    if (result.csv_data) {
      console.log("CSV Data Preview (first 500 chars):");
      console.log("---");
      console.log(result.csv_data.substring(0, 500));
      console.log("---\n");
      
      // Import and use the parser
      import("../src/lib/services/docstrangeParser").then(({ parseDocStrangeCSV }) => {
        const statementTypeEnum = statementType === "credit" ? "enbd_credit" : "enbd_debit";
        const parsed = parseDocStrangeCSV(result.csv_data, statementTypeEnum, pdfPath);
        
        console.log(`Parsed Transactions: ${parsed.transactions.length}`);
        console.log(`Warnings: ${parsed.warnings.length}`);
        
        if (parsed.warnings.length > 0) {
          console.log("\nWarnings:");
          parsed.warnings.forEach(w => console.log(`  - ${w}`));
        }
        
        if (parsed.transactions.length > 0) {
          console.log("\nFirst 5 transactions:");
          console.log("---");
          parsed.transactions.slice(0, 5).forEach((tx, i) => {
            console.log(`${i + 1}. ${tx.date} | ${tx.merchant} | ${tx.amount.toFixed(2)} AED`);
            console.log(`   Description: ${tx.description.substring(0, 60)}...`);
          });
        }
        
        console.log("\n✓ Test completed successfully");
      }).catch(err => {
        console.error("Failed to parse CSV:", err);
        process.exit(1);
      });
    } else {
      console.log("No CSV data returned");
    }
  } catch (err) {
    console.error("Failed to parse DocStrange output:", err);
    console.error("Raw output:", stdout);
    process.exit(1);
  }
});

pythonProcess.on("error", (err) => {
  console.error(`Failed to start DocStrange service: ${err.message}`);
  console.error(`Make sure Python 3 is installed and DocStrange is available`);
  process.exit(1);
});

