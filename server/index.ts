import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { ensureDatabaseSetup } from "./lib/setup";
import { getApplianceActivity, toggleAppliance } from "./routes/appliances";
import { getRecentNotifications, getUsageAnalytics } from "./routes/analytics";

import deviceRoutes from "./routes/devices.js";
// --- 1. IMPORT THE NEW AI ROUTE ---
import aiRoutes from "./routes/ai.js";

if (process.env.SKIP_DB_SETUP !== "true") {
  void ensureDatabaseSetup().catch((error) => {
    console.error("Failed to run database setup", error);
    process.exitCode = 1;
  });
} else {
  console.warn("Skipping DB setup because SKIP_DB_SETUP=true");
}

export function createServer() {
  const app = express();

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
app.use(cors({ origin: frontendUrl }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/api/devices", deviceRoutes);
  // --- 2. TELL EXPRESS TO USE THE AI ROUTE ---
  app.use("/api/ai", aiRoutes);

  // --- Existing API Routes ---
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.post("/api/appliances/:id/toggle", toggleAppliance);
  app.get("/api/appliances/:id/activity", getApplianceActivity);
  app.get("/api/analytics/usage", getUsageAnalytics);
  app.get("/api/notifications", getRecentNotifications);

  return app;
}
