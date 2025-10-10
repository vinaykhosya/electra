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
        power_usage: 0
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

    // 4. Return the new appliance ID and the generated key
    res.status(200).json({
      deviceId: newAppliance.id,
      deviceKey: deviceKey
    });

  } catch (error) {
    console.error('Error registering device:', error.message);
    res.status(500).json({ error: 'Failed to register device.' });
  }
});

export default router;
