import type { RequestHandler } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { runQuery } from "../lib/db";
import { broadcast } from "../lib/streaming";

async function authenticateRequest(req: Parameters<RequestHandler>[0]) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return data.user;
}

const ensureAccessQuery = `
  SELECT EXISTS (
    SELECT 1
    FROM appliances a
    JOIN home_members hm ON hm.home_id = a.home_id
    WHERE a.id = $1
      AND hm.user_id = $2
      AND (
        hm.role = 'owner' OR hm.role = 'adult' OR EXISTS (
          SELECT 1 FROM appliance_permissions ap
          WHERE ap.appliance_id = a.id
            AND ap.home_member_id = hm.id
        )
      )
  ) AS allowed
`;

export const toggleAppliance: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const applianceId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(applianceId)) {
      return res.status(400).json({ message: "Invalid appliance id" });
    }

    const [{ rows: permissionRows }, { rows: applianceRows }] = await Promise.all([
      runQuery<{ allowed: boolean }>(ensureAccessQuery, [applianceId, user.id]),
      runQuery<{ id: number; status: string; power_usage: number | null }>(
        "SELECT id, status, power_usage FROM appliances WHERE id = $1",
        [applianceId],
      ),
    ]);

    const permission = permissionRows[0];
    if (!permission?.allowed) {
      return res.status(403).json({ message: "Access denied" });
    }

    const appliance = applianceRows[0];
    if (!appliance) {
      return res.status(404).json({ message: "Appliance not found" });
    }

    const requestedStatus =
      typeof req.body?.status === "string"
        ? req.body.status.toLowerCase()
        : undefined;

    const nextStatus =
      requestedStatus === "on" || requestedStatus === "off"
        ? requestedStatus
        : appliance.status === "on"
          ? "off"
          : "on";

    const incomingPower =
      typeof req.body?.powerUsage === "number"
        ? req.body.powerUsage
        : Number.parseFloat(req.body?.powerUsage ?? "");

    const powerUsage = Number.isFinite(incomingPower)
      ? Math.max(0, Math.round(incomingPower))
      : appliance.power_usage ?? 0;

    const updateResult = await runQuery(
      `UPDATE appliances
         SET status = $1,
             power_usage = $2,
             created_at = created_at,
             updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, status, power_usage, home_id`,
      [nextStatus, powerUsage, applianceId],
    ).catch(async (error: unknown) => {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "42703"
      ) {
        const fallback = await runQuery(
          `UPDATE appliances
             SET status = $1,
                 power_usage = $2
           WHERE id = $3
           RETURNING id, name, status, power_usage, home_id`,
          [nextStatus, powerUsage, applianceId],
        );
        return fallback;
      }
      throw error;
    });

    const updated = updateResult.rows[0];

    await runQuery(
      `INSERT INTO appliance_events (appliance_id, user_id, status, power_usage)
       VALUES ($1, $2, $3, $4)`,
      [applianceId, user.id, nextStatus, powerUsage],
    );

    return res.json({ appliance: updated });
  } catch (error) {
    console.error("toggleAppliance error", error);
    return res.status(500).json({ message: "Unexpected server error" });
  }
};

export const getApplianceActivity: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const applianceId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(applianceId)) {
      return res.status(400).json({ message: "Invalid appliance id" });
    }

    const { rows: events } = await runQuery(
      `SELECT ae.id,
              ae.status,
              ae.power_usage,
              ae.recorded_at,
              a.name
         FROM appliance_events ae
         JOIN appliances a ON a.id = ae.appliance_id
         JOIN home_members hm ON hm.home_id = a.home_id
        WHERE ae.appliance_id = $1
          AND hm.user_id = $2
          AND (
            hm.role = 'owner' OR hm.role = 'adult' OR EXISTS (
              SELECT 1 FROM appliance_permissions ap
               WHERE ap.appliance_id = ae.appliance_id
                 AND ap.home_member_id = hm.id
            )
          )
        ORDER BY ae.recorded_at DESC
        LIMIT 50`,
      [applianceId, user.id],
    );

    return res.json({ events });
  } catch (error) {
    console.error("getApplianceActivity error", error);
    return res.status(500).json({ message: "Unexpected server error" });
  }
};

export const ingestDeviceData: RequestHandler = async (req, res) => {
  try {
    const applianceIdFromToken = req.applianceId;
    const applianceIdFromParams = Number.parseInt(req.params.id, 10);

    if (Number.isNaN(applianceIdFromParams)) {
      return res.status(400).json({ message: "Invalid appliance id" });
    }

    // Ensure a device can only post data for itself
    if (applianceIdFromToken !== applianceIdFromParams) {
      return res.status(403).json({ message: "Forbidden: Device ID mismatch" });
    }

    const incomingPower =
      typeof req.body?.powerUsage === "number"
        ? req.body.powerUsage
        : Number.parseFloat(req.body?.powerUsage ?? "");

    if (!Number.isFinite(incomingPower)) {
      return res.status(400).json({ message: "Invalid or missing powerUsage" });
    }

    const powerUsage = Math.max(0, Math.round(incomingPower));

    // Insert the new event
    const { rows: newEvents } = await runQuery<{
      id: number;
      appliance_id: number;
      status: string;
      power_usage: number;
      recorded_at: string;
      user_id: string | null;
    }>(
      `INSERT INTO appliance_events (appliance_id, status, power_usage)
       VALUES ($1, 'data', $2)
       RETURNING *`,
      [applianceIdFromParams, powerUsage]
    );

    const newEvent = newEvents[0];

    // Broadcast the new event to all connected SSE clients
    broadcast(newEvent);

    return res.status(201).json({ message: "Data ingested", event: newEvent });
  } catch (error) {
    console.error("ingestDeviceData error", error);
    return res.status(500).json({ message: "Unexpected server error" });
  }
};