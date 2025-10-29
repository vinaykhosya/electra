import express from 'express';
import { runQuery } from '../lib/db';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import type { RequestHandler } from "express";

const router = express.Router();

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

router.post('/grant', async (req, res) => {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { child_id, appliance_id } = req.body;

    if (!child_id || !appliance_id) {
      return res.status(400).json({ message: "child_id and appliance_id are required" });
    }

    // Verify the user is the parent of this child
    const parentCheckResult = await runQuery(
      'SELECT id FROM parental_controls WHERE parent_id = $1 AND child_id = $2 AND status = \'accepted\'',
      [user.id, child_id]
    );

    if (parentCheckResult.rows.length === 0) {
      return res.status(403).json({ message: "You are not authorized to grant permissions for this user" });
    }

    // Get the home_member_id for the child
    const memberResult = await runQuery(
        'SELECT id, home_id FROM home_members WHERE user_id = $1',
        [child_id]
    );

    if (memberResult.rows.length === 0) {
        return res.status(404).json({ message: "Child not found in any home" });
    }
    
    const home_member_id = memberResult.rows[0].id;
    const home_id = memberResult.rows[0].home_id;

    // Verify appliance belongs to the same home
    const applianceCheck = await runQuery(
      'SELECT id FROM appliances WHERE id = $1 AND home_id = $2',
      [appliance_id, home_id]
    );

    if (applianceCheck.rows.length === 0) {
      return res.status(404).json({ message: "Appliance not found in child's home" });
    }

    // Check if permission already exists
    const existingPermission = await runQuery(
      'SELECT id FROM appliance_permissions WHERE home_member_id = $1 AND appliance_id = $2',
      [home_member_id, appliance_id]
    );

    if (existingPermission.rows.length > 0) {
      return res.status(200).json({ message: "Permission already exists", data: existingPermission.rows[0] });
    }

    // Grant permission
    const result = await runQuery(
      'INSERT INTO appliance_permissions (home_member_id, appliance_id) VALUES ($1, $2) RETURNING *',
      [home_member_id, appliance_id]
    );

    res.status(201).json({ message: "Permission granted", data: result.rows[0] });
  } catch (error: any) {
    console.error('Grant permission error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/revoke', async (req, res) => {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { child_id, appliance_id } = req.body;

    if (!child_id || !appliance_id) {
      return res.status(400).json({ message: "child_id and appliance_id are required" });
    }

    // Verify the user is the parent of this child
    const parentCheckResult = await runQuery(
      'SELECT id FROM parental_controls WHERE parent_id = $1 AND child_id = $2 AND status = \'accepted\'',
      [user.id, child_id]
    );

    if (parentCheckResult.rows.length === 0) {
      return res.status(403).json({ message: "You are not authorized to revoke permissions for this user" });
    }

    // Get the home_member_id for the child
    const memberResult = await runQuery(
        'SELECT id FROM home_members WHERE user_id = $1',
        [child_id]
    );

    if (memberResult.rows.length === 0) {
        return res.status(404).json({ message: "Child not found in any home" });
    }
    
    const home_member_id = memberResult.rows[0].id;

    // Revoke permission
    const result = await runQuery(
      'DELETE FROM appliance_permissions WHERE home_member_id = $1 AND appliance_id = $2 RETURNING *',
      [home_member_id, appliance_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Permission not found" });
    }

    res.status(200).json({ message: "Permission revoked", data: result.rows[0] });
  } catch (error: any) {
    console.error('Revoke permission error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/list/:childId', async (req, res) => {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { childId } = req.params;

    // Verify the user is the parent of this child
    const parentCheckResult = await runQuery(
      'SELECT id FROM parental_controls WHERE parent_id = $1 AND child_id = $2 AND status = \'accepted\'',
      [user.id, childId]
    );

    if (parentCheckResult.rows.length === 0) {
      return res.status(403).json({ message: "You are not authorized to view permissions for this user" });
    }

    // Get all permissions for the child
    const result = await runQuery(
      `SELECT ap.*, a.name as appliance_name, a.device_type 
       FROM appliance_permissions ap
       JOIN home_members hm ON ap.home_member_id = hm.id
       JOIN appliances a ON ap.appliance_id = a.id
       WHERE hm.user_id = $1`,
      [childId]
    );

    res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('List permissions error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
