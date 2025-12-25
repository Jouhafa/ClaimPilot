import { NextRequest, NextResponse } from "next/server";
import { parsePDFWithAI } from "@/lib/services/aiParser";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    const result = await parsePDFWithAI({ text });
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

