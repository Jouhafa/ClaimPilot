import { NextRequest, NextResponse } from "next/server";
import { parseStatementPageWithAI } from "@/lib/services/aiParser";
import type { StatementType } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { statementType, pageText, pageIndex, currency = "AED" } = await request.json();

    if (!pageText) {
      return NextResponse.json(
        { error: "pageText is required" },
        { status: 400 }
      );
    }

    if (!statementType) {
      return NextResponse.json(
        { error: "statementType is required" },
        { status: 400 }
      );
    }

    if (typeof pageIndex !== "number") {
      return NextResponse.json(
        { error: "pageIndex must be a number" },
        { status: 400 }
      );
    }

    const result = await parseStatementPageWithAI({
      statementType: statementType as StatementType,
      pageText,
      pageIndex,
      currency,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "AI parsing failed",
        success: false,
        transactions: [],
        count: 0
      },
      { status: 500 }
    );
  }
}

