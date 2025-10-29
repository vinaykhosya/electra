import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper: Authenticate user from request
async function authenticateUser(authHeader: string | undefined) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// =====================================================
// CREATE DEVICE - Using database function for validation
// =====================================================
export const createDevice: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    
    const { name, home_id, device_type = 'generic', metadata = {} } = req.body;
    
    if (!name || !home_id) {
      return res.status(400).json({ 
        error: 'Device name and home_id are required' 
      });
    }

    // Call database function that validates permissions and creates device
    const { data, error } = await supabase.rpc('create_device', {
      p_name: name,
      p_home_id: home_id,
      p_device_type: device_type,
      p_metadata: metadata
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      device: data[0] 
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// TOGGLE DEVICE - Using database function with automatic event logging
// =====================================================
export const toggleDevice: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    
    const { appliance_id, status } = req.body;
    
    if (!appliance_id || !status) {
      return res.status(400).json({ 
        error: 'appliance_id and status are required' 
      });
    }

    if (!['on', 'off'].includes(status)) {
      return res.status(400).json({ 
        error: 'Status must be "on" or "off"' 
      });
    }

    // Call database function that validates permissions, updates device, and logs event
    const { data, error } = await supabase.rpc('toggle_device', {
      p_appliance_id: appliance_id,
      p_new_status: status
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      result: data[0] 
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// GET ALL DEVICES - Using enhanced view with stats
// =====================================================
export const getAllDevices: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    
    const { home_id } = req.query;

    // Use the device_stats view for rich information
    let query = supabase
      .from('device_stats')
      .select('*');
    
    if (home_id) {
      query = query.eq('home_id', home_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      devices: data 
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// GET DEVICE BY ID - With full stats
// =====================================================
export const getDeviceById: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    
    const { id } = req.params;

    const { data, error } = await supabase
      .from('device_stats')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({ 
      success: true, 
      device: data 
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// GET DEVICE HISTORY - Event log
// =====================================================
export const getDeviceHistory: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const { data, error } = await supabase.rpc('get_device_history', {
      p_appliance_id: parseInt(id),
      p_limit: limit
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      history: data 
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// GET DEVICE USAGE STATS
// =====================================================
export const getDeviceUsageStats: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    
    const { id } = req.params;
    const days = parseInt(req.query.days as string) || 7;

    const { data, error } = await supabase.rpc('get_device_usage_stats', {
      p_appliance_id: parseInt(id),
      p_days: days
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      stats: data[0] 
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// UPDATE DEVICE - Name, type, metadata
// =====================================================
export const updateDevice: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    
    const { id } = req.params;
    const { name, device_type, metadata } = req.body;

    const updates: any = {};
    if (name) updates.name = name;
    if (device_type) updates.device_type = device_type;
    if (metadata) updates.metadata = metadata;

    const { data, error } = await supabase
      .from('appliances')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      device: data 
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// DELETE DEVICE
// =====================================================
export const deleteDevice: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    
    const { id } = req.params;

    const { error } = await supabase
      .from('appliances')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      message: 'Device deleted successfully' 
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// CREATE SCHEDULE - Using database function
// =====================================================
export const createSchedule: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    
    const { appliance_id, action, cron_expression, timezone = 'UTC' } = req.body;
    
    if (!appliance_id || !action || !cron_expression) {
      return res.status(400).json({ 
        error: 'appliance_id, action, and cron_expression are required' 
      });
    }

    const { data, error } = await supabase.rpc('create_schedule', {
      p_appliance_id: appliance_id,
      p_action: action,
      p_cron_expression: cron_expression,
      p_timezone: timezone
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      schedule: data[0] 
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// GET ALL SCHEDULES FOR A DEVICE
// =====================================================
export const getDeviceSchedules: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    
    const { id } = req.params;

    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('appliance_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      schedules: data 
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// UPDATE SCHEDULE - Toggle active status or update cron
// =====================================================
export const updateSchedule: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    
    const { id } = req.params;
    const { is_active, cron_expression, action, timezone } = req.body;

    const updates: any = {};
    if (typeof is_active !== 'undefined') updates.is_active = is_active;
    if (cron_expression) updates.cron_expression = cron_expression;
    if (action) updates.action = action;
    if (timezone) updates.timezone = timezone;

    const { data, error } = await supabase
      .from('schedules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      schedule: data 
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// DELETE SCHEDULE
// =====================================================
export const deleteSchedule: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    
    const { id } = req.params;

    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      message: 'Schedule deleted successfully' 
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// GET RECENT EVENTS - System-wide or for a home
// =====================================================
export const getRecentEvents: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    
    const { home_id, limit = 100 } = req.query;

    let query = supabase
      .from('recent_events')
      .select('*');
    
    if (home_id) {
      query = query.eq('home_id', home_id);
    }

    query = query.limit(parseInt(limit as string));

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      events: data 
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

// =====================================================
// GET ACTIVE SCHEDULES - System-wide or for a home
// =====================================================
export const getActiveSchedules: RequestHandler = async (req, res) => {
  try {
    const user = await authenticateUser(req.headers.authorization);
    
    const { home_id } = req.query;

    let query = supabase
      .from('active_schedules')
      .select('*');
    
    if (home_id) {
      query = query.eq('home_id', home_id);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      success: true, 
      schedules: data 
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};
