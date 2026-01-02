import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

/**
 * AI Deep Dive API endpoint using Groq
 * Returns structured JSON insights (not prose)
 */
export async function POST(request: NextRequest) {
  try {
    const { layer, monthKey, topicKey, payload, modelTier = "default" } = await request.json();

    if (!layer || !monthKey || !topicKey || !payload) {
      return NextResponse.json(
        { error: "Missing required fields: layer, monthKey, topicKey, payload" },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Groq API key not configured" },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Model selection: default is llama-3.1-8b-instant, optional fallback is llama-3.3-70b-versatile
    const model = modelTier === "premium" ? "llama-3.3-70b-versatile" : "llama-3.1-8b-instant";

    // Unified schema for all layers
    const schema = `{
  "headline": "string (max 90 chars)",
  "takeaway": "string (max 140 chars)",
  "why_it_matters": "string (max 140 chars)",
  "bullets": ["string (max 90 chars)", "string (max 90 chars)", "string (max 90 chars)"],
  "suggested_action": { "label": "string (max 60 chars)", "deepLink": "string" } | null,
  "confidence": "low" | "med" | "high"
}`;

    // Build user message based on layer
    let userMessage = "";
    
    if (layer === "home") {
      // Insights Home card deep dive
      userMessage = `You are analyzing spending insights for ClaimPilot, a personal finance app.

Context: ${payload.title || topicKey}
Data: ${JSON.stringify(payload, null, 2)}

AI Deep Dive is optional and must use calm, anti-anxiety language. Use phrases like "worth a look", "notable", "opportunity" - avoid alarming words.

Return ONLY valid JSON matching this schema (no markdown, no code blocks):
${schema}

Rules:
- headline: <= 90 chars, concise insight about this spending category/metric
- takeaway: <= 140 chars, key message
- why_it_matters: <= 140 chars, context explaining importance
- bullets: max 3, each <= 90 chars, supporting points
- suggested_action: optional, label <= 60 chars, deepLink should be a valid route
- confidence: "low" if uncertain, "med" if reasonable, "high" if clear

Example:
{
  "headline": "Your spending in this category increased 15%",
  "takeaway": "Worth reviewing - this is your largest expense category this month",
  "why_it_matters": "Understanding this helps identify potential savings opportunities",
  "bullets": ["Top 3 merchants account for 60% of category spend", "Average transaction size increased", "Spending peaked mid-month"],
  "suggested_action": { "label": "Review transactions", "deepLink": "/review?category=this" },
  "confidence": "med"
}`;
    } else if (layer === "story") {
      // Story View slide deep dive
      userMessage = `You are analyzing a spending story slide for ClaimPilot, a personal finance app.

Context: ${payload.title || topicKey}
Slide Data: ${JSON.stringify(payload, null, 2)}

AI Deep Dive is optional and must use calm, anti-anxiety language. Use phrases like "worth a look", "notable", "opportunity" - avoid alarming words.

Return ONLY valid JSON matching this schema (no markdown, no code blocks):
${schema}

Rules:
- headline: <= 90 chars, what this chart/slide shows
- takeaway: <= 140 chars, key insight from the data
- why_it_matters: <= 140 chars, context explaining why this matters
- bullets: max 3, each <= 90 chars, supporting details
- suggested_action: optional, label <= 60 chars, deepLink should be a valid route
- confidence: "low"|"med"|"high"

Example:
{
  "headline": "Monthly spending pattern shows consistent trends",
  "takeaway": "Your spending is well-distributed across categories",
  "why_it_matters": "Balanced spending indicates good financial control",
  "bullets": ["Top category is 25% of total", "Five categories each over 10%", "No single category dominates"],
  "suggested_action": { "label": "Explore trends", "deepLink": "/insights?view=trends" },
  "confidence": "high"
}`;
    } else if (layer === "analyst") {
      // Analyst Mode hints - map to unified schema
      userMessage = `You are analyzing spending data for ClaimPilot analyst mode, a personal finance app.

Context: ${topicKey}
Data: ${JSON.stringify(payload, null, 2)}

AI Deep Dive is optional and must use calm, anti-anxiety language. Use phrases like "worth a look", "notable", "opportunity" - avoid alarming words.

Return ONLY valid JSON matching this schema (no markdown, no code blocks):
${schema}

Rules:
- headline: <= 90 chars, high-level insight about the data
- takeaway: <= 140 chars, key finding
- why_it_matters: <= 140 chars, context for analysts
- bullets: max 3, each <= 90 chars, notable patterns/anomalies/drivers
- suggested_action: optional, label <= 60 chars, deepLink should be a valid route
- confidence: "low"|"med"|"high"

Example:
{
  "headline": "Spending patterns show seasonal variations",
  "takeaway": "Notable increase in certain categories this period",
  "why_it_matters": "Understanding patterns helps with future planning",
  "bullets": ["Category X increased 20% vs last month", "Top merchant accounts for 40% of category", "Transactions concentrated in first week"],
  "suggested_action": { "label": "Filter by date range", "deepLink": "/insights?analyst=true" },
  "confidence": "med"
}`;
    } else {
      return NextResponse.json(
        { error: `Invalid layer: ${layer}` },
        { status: 400 }
      );
    }

    const systemMessage = "Return ONLY valid JSON matching the schema. No extra keys. No markdown. No explanations.";

    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: 500,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices?.[0]?.message?.content ?? "";

    if (!responseText) {
      return NextResponse.json(
        { error: "Empty response from AI" },
        { status: 500 }
      );
    }

    // Parse JSON response
    let result;
    try {
      // Clean response text (remove markdown code blocks if present)
      let cleanedText = responseText
        .replace(/```json\n?/gi, "")
        .replace(/```\n?/g, "")
        .trim();

      // Try to extract JSON object
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }

      result = JSON.parse(cleanedText);

      // Validate required fields
      if (!result.headline || !result.takeaway || !result.why_it_matters || !result.confidence) {
        throw new Error("Missing required fields in response");
      }

      // Validate array fields
      if (!Array.isArray(result.bullets)) {
        result.bullets = [];
      }
      // Limit bullets to max 3
      result.bullets = result.bullets.slice(0, 3);

      // Validate confidence
      if (!["low", "med", "high"].includes(result.confidence)) {
        result.confidence = "med";
      }

      // Validate suggested_action structure
      if (result.suggested_action && (!result.suggested_action.label || !result.suggested_action.deepLink)) {
        result.suggested_action = null;
      }

      return NextResponse.json(result);
    } catch (parseError) {
      console.error("AI response parsing error:", parseError);
      console.error("Raw response text:", responseText);
      return NextResponse.json(
        { error: "Failed to parse AI response", details: parseError instanceof Error ? parseError.message : "Unknown error" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("AI deep dive error:", error);
    
    // Handle rate limit errors specifically
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('rate limit')) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded", 
          details: error instanceof Error ? error.message : "API rate limit exceeded. Please try again later.",
          retryAfter: 60 // seconds
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: "AI deep dive generation failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
