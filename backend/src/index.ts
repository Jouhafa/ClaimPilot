import express from "express";
import cors from "cors";
import verifyRoutes from "./routes/verify.js";
import aiRoutes from "./routes/ai.js";
import { errorHandler } from "./utils/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api", verifyRoutes);
app.use("/api/ai", aiRoutes);

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 License verification: POST http://localhost:${PORT}/api/verify-license`);
  console.log(`🤖 AI endpoints:`);
  console.log(`   - POST http://localhost:${PORT}/api/ai/parse-pdf`);
  console.log(`   - POST http://localhost:${PORT}/api/ai/suggest-tags`);
  console.log(`   - POST http://localhost:${PORT}/api/ai/monthly-narrative`);
});


