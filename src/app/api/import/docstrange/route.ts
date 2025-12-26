import { NextRequest, NextResponse } from "next/server";
import { parseDocStrangeCSV } from "@/lib/services/docstrangeParser";
import type { StatementType } from "@/lib/types";

/**
 * POST /api/import/docstrange
 * 
 * Extracts transactions from PDF using DocStrange cloud extraction.
 * 
 * Input:
 * - PDF file (multipart/form-data)
 * - statementType: "credit" | "debit"
 * 
 * Output:
 * - transactions: Transaction[]
 * - warnings: string[]
 * - debug?: { csvPreview, markdownPreview }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const statementTypeParam = formData.get("statementType") as string;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }
    
    if (!statementTypeParam || (statementTypeParam !== "credit" && statementTypeParam !== "debit")) {
      return NextResponse.json(
        { error: "statementType must be 'credit' or 'debit'" },
        { status: 400 }
      );
    }
    
    const statementType: StatementType = statementTypeParam === "credit" ? "enbd_credit" : "enbd_debit";
    
    // Get API key from environment (defaults to a830e6de-e258-11f0-bf19-a23842209c4a)
    const apiKey = process.env.DOCSTRANGE_API_KEY || "a830e6de-e258-11f0-bf19-a23842209c4a";
    
    // Call DocStrange REST API directly (Nanonets extraction API)
    const apiFormData = new FormData();
    apiFormData.append("file", file);
    apiFormData.append("output_format", "csv"); // Request CSV format
    apiFormData.append("csv_options", "table"); // Extract tables as CSV
    
    const headers = {
      "Authorization": `Bearer ${apiKey}`,
    };
    
    const apiResponse = await fetch("https://extraction-api.nanonets.com/api/v1/extract/sync", {
      method: "POST",
      headers: headers,
      body: apiFormData,
    });
    
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("DocStrange API error:", errorText);
      return NextResponse.json(
        {
          error: `DocStrange API failed: ${apiResponse.status} ${apiResponse.statusText}`,
          transactions: [],
          warnings: [errorText],
        },
        { status: apiResponse.status }
      );
    }
    
    const apiData = await apiResponse.json();
    
    // Extract CSV data from response
    // Response structure: { result: { csv: { content: "..." } } } or similar
    let csvData: string | undefined;
    
    if (apiData.result?.csv?.content) {
      csvData = apiData.result.csv.content;
    } else if (apiData.result?.markdown?.content) {
      // Fallback: if only markdown is available, we'll need to parse it
      // For now, return error asking for CSV
      return NextResponse.json(
        {
          error: "CSV format not available in response",
          transactions: [],
          warnings: ["API returned markdown instead of CSV"],
        },
        { status: 500 }
      );
    } else if (typeof apiData.result === "string") {
      // Sometimes the result is directly a string
      csvData = apiData.result;
    } else {
      // Try to find CSV in various response formats
      csvData = apiData.csv || apiData.csv_data || apiData.result;
    }
    
    if (!csvData || typeof csvData !== "string") {
      console.error("Unexpected API response format:", JSON.stringify(apiData, null, 2));
      return NextResponse.json(
        {
          error: "Unexpected response format from DocStrange API",
          transactions: [],
          warnings: ["Could not extract CSV data from API response"],
        },
        { status: 500 }
      );
    }
    
    // Parse CSV data
    let transactions: any[] = [];
    let warnings: string[] = [];
    let csvPreview: string | undefined;
    
    if (csvData && csvData.trim().length > 0) {
      csvPreview = csvData.substring(0, 500);
      const parsed = parseDocStrangeCSV(csvData, statementType, file.name);
      transactions = parsed.transactions;
      warnings = parsed.warnings;
    } else {
      warnings.push("No CSV data returned from DocStrange API");
    }
    
    // Quality check: if too few transactions, treat as failure
    if (transactions.length < 5) {
      warnings.push(`Only ${transactions.length} transactions extracted (minimum: 5)`);
    }
    
    return NextResponse.json({
      transactions,
      warnings,
      debug: {
        csvPreview,
      },
    });
    
  } catch (error) {
    console.error("DocStrange API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "DocStrange extraction failed",
        transactions: [],
        warnings: [error instanceof Error ? error.message : "Unknown error"],
      },
      { status: 500 }
    );
  }
}

