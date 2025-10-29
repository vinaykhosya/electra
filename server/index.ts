// ============================================
// CRITICAL FIX: Prevent Supabase pooler crashes
// ============================================
process.on('uncaughtException', (error: any) => {
  const isPoolerError = error?.code === 'XX000' || error?.message?.includes('db_termination') || error?.severity === 'FATAL';
  if (isPoolerError) {
    console.error('\n  SUPABASE POOLER TERMINATED CONNECTION (normal, continuing...)');
    return; // Don't exit
  }
  console.error('\n FATAL ERROR:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('\n  Unhandled rejection:', reason);
  throw reason;
});

console.log(' Error handlers installed\n');
// ============================================
import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { ensureDatabaseSetup } from "./lib/setup";
import {
  getApplianceActivity,
  ingestDeviceData,
  toggleAppliance,
} from "./routes/appliances";
import { getRecentNotifications, getUsageAnalytics } from "./routes/analytics";
import { addClient } from "./lib/streaming";
import { authenticateDevice } from "./lib/deviceAuth";

import deviceRoutes from "./routes/devices.js";
import scheduleRoutes from "./routes/schedules";
import "./lib/cron";
// --- 1. IMPORT THE NEW AI ROUTE ---
import aiRoutes from "./routes/ai.js";
import parentalControlsRoutes from "./routes/parental_controls";
import permissionsRoutes from "./routes/permissions";
import * as cookingRoutes from "./routes/cooking";

// --- ENHANCED DEVICE MANAGEMENT ROUTES ---
import * as devicesEnhanced from "./routes/devices-enhanced";
import * as homeManagement from "./routes/home-management";

// --- EMAIL PROCESSOR ---
import { startEmailProcessor } from "./lib/emailProcessor";

// IMPORTANT: Database setup is DISABLED because it creates bad RLS policies
// All policies are managed via Supabase migrations instead
console.warn("⚠️ Database setup is DISABLED - RLS policies managed via migrations");
// if (process.env.SKIP_DB_SETUP !== "true") {
//   void ensureDatabaseSetup().catch((error) => {
//     console.error("Failed to run database setup", error);
//     process.exitCode = 1;
//   });
// } else {
//   console.warn("Skipping DB setup because SKIP_DB_SETUP=true");
// }

export function createServer() {
  const app = express();

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
  app.use(cors({ origin: frontendUrl }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/api/devices", deviceRoutes);
  app.use("/api/schedules", scheduleRoutes);
  // --- 2. TELL EXPRESS TO USE THE AI ROUTE ---
  app.use("/api/ai", aiRoutes);
  app.use("/api/parental-controls", parentalControlsRoutes);
  app.use("/api/permissions", permissionsRoutes);

  // --- COOKING ASSISTANT ROUTES ---
  app.post("/api/cooking/start", cookingRoutes.startCookingSession);
  app.post("/api/cooking/continue", cookingRoutes.continueCooking);
  app.get("/api/cooking/:sessionId", cookingRoutes.getCookingSession);
  app.delete("/api/cooking/:sessionId", cookingRoutes.endCookingSession);
  app.put("/api/cooking/:sessionId/voice", cookingRoutes.toggleVoiceMode);

  // --- ENHANCED DEVICE MANAGEMENT API (v2) ---
  // Devices
  app.post("/api/v2/devices", devicesEnhanced.createDevice);
  app.get("/api/v2/devices", devicesEnhanced.getAllDevices);
  app.get("/api/v2/devices/:id", devicesEnhanced.getDeviceById);
  app.put("/api/v2/devices/:id", devicesEnhanced.updateDevice);
  app.delete("/api/v2/devices/:id", devicesEnhanced.deleteDevice);
  app.post("/api/v2/devices/toggle", devicesEnhanced.toggleDevice);
  
  // Device History & Stats
  app.get("/api/v2/devices/:id/history", devicesEnhanced.getDeviceHistory);
  app.get("/api/v2/devices/:id/stats", devicesEnhanced.getDeviceUsageStats);
  
  // Schedules
  app.post("/api/v2/schedules", devicesEnhanced.createSchedule);
  app.get("/api/v2/devices/:id/schedules", devicesEnhanced.getDeviceSchedules);
  app.put("/api/v2/schedules/:id", devicesEnhanced.updateSchedule);
  app.delete("/api/v2/schedules/:id", devicesEnhanced.deleteSchedule);
  
  // Events & Active Schedules
  app.get("/api/v2/events", devicesEnhanced.getRecentEvents);
  app.get("/api/v2/schedules/active", devicesEnhanced.getActiveSchedules);

  // --- HOME MANAGEMENT API ---
  // Invitations
    app.get("/api/v2/user/invite-code", homeManagement.getMyInviteCode);
  app.post("/api/v2/homes/invite", homeManagement.sendInvitation);
  app.get("/api/v2/homes/:home_id/invitations", homeManagement.getHomeInvitations);
  app.get("/api/v2/invitations/my", homeManagement.getMyInvitations);
  app.put("/api/v2/invitations/:invitation_id/accept", homeManagement.acceptInvitation);
  app.put("/api/v2/invitations/:invitation_id/reject", homeManagement.rejectInvitation);
  
  // Members
  app.get("/api/v2/homes/:home_id/members", homeManagement.getHomeMembers);
  app.put("/api/v2/members/role", homeManagement.updateMemberRole);
  app.delete("/api/v2/members/:member_id", homeManagement.removeMember);
  
  // Security
  app.post("/api/v2/devices/:device_id/delete-with-pin", homeManagement.deleteDeviceWithPin);
  app.put("/api/v2/homes/security-pin", homeManagement.updateSecurityPin);
  app.get("/api/v2/homes/:home_id/security", homeManagement.getHomeSecurityStatus);

  // --- Real-time and Device Routes ---
  app.get("/api/analytics/stream", addClient);
  app.post("/api/appliances/:id/data", authenticateDevice, ingestDeviceData);

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

  // Start email processor
  startEmailProcessor();

  return app;
}
// ============================================
// SERVER STARTUP (added for direct execution)
// ============================================
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = createServer();
const port = process.env.PORT || 3001;
const host = "0.0.0.0";

const distPath = path.join(__dirname, "../client/dist");
app.use(express.static(distPath));

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(Number(port), host, () => {
  console.log(` Quantum Haven server running on http://${host}:${port}`);
});

process.on("SIGTERM", () => {
  console.log(" Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log(" Received SIGINT, shutting down gracefully");
  process.exit(0);
});
