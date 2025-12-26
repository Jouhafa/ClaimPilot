import { Router } from "express";
import { parsePDFWithAI } from "../services/aiParser.js";
import { suggestTagsWithAI } from "../services/aiTagger.js";
import { generateMonthlyNarrative } from "../services/aiNarrative.js";
import { asyncHandler } from "../utils/errorHandler.js";
import type {
  ParsePDFRequest,
  SuggestTagsRequest,
  MonthlyNarrativeRequest,
} from "../types.js";

const router = Router();

router.post(
  "/parse-pdf",
  asyncHandler(async (req, res) => {
    const request: ParsePDFRequest = req.body;

    if (!request.text) {
      return res.status(400).json({
        error: "text is required",
      });
    }

    const result = await parsePDFWithAI(request);
    res.json(result);
  })
);

router.post(
  "/suggest-tags",
  asyncHandler(async (req, res) => {
    const request: SuggestTagsRequest = req.body;

    if (!request.description || !request.merchant || request.amount === undefined) {
      return res.status(400).json({
        error: "description, merchant, and amount are required",
      });
    }

    const result = await suggestTagsWithAI(request);
    res.json(result);
  })
);

router.post(
  "/monthly-narrative",
  asyncHandler(async (req, res) => {
    const request: MonthlyNarrativeRequest = req.body;

    if (!request.summaryData) {
      return res.status(400).json({
        error: "summaryData is required",
      });
    }

    const result = await generateMonthlyNarrative(request);
    res.json(result);
  })
);

export default router;


