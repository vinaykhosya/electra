import express from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize the router
const router = express.Router();

// --- Supabase Client Initialization ---
// IMPORTANT: These should be set in a .env file in your /server directory
const supabaseUrl = process.env.VITE_SUPABASE_URL; 
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);


// --- API Endpoint: POST /api/devices/register ---
router.post('/register', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: homeMember, error: homeError } = await supabase
      .from('home_members')
      .select('home_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (homeError || !homeMember || homeMember.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can add devices to a home.' });
    }

    const { deviceName, macAddress } = req.body;
    if (!deviceName || !macAddress) {
      return res.status(400).json({ error: 'Device name and MAC address are required.' });
    }

    // 1. Insert the new appliance into the 'appliances' table
    const { data: newAppliance, error: applianceError } = await supabase
      .from('appliances')
      .insert({
        name: deviceName,
        mac_address: macAddress,
        status: 'offline',
        power_usage: 0,
        home_id: homeMember.home_id,
      })
      .select()
      .single();

    if (applianceError) throw applianceError;

    // 2. Generate a secure, random device key
    const deviceKey = crypto.randomBytes(32).toString('hex');

    // 3. Store the key securely in the 'device_credentials' table
    const { error: credentialError } = await supabase
      .from('device_credentials')
      .insert({
        appliance_id: newAppliance.id,
        device_key: deviceKey
      });

    if (credentialError) throw credentialError;

    // 4. Grant the admin user full permissions to the new appliance
    const { error: permissionError } = await supabase
      .from('appliance_permissions')
      .insert({
        home_member_id: homeMember.id,
        appliance_id: newAppliance.id,
        can_view: true,
        can_control: true,
        can_schedule: true,
      });

    if (permissionError) throw permissionError;

    // 5. Return the new appliance ID and the generated key
    res.status(200).json({
      deviceId: newAppliance.id,
      deviceKey: deviceKey
    });

  } catch (error) {
    console.error('Error registering device:', error.message);
    res.status(500).json({ error: 'Failed to register device.' });
  }
});

router.post('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the home_member_id for the current user
    const { data: homeMember, error: homeMemberError } = await supabase
      .from('home_members')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (homeMemberError || !homeMember) {
      return res.status(403).json({ error: 'User is not a member of any home.' });
    }

    // Check if the user has permission to control this appliance
    const { data: permission, error: permissionError } = await supabase
      .from('appliance_permissions')
      .select('can_control')
      .eq('appliance_id', id)
      .eq('home_member_id', homeMember.id)
      .limit(1)
      .single();

    if (permissionError || !permission || !permission.can_control) {
      return res.status(403).json({ error: 'You do not have permission to control this device.' });
    }

    const { data: appliance, error: fetchError } = await supabase
      .from('appliances')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    let updatedAppliance;

    if (status === 'on') {
      const { data, error } = await supabase
        .from('appliances')
        .update({ status: 'on', last_turned_on: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      updatedAppliance = data;
    } else if (status === 'off') {
      const turnedOnAt = new Date(appliance.last_turned_on).getTime();
      const usageMs = new Date().getTime() - turnedOnAt;
      const totalUsageMs = (appliance.total_usage_ms || 0) + usageMs;

      const { data, error } = await supabase
        .from('appliances')
        .update({ status: 'off', total_usage_ms: totalUsageMs })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      updatedAppliance = data;
    } else {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    res.status(200).json({ appliance: updatedAppliance });

  } catch (error) {
    console.error('Error toggling device:', error.message);
    res.status(500).json({ error: 'Failed to toggle device.' });
  }
});


router.get('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: homeMember, error: homeError } = await supabase
      .from('home_members')
      .select('home_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (homeError || !homeMember) {
      return res.status(200).json([]); 
    }

    const { data: appliances, error: appliancesError } = await supabase
      .from('appliances')
      .select('id, name, status, appliance_permissions(can_view)')
      .eq('home_id', homeMember.home_id)
      .eq('appliance_permissions.home_member_id', homeMember.id);

    if (appliancesError) throw appliancesError;

    const permittedAppliances = appliances.filter(appliance => appliance.appliance_permissions[0]?.can_view);

    res.status(200).json(permittedAppliances);

  } catch (error) {
    console.error('Error fetching devices:', error.message);
    res.status(500).json({ error: 'Failed to fetch devices.' });
  }
});

export default router;

