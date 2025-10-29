import { supabase } from "@/lib/supabaseClient";

export type Appliance = {
  id: number;
  name: string;
  status: "on" | "off";
  power_usage: number | null;
  home_id: number | null;
  created_at: string | null;
  last_turned_on: string | null;
  total_usage_ms: number | null;
};

export type ApplianceEvent = {
  id: number;
  status: "on" | "off";
  recorded_at: string;
  power_usage: number;
  name?: string;
};

export type UsageAnalyticsPoint = {
  day: string;
  total_power: number;
  on_events: number;
  off_events: number;
};

export type NotificationItem = {
  id: number;
  status: "on" | "off";
  recorded_at: string;
  power_usage: number;
  appliance_name: string;
  home_name: string;
};

export type HomeMember = {
  id: number;
  role: string;
  user_id: string;
  home_id: number;
  users: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  homes: {
    id: number;
    name: string | null;
  } | null;
};

export async function listAppliances() {
  const { data, error } = await supabase
    .from("appliances")
    .select("id, name, status, power_usage, home_id, created_at")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Appliance[];
}

export async function fetchAppliance(applianceId: number) {
  const { data, error } = await supabase
    .from("appliances")
    .select("id, name, status, power_usage, home_id, created_at")
    .eq("id", applianceId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Appliance;
}

const authorizedFetch = async <T>(
  path: string,
  token: string,
  init?: RequestInit,
) => {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const message = await response
      .json()
      .then((payload) => payload?.message ?? response.statusText)
      .catch(() => response.statusText);
    throw new Error(message);
  }

  return (await response.json()) as T;
};

export async function toggleApplianceStatus(
  token: string,
  applianceId: number,
  payload: { status?: "on" | "off"; powerUsage?: number },
) {
  const response = await authorizedFetch<{ appliance: Appliance }>(
    `/api/appliances/${applianceId}/toggle`,
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  return response.appliance;
}

export async function fetchApplianceActivity(token: string, applianceId: number) {
  const response = await authorizedFetch<{ events: ApplianceEvent[] }>(
    `/api/appliances/${applianceId}/activity`,
    token,
  );

  return response.events ?? [];
}

export async function fetchUsageAnalytics(token: string) {
  const response = await authorizedFetch<{ data: UsageAnalyticsPoint[] }>(
    "/api/analytics/usage",
    token,
  );

  return response.data ?? [];
}

export async function fetchRecentNotifications(token: string) {
  const response = await authorizedFetch<{ notifications: NotificationItem[] }>(
    "/api/notifications",
    token,
  );

  return response.notifications ?? [];
}

export async function listHomes() {
  const { data, error } = await supabase
    .from("homes")
    .select("id, name, owner_id, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listSchedules(applianceId: number) {
  const { data, error } = await supabase
    .from("schedules")
    .select("id, action, cron_expression, is_active, created_at")
    .eq("appliance_id", applianceId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createSchedule(input: {
  appliance_id: number;
  user_id: string;
  action: "on" | "off";
  cron_expression: string;
  is_active: boolean;
}) {
  const { data, error } = await supabase
    .from("schedules")
    .insert(input)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateSchedule(
  scheduleId: number,
  input: Partial<{ action: "on" | "off"; is_active: boolean; cron_expression: string }>,
) {
  const { data, error } = await supabase
    .from("schedules")
    .update(input)
    .eq("id", scheduleId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deleteSchedule(scheduleId: number) {
  const { error } = await supabase.from("schedules").delete().eq("id", scheduleId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function listHomeMembers(homeId: number) {
  const { data, error } = await supabase
    .from("home_members")
    .select(
      "id, role, user_id, home_id, users:user_id ( id, full_name, avatar_url ), homes:home_id ( id, name )",
    )
    .eq("home_id", homeId)
    .order("role", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((member) => ({
    ...member,
    users: Array.isArray(member.users) ? member.users[0] ?? null : member.users ?? null,
    homes: Array.isArray(member.homes) ? member.homes[0] ?? null : member.homes ?? null,
  })) as HomeMember[];
}

export async function listAppliancePermissions(homeId: number) {
  const memberResponse = await supabase
    .from("home_members")
    .select("id")
    .eq("home_id", homeId);

  if (memberResponse.error) {
    throw new Error(memberResponse.error.message);
  }

  const memberIds = memberResponse.data?.map((member) => member.id) ?? [];
  if (memberIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("appliance_permissions")
    .select("id, home_member_id, appliance_id")
    .in("home_member_id", memberIds);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function setAppliancePermission(
  home_member_id: number,
  appliance_id: number,
  enabled: boolean,
) {
  if (enabled) {
    const { error } = await supabase
      .from("appliance_permissions")
      .upsert({ home_member_id, appliance_id }, { onConflict: "home_member_id,appliance_id" });

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from("appliance_permissions")
      .delete()
      .eq("home_member_id", home_member_id)
      .eq("appliance_id", appliance_id);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function createHome(name: string, owner_id: string) {
  const { data, error } = await supabase
    .from("homes")
    .insert({ name, owner_id })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { error: memberError } = await supabase.from("home_members").insert({
    home_id: data.id,
    user_id: owner_id,
    role: "owner",
  });

  if (memberError) {
    throw new Error(memberError.message);
  }

  return data;
}

export const api = {
  post: async <T>(path: string, body: any) => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }
    return authorizedFetch<T>(path, session.access_token, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  get: async <T>(path: string) => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }
    return authorizedFetch<T>(path, session.access_token, {
      method: "GET",
    });
  },
  delete: async <T>(path: string) => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }
    return authorizedFetch<T>(path, session.access_token, {
      method: "DELETE",
    });
  },
  put: async <T>(path: string, body: any) => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error("User not authenticated");
    }
    return authorizedFetch<T>(path, session.access_token, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },
};
