import type { RequestHandler } from "express";
import { runQuery } from "./db";

// Extend the Express Request type to include our custom property
declare global {
  namespace Express {
    interface Request {
      applianceId?: number;
    }
  }
}

export const authenticateDevice: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: Missing Bearer token" });
  }

  const deviceKey = authHeader.slice("Bearer ".length);
  if (!deviceKey) {
    return res.status(401).json({ message: "Unauthorized: Missing device key" });
  }

  try {
    const { rows } = await runQuery<{ appliance_id: number }>(
      "SELECT appliance_id FROM device_credentials WHERE device_key = $1",
      [deviceKey]
    );

    const credential = rows[0];
    if (!credential) {
      return res.status(403).json({ message: "Forbidden: Invalid device key" });
    }

    // Attach applianceId to the request object for use in the next handler
    req.applianceId = credential.appliance_id;
    
    next();
  } catch (error) {
    console.error("[Device Auth] Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
