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

const ensureAccessQuery = `
  SELECT EXISTS (
    SELECT 1
    FROM schedules s
    JOIN appliances a ON a.id = s.appliance_id
    JOIN home_members hm ON hm.home_id = a.home_id
    LEFT JOIN appliance_permissions ap ON ap.appliance_id = a.id AND ap.home_member_id = hm.id
    WHERE s.id = $1
      AND hm.user_id = $2
      AND (
        hm.role = 'admin' OR ap.can_schedule = true
      )
  ) AS allowed
`;

router.get('/:applianceId', async (req, res) => {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { applianceId } = req.params;

    const { data: homeMember, error: homeMemberError } = await supabaseAdmin
      .from('home_members')
      .select('id, role, home_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (homeMemberError || !homeMember) {
      return res.status(403).json({ message: 'User is not a member of any home.' });
    }

    let query = supabaseAdmin
      .from('schedules')
      .select('*, appliances(home_id, appliance_permissions(can_view, can_schedule))')
      .eq('appliance_id', applianceId);

    if (homeMember.role !== 'admin') {
      query = query.eq('appliances.home_id', homeMember.home_id)
                   .or(`appliances.appliance_permissions.can_view.eq.true,appliances.appliance_permissions.can_schedule.eq.true`);
    }

    const { data: schedules, error } = await query;

    if (error) throw error;

    const filteredSchedules = schedules?.filter(schedule => {
      const appliance = schedule.appliances as any;
      if (!appliance || !appliance.appliance_permissions || appliance.appliance_permissions.length === 0) {
        return false;
      }
      const permission = appliance.appliance_permissions[0];
      return permission.can_view || permission.can_schedule;
    });

    res.status(200).json(filteredSchedules);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { appliance_id, action, cron_expression, is_active } = req.body;

    const { data: homeMember, error: homeMemberError } = await supabaseAdmin
      .from('home_members')
      .select('id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (homeMemberError || !homeMember) {
      return res.status(403).json({ message: 'User is not a member of any home.' });
    }

    // Check if the user has permission to schedule this appliance
    const { data: permission, error: permissionError } = await supabaseAdmin
      .from('appliance_permissions')
      .select('can_schedule')
      .eq('appliance_id', appliance_id)
      .eq('home_member_id', homeMember.id)
      .limit(1)
      .single();

    if (homeMember.role !== 'admin' && (permissionError || !permission || !permission.can_schedule)) {
      return res.status(403).json({ message: 'You do not have permission to schedule this device.' });
    }

    const result = await runQuery(
      'INSERT INTO schedules (appliance_id, user_id, action, cron_expression, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [appliance_id, user.id, action, cron_expression, is_active]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { is_active } = req.body;

    const { rows: permissionRows } = await runQuery(ensureAccessQuery, [id, user.id]);
    if (!permissionRows[0]?.allowed) {
        return res.status(403).json({ message: "Access denied" });
    }

    const result = await runQuery(
      'UPDATE schedules SET is_active = $1 WHERE id = $2 RETURNING *',
      [is_active, id]
    );

    res.status(200).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;

    const { rows: permissionRows } = await runQuery(ensureAccessQuery, [id, user.id]);
    if (!permissionRows[0]?.allowed) {
        return res.status(403).json({ message: "Access denied" });
    }

    await runQuery('DELETE FROM schedules WHERE id = $1', [id]);

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;