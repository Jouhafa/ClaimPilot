import { Router } from "express";
import { verifyLicense } from "../services/license.js";
import { asyncHandler } from "../utils/errorHandler.js";
import type { LicenseVerificationRequest } from "../types.js";

const router = Router();

router.post(
  "/verify-license",
  asyncHandler(async (req, res) => {
    const request: LicenseVerificationRequest = req.body;

    if (!request.licenseKey) {
      return res.status(400).json({
        error: "licenseKey is required",
      });
    }

    const result = await verifyLicense(request);
    res.json(result);
  })
);

export default router;



