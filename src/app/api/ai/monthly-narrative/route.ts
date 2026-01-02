import { NextRequest, NextResponse } from "next/server";
import { generateMonthlyNarrative } from "@/lib/services/aiNarrative";

export async function POST(request: NextRequest) {
  try {
    const { summaryData } = await request.json();

    if (!summaryData) {
      return NextResponse.json(
        { error: "summaryData is required" },
        { status: 400 }
      );
    }

    const result = await generateMonthlyNarrative({ summaryData });
    return NextResponse.json(result);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "AI narrative generation failed"
      },
      { status: 500 }
    );
  }
}



