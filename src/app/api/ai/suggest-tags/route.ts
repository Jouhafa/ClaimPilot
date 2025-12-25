import { NextRequest, NextResponse } from "next/server";
import { suggestTagsWithAI } from "@/lib/services/aiTagger";

export async function POST(request: NextRequest) {
  try {
    const { description, merchant, amount } = await request.json();

    if (!description || !merchant || amount === undefined) {
      return NextResponse.json(
        { error: "description, merchant, and amount are required" },
        { status: 400 }
      );
    }

    const result = await suggestTagsWithAI({ description, merchant, amount });
    return NextResponse.json(result);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "AI tag suggestion failed"
      },
      { status: 500 }
    );
  }
}

