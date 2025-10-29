import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface Device {
  id: number;
  name: string;
  device_type: string;
  home_id: number;
  home_name: string;
  status: 'on' | 'off';
  power_usage: number;
  last_turned_on: string | null;
  total_usage_ms: number;
  current_session_ms: number;
  events_today: number;
  active_schedules: number;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface DeviceEvent {
  event_id: number;
  user_email: string;
  status: string;
  event_type: string;
  power_usage: number;
  metadata: Record<string, any>;
  recorded_at: string;
}

export interface DeviceStats {
  total_events: number;
  total_on_time_hours: number;
  avg_session_minutes: number;
  total_power_kwh: number;
  on_count: number;
  off_count: number;
}

export interface Schedule {
  id: number;
  appliance_id: number;
  appliance_name?: string;
  home_id?: number;
  home_name?: string;
  action: 'on' | 'off';
  cron_expression: string;
  timezone: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
}

// =====================================================
// MAIN HOOK: useDevices
// =====================================================

export function useDevices(homeId?: number) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = homeId ? `/api/v2/devices?home_id=${homeId}` : '/api/v2/devices';
      const data = await api.get<{ success: boolean; devices: Device[]; error?: string }>(url);
      
      if (data.success) {
        setDevices(data.devices);
      } else {
        setError(data.error || 'Failed to fetch devices');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [homeId]);

  const createDevice = async (
    name: string,
    home_id: number,
    device_type: string = 'generic',
    metadata: Record<string, any> = {}
  ) => {
    try {
      const data = await api.post<{ success: boolean; device: any; error?: string }>('/api/v2/devices', {
        name,
        home_id,
        device_type,
        metadata,
      });
      
      if (data.success) {
        await fetchDevices(); // Refresh list
        return data.device;
      } else {
        throw new Error(data.error || 'Failed to create device');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const toggleDevice = async (appliance_id: number, status: 'on' | 'off') => {
    try {
      const data = await api.post<{ success: boolean; result: any; error?: string }>('/api/v2/devices/toggle', {
        appliance_id,
        status,
      });
      
      if (data.success) {
        await fetchDevices(); // Refresh to get updated stats
        return data.result;
      } else {
        throw new Error(data.error || 'Failed to toggle device');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateDevice = async (
    id: number,
    updates: { name?: string; device_type?: string; metadata?: Record<string, any> }
  ) => {
    try {
      const data = await api.put<{ success: boolean; device: any; error?: string }>(`/api/v2/devices/${id}`, updates);
      
      if (data.success) {
        await fetchDevices();
        return data.device;
      } else {
        throw new Error(data.error || 'Failed to update device');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteDevice = async (id: number) => {
    try {
      const data = await api.delete<{ success: boolean; error?: string }>(`/api/v2/devices/${id}`);
      
      if (data.success) {
        await fetchDevices();
        return true;
      } else {
        throw new Error(data.error || 'Failed to delete device');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    devices,
    loading,
    error,
    refresh: fetchDevices,
    createDevice,
    toggleDevice,
    updateDevice,
    deleteDevice,
  };
}

// =====================================================
// HOOK: useDeviceHistory
// =====================================================

export function useDeviceHistory(deviceId: number, limit: number = 50) {
  const [history, setHistory] = useState<DeviceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<{ success: boolean; history: DeviceEvent[]; error?: string }>(
        `/api/v2/devices/${deviceId}/history?limit=${limit}`
      );
      
      if (data.success) {
        setHistory(data.history);
      } else {
        setError(data.error || 'Failed to fetch history');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deviceId) {
      fetchHistory();
    }
  }, [deviceId, limit]);

  return { history, loading, error, refresh: fetchHistory };
}

// =====================================================
// HOOK: useDeviceStats
// =====================================================

export function useDeviceStats(deviceId: number, days: number = 7) {
  const [stats, setStats] = useState<DeviceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<{ success: boolean; stats: DeviceStats; error?: string }>(
        `/api/v2/devices/${deviceId}/stats?days=${days}`
      );
      
      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.error || 'Failed to fetch stats');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deviceId) {
      fetchStats();
    }
  }, [deviceId, days]);

  return { stats, loading, error, refresh: fetchStats };
}

// =====================================================
// HOOK: useSchedules
// =====================================================

export function useSchedules(deviceId?: number) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = deviceId 
        ? `/api/v2/devices/${deviceId}/schedules`
        : '/api/v2/schedules/active';
      const data = await api.get<{ success: boolean; schedules: Schedule[]; error?: string }>(url);
      
      if (data.success) {
        setSchedules(data.schedules);
      } else {
        setError(data.error || 'Failed to fetch schedules');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [deviceId]);

  const createSchedule = async (
    appliance_id: number,
    action: 'on' | 'off',
    cron_expression: string,
    timezone: string = 'UTC'
  ) => {
    try {
      const data = await api.post<{ success: boolean; schedule: any; error?: string }>('/api/v2/schedules', {
        appliance_id,
        action,
        cron_expression,
        timezone,
      });
      
      if (data.success) {
        await fetchSchedules();
        return data.schedule;
      } else {
        throw new Error(data.error || 'Failed to create schedule');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateSchedule = async (
    id: number,
    updates: {
      is_active?: boolean;
      cron_expression?: string;
      action?: 'on' | 'off';
      timezone?: string;
    }
  ) => {
    try {
      const data = await api.put<{ success: boolean; schedule: any; error?: string }>(
        `/api/v2/schedules/${id}`,
        updates
      );
      
      if (data.success) {
        await fetchSchedules();
        return data.schedule;
      } else {
        throw new Error(data.error || 'Failed to update schedule');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteSchedule = async (id: number) => {
    try {
      const data = await api.delete<{ success: boolean; error?: string }>(`/api/v2/schedules/${id}`);
      
      if (data.success) {
        await fetchSchedules();
        return true;
      } else {
        throw new Error(data.error || 'Failed to delete schedule');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    schedules,
    loading,
    error,
    refresh: fetchSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  };
}

// =====================================================
// HOOK: useRecentEvents
// =====================================================

export function useRecentEvents(homeId?: number, limit: number = 100) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = `/api/v2/events?limit=${limit}`;
      if (homeId) {
        url += `&home_id=${homeId}`;
      }
      const data = await api.get<{ success: boolean; events: any[]; error?: string }>(url);
      
      if (data.success) {
        setEvents(data.events);
      } else {
        setError(data.error || 'Failed to fetch events');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [homeId, limit]);

  return { events, loading, error, refresh: fetchEvents };
}
