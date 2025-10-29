import { Router } from 'express';
import { runQuery } from '../lib/db';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import type { RequestHandler } from "express";

const router = Router();

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

// Invite a user to be a child
router.post('/invite', async (req, res) => {
  const user = await authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const { child_email } = req.body;
  const parent_id = user.id;

  try {
    // Find the child user by email using Supabase Admin
    const { data: childUser, error: childError } = await supabaseAdmin.auth.admin.listUsers();
    const child = childUser?.users?.find((u) => u.email === child_email);
    
    if (!child) {
      return res.status(404).json({ message: 'User not found' });
    }
    const child_id = child.id;

    // Check if invitation already exists
    const { rows: existingRows } = await runQuery(
      'SELECT id FROM public.parental_controls WHERE parent_id = $1 AND child_id = $2',
      [parent_id, child_id]
    );

    if (existingRows.length > 0) {
      return res.status(400).json({ message: 'Invitation already exists' });
    }

    // Create a pending invitation
    await runQuery(
      'INSERT INTO public.parental_controls (parent_id, child_id, status) VALUES ($1, $2, $3)',
      [parent_id, child_id, 'pending']
    );

    res.status(201).json({ message: 'Invitation sent' });
  } catch (error) {
    console.error('Parental invite error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Internal server error', error: errorMessage });
  }
});

// Accept an invitation
router.post('/accept', async (req, res) => {
  const user = await authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const { parent_id } = req.body;
  const child_id = user.id;

  try {
    // Update the invitation to accepted
    const { rowCount } = await runQuery('UPDATE public.parental_controls SET status = \'accepted\' WHERE parent_id = $1 AND child_id = $2 AND status = \'pending\'', [parent_id, child_id]);

    if (rowCount === 0) {
      return res.status(404).json({ message: 'Invitation not found or already accepted' });
    }

    res.status(200).json({ message: 'Invitation accepted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Decline an invitation
router.post('/decline', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { parent_id } = req.body;
    const child_id = user.id;

    try {
        await runQuery('DELETE FROM public.parental_controls WHERE parent_id = $1 AND child_id = $2 AND status = \'pending\'', [parent_id, child_id]);
        res.status(200).json({ message: 'Invitation declined' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get pending invitations
router.get('/invitations', async (req, res) => {
  const user = await authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const child_id = user.id;

  try {
    const { rows } = await runQuery(
      'SELECT pc.parent_id, pc.status, pc.created_at FROM public.parental_controls pc WHERE pc.child_id = $1 AND pc.status = \'pending\'',
      [child_id]
    );
    
    // Get parent details from Supabase Auth
    const invitations = await Promise.all(
      rows.map(async (row) => {
        const { data: parentData } = await supabaseAdmin.auth.admin.getUserById(row.parent_id);
        return {
          parent_id: row.parent_id,
          parent_email: parentData?.user?.email || 'Unknown',
          parent_name: parentData?.user?.user_metadata?.full_name || parentData?.user?.email || 'Unknown',
          status: row.status,
          created_at: row.created_at
        };
      })
    );
    
    res.json(invitations);
  } catch (error) {
    console.error('Get invitations error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Internal server error', error: errorMessage });
  }
});

// Get children
router.get('/children', async (req, res) => {
  const user = await authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const parent_id = user.id;

  try {
    const { rows } = await runQuery(
      'SELECT pc.child_id, pc.status, pc.created_at FROM public.parental_controls pc WHERE pc.parent_id = $1 AND pc.status = \'accepted\'',
      [parent_id]
    );
    
    // Get child details from Supabase Auth
    const children = await Promise.all(
      rows.map(async (row) => {
        const { data: childData } = await supabaseAdmin.auth.admin.getUserById(row.child_id);
        return {
          id: row.child_id,
          email: childData?.user?.email || 'Unknown',
          full_name: childData?.user?.user_metadata?.full_name || childData?.user?.email || 'Unknown',
          status: row.status,
          created_at: row.created_at
        };
      })
    );
    
    res.json(children);
  } catch (error) {
    console.error('Get children error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Internal server error', error: errorMessage });
  }
});

// Remove a child
router.delete('/children/:childId', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { childId } = req.params;
    const parent_id = user.id;

    try {
        await runQuery('DELETE FROM public.parental_controls WHERE parent_id = $1 AND child_id = $2', [parent_id, childId]);
        res.status(200).json({ message: 'Child removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;