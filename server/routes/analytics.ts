import type { RequestHandler } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { runQuery } from "../lib/db";

async function authenticate(req: Parameters<RequestHandler>[0]) {
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

export const getUsageAnalytics: RequestHandler = async (req, res) => {
  try {
    const user = await authenticate(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { rows } = await runQuery<{
      day: string;
      total_power: number;
      on_events: number;
      off_events: number;
    }>(
      `SELECT date_trunc('day', ae.recorded_at) AS day,
              SUM(CASE WHEN ae.status = 'on' THEN ae.power_usage ELSE 0 END) AS total_power,
              COUNT(*) FILTER (WHERE ae.status = 'on') AS on_events,
              COUNT(*) FILTER (WHERE ae.status = 'off') AS off_events
         FROM appliance_events ae
         JOIN appliances a ON a.id = ae.appliance_id
         JOIN home_members hm ON hm.home_id = a.home_id
        WHERE hm.user_id = $1
          AND (
            hm.role = 'owner' OR EXISTS (
              SELECT 1 FROM appliance_permissions ap
               WHERE ap.appliance_id = ae.appliance_id
                 AND ap.home_member_id = hm.id
            )
          )
        GROUP BY 1
        ORDER BY day DESC
        LIMIT 30`,
      [user.id],
    );

    return res.json({ data: rows });
  } catch (error) {
    console.error("getUsageAnalytics error", error);
    return res.status(500).json({ message: "Unexpected server error" });
  }
};

export const getRecentNotifications: RequestHandler = async (req, res) => {
  try {
    const user = await authenticate(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { rows } = await runQuery<{
      id: number;
      status: string;
      recorded_at: string;
      power_usage: number;
      appliance_name: string;
      home_name: string;
    }>(
      `SELECT ae.id,
              ae.status,
              ae.recorded_at,
              ae.power_usage,
              a.name AS appliance_name,
              h.name AS home_name
         FROM appliance_events ae
         JOIN appliances a ON a.id = ae.appliance_id
         JOIN homes h ON h.id = a.home_id
         JOIN home_members hm ON hm.home_id = h.id
        WHERE hm.user_id = $1
          AND (
            hm.role = 'owner' OR EXISTS (
              SELECT 1 FROM appliance_permissions ap
               WHERE ap.appliance_id = ae.appliance_id
                 AND ap.home_member_id = hm.id
            )
          )
        ORDER BY ae.recorded_at DESC
        LIMIT 20`,
      [user.id],
    );

    return res.json({ notifications: rows });
  } catch (error) {
    console.error("getRecentNotifications error", error);
    return res.status(500).json({ message: "Unexpected server error" });
  }
};
