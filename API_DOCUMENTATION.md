# Enhanced Device Management API Documentation

## Overview
This API provides a complete device management system with automatic event logging, usage statistics, and scheduling capabilities. All endpoints require authentication via Bearer token in the Authorization header.

**Base URL**: `/api/v2`

---

## 🔧 Device Management

### Create Device
**POST** `/api/v2/devices`

Creates a new device with automatic validation and event logging.

**Request Body:**
```json
{
  "name": "Living Room Light",
  "home_id": 1,
  "device_type": "light",
  "metadata": {
    "brand": "Philips",
    "model": "Hue A19",
    "wattage": 10
  }
}
```

**Response:**
```json
{
  "success": true,
  "device": {
    "device_id": 5,
    "device_name": "Living Room Light",
    "home_id": 1,
    "created_at": "2025-10-28T10:30:00Z"
  }
}
```

---

### Get All Devices
**GET** `/api/v2/devices?home_id=1`

Returns all devices with enhanced stats (events today, active schedules, usage time).

**Query Parameters:**
- `home_id` (optional): Filter by home ID

**Response:**
```json
{
  "success": true,
  "devices": [
    {
      "id": 5,
      "name": "Living Room Light",
      "device_type": "light",
      "home_id": 1,
      "home_name": "vinay's Home",
      "status": "off",
      "power_usage": 10,
      "last_turned_on": null,
      "total_usage_ms": 3600000,
      "current_session_ms": 0,
      "events_today": 5,
      "active_schedules": 2,
      "created_at": "2025-10-28T10:30:00Z",
      "updated_at": "2025-10-28T10:30:00Z"
    }
  ]
}
```

---

### Get Device By ID
**GET** `/api/v2/devices/:id`

Returns detailed information for a specific device.

**Response:**
```json
{
  "success": true,
  "device": {
    "id": 5,
    "name": "Living Room Light",
    "device_type": "light",
    "status": "off",
    "power_usage": 10,
    "total_usage_ms": 3600000,
    "events_today": 5,
    "active_schedules": 2
  }
}
```

---

### Toggle Device
**POST** `/api/v2/devices/toggle`

Toggles device status with automatic event logging and usage tracking.

**Request Body:**
```json
{
  "appliance_id": 5,
  "status": "on"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "device_id": 5,
    "old_status": "off",
    "new_status": "on",
    "event_timestamp": "2025-10-28T11:00:00Z"
  }
}
```

**Features:**
- ✅ Validates user has `can_control` permission
- ✅ Automatically logs event to `appliance_events`
- ✅ Tracks session duration when turning off
- ✅ Updates `total_usage_ms` automatically

---

### Update Device
**PUT** `/api/v2/devices/:id`

Updates device name, type, or metadata.

**Request Body:**
```json
{
  "name": "Master Bedroom Light",
  "device_type": "smart_bulb",
  "metadata": {
    "color_support": true
  }
}
```

---

### Delete Device
**DELETE** `/api/v2/devices/:id`

Deletes a device (only home owners can delete).

---

## 📊 Device History & Statistics

### Get Device History
**GET** `/api/v2/devices/:id/history?limit=50`

Returns event log for a device (who turned it on/off and when).

**Query Parameters:**
- `limit` (default: 50): Number of events to return

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "event_id": 123,
      "user_email": "vinay@example.com",
      "status": "on",
      "event_type": "status_change",
      "power_usage": 10,
      "metadata": {
        "old_status": "off",
        "new_status": "on"
      },
      "recorded_at": "2025-10-28T11:00:00Z"
    }
  ]
}
```

---

### Get Device Usage Stats
**GET** `/api/v2/devices/:id/stats?days=7`

Returns usage statistics for a device over the specified time period.

**Query Parameters:**
- `days` (default: 7): Number of days to analyze

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_events": 50,
    "total_on_time_hours": 12.5,
    "avg_session_minutes": 15.0,
    "total_power_kwh": 0.125,
    "on_count": 25,
    "off_count": 25
  }
}
```

**Metrics Explained:**
- `total_events`: Total number of status changes
- `total_on_time_hours`: Total time device was on (in hours)
- `avg_session_minutes`: Average duration per "on" session
- `total_power_kwh`: Estimated power consumption in kWh
- `on_count`: Number of times device was turned on
- `off_count`: Number of times device was turned off

---

## ⏰ Scheduling

### Create Schedule
**POST** `/api/v2/schedules`

Creates a schedule for a device with automatic validation.

**Request Body:**
```json
{
  "appliance_id": 5,
  "action": "on",
  "cron_expression": "0 18 * * *",
  "timezone": "America/New_York"
}
```

**Cron Expression Examples:**
- `0 18 * * *` - Every day at 6 PM
- `0 22 * * *` - Every day at 10 PM
- `0 8 * * 1-5` - Weekdays at 8 AM
- `*/30 * * * *` - Every 30 minutes

**Response:**
```json
{
  "success": true,
  "schedule": {
    "schedule_id": 10,
    "appliance_id": 5,
    "action": "on",
    "is_active": true
  }
}
```

**Features:**
- ✅ Validates user has `can_schedule` permission
- ✅ Logs schedule creation event
- ✅ Supports timezone-aware scheduling

---

### Get Device Schedules
**GET** `/api/v2/devices/:id/schedules`

Returns all schedules for a specific device.

**Response:**
```json
{
  "success": true,
  "schedules": [
    {
      "id": 10,
      "appliance_id": 5,
      "action": "on",
      "cron_expression": "0 18 * * *",
      "timezone": "America/New_York",
      "is_active": true,
      "last_run_at": "2025-10-27T18:00:00Z",
      "next_run_at": "2025-10-28T18:00:00Z",
      "created_at": "2025-10-20T10:00:00Z"
    }
  ]
}
```

---

### Update Schedule
**PUT** `/api/v2/schedules/:id`

Updates schedule properties (activate/deactivate, change cron, etc).

**Request Body:**
```json
{
  "is_active": false,
  "cron_expression": "0 19 * * *"
}
```

---

### Delete Schedule
**DELETE** `/api/v2/schedules/:id`

Deletes a schedule.

---

### Get Active Schedules
**GET** `/api/v2/schedules/active?home_id=1`

Returns all active schedules across homes.

**Query Parameters:**
- `home_id` (optional): Filter by home ID

**Response:**
```json
{
  "success": true,
  "schedules": [
    {
      "id": 10,
      "appliance_id": 5,
      "appliance_name": "Living Room Light",
      "home_id": 1,
      "home_name": "vinay's Home",
      "action": "on",
      "cron_expression": "0 18 * * *",
      "timezone": "America/New_York",
      "is_active": true
    }
  ]
}
```

---

## 📋 Events & Activity

### Get Recent Events
**GET** `/api/v2/events?home_id=1&limit=100`

Returns recent events across all devices.

**Query Parameters:**
- `home_id` (optional): Filter by home ID
- `limit` (default: 100): Number of events to return

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "id": 123,
      "appliance_id": 5,
      "appliance_name": "Living Room Light",
      "home_id": 1,
      "user_id": "uuid-here",
      "user_email": "vinay@example.com",
      "status": "on",
      "event_type": "status_change",
      "power_usage": 10,
      "metadata": {},
      "recorded_at": "2025-10-28T11:00:00Z"
    }
  ]
}
```

**Event Types:**
- `device_created`: Device was created
- `status_change`: Device was turned on/off
- `schedule_created`: Schedule was created
- `scheduled`: Action triggered by schedule

---

## 🗄️ Database Views

The API uses three enhanced database views:

### 1. `device_stats`
Enriched device information with real-time stats:
- Current session duration (if device is on)
- Events in last 24 hours
- Number of active schedules
- Total usage time

### 2. `recent_events`
Last 100 events with user information joined.

### 3. `active_schedules`
All active schedules with device and home names joined.

---

## 🔐 Security & Permissions

All endpoints respect Row-Level Security (RLS) policies:

1. **Device Access**: Users can only access devices in homes they own or are members of
2. **Device Control**: Users need `can_control` permission to toggle devices
3. **Scheduling**: Users need `can_schedule` permission to create schedules
4. **Deletion**: Only home owners can delete devices

Permissions are automatically checked by database functions, so you don't need to worry about manual validation in your code.

---

## 🚀 Quick Start Example

```javascript
// Create a device
const response = await fetch('/api/v2/devices', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Bedroom Fan',
    home_id: 1,
    device_type: 'fan',
    metadata: { speed_levels: 3 }
  })
});

const { device } = await response.json();

// Toggle the device
await fetch('/api/v2/devices/toggle', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    appliance_id: device.device_id,
    status: 'on'
  })
});

// Create a schedule (turn off at 11 PM)
await fetch('/api/v2/schedules', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    appliance_id: device.device_id,
    action: 'off',
    cron_expression: '0 23 * * *',
    timezone: 'UTC'
  })
});

// Get usage stats
const stats = await fetch(`/api/v2/devices/${device.device_id}/stats?days=30`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## ✨ Benefits for Backend Developers

1. **No Manual Validation**: Database functions handle permission checks
2. **Automatic Event Logging**: Every action is logged automatically
3. **Usage Tracking**: Session duration and total usage tracked automatically
4. **Rich Statistics**: Built-in views provide analytics without extra queries
5. **Type Safety**: TypeScript interfaces for all endpoints
6. **Easy Scheduling**: Simple cron-based scheduling with timezone support
7. **Audit Trail**: Complete history of who did what and when

---

## 📦 Database Functions Reference

These functions are called by the API but can also be used directly:

- `create_device(name, home_id, device_type, metadata)` - Create device with validation
- `toggle_device(appliance_id, new_status)` - Toggle with permission check
- `create_schedule(appliance_id, action, cron, timezone)` - Create schedule
- `get_device_history(appliance_id, limit)` - Get event log
- `get_device_usage_stats(appliance_id, days)` - Get usage statistics

All functions are **SECURITY DEFINER**, meaning they run with elevated privileges but still enforce RLS policies.
