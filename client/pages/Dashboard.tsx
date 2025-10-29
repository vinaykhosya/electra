import { ComponentType, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Bolt,
  Leaf,
  PlugZap,
  Power,
  Settings2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import {
  Appliance,
  ApplianceEvent,
  UsageAnalyticsPoint,
  createHome,
  fetchRecentNotifications,
  fetchUsageAnalytics,
  listAppliances,
  toggleApplianceStatus,
} from "@/lib/api";
import { PRIMARY_HOME_QUERY_KEY, usePrimaryHome } from "@/hooks/usePrimaryHome";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";

import { AddDeviceForm } from "@/components/AddDeviceForm";
import { PendingInvitations } from "@/components/PendingInvitations";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";


const APPLIANCES_QUERY_KEY = ["appliances"] as const;
const ANALYTICS_QUERY_KEY = ["usage-analytics"] as const;
const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

export default function Dashboard() {
  const { session, profile, user } = useAuth();
  const { data: home, isLoading: isHomeLoading } = usePrimaryHome();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const appliancesQuery = useQuery({
    queryKey: APPLIANCES_QUERY_KEY,
    queryFn: listAppliances,
    enabled: Boolean(session?.user),
  });

  const usageQuery = useQuery({
    queryKey: ANALYTICS_QUERY_KEY,
    queryFn: () => fetchUsageAnalytics(session!.access_token!),
    enabled: Boolean(session?.access_token),
  });

  const notificationsQuery = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => fetchRecentNotifications(session!.access_token!),
    enabled: Boolean(session?.access_token),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "on" | "off" }) =>
      toggleApplianceStatus(session!.access_token!, id, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: APPLIANCES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
      toast({ title: "Device state updated" });
    },
    onError: (error: unknown) => {
      toast({
        title: "Unable to update appliance",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const createHomeMutation = useMutation({
    mutationFn: (name: string) => createHome(name, user!.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PRIMARY_HOME_QUERY_KEY, user?.id] });
      toast({ title: "Home created successfully!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create home",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const appliances = appliancesQuery.data ?? [];
  const usage = usageQuery.data ?? [];
  const notifications = notificationsQuery.data ?? [];

  const activeAppliances = useMemo(
    () => appliances.filter((item) => item.status === "on"),
    [appliances],
  );
  const totalPower = useMemo(
    () => appliances.reduce((sum, item) => sum + (item.power_usage ?? 0), 0),
    [appliances],
  );
  const todayUsage = useMemo(() => {
    const today = new Date().toDateString();
    const point = usage.find(
      (item) => new Date(item.day).toDateString() === today,
    );
    return point ?? null;
  }, [usage]);

  const quickControls = appliances.slice(0, 4);
  const recentEvents = notifications.slice(0, 5);

  if (isHomeLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading your home...</p>
      </div>
    );
  }

  if (!home) {
    return <CreateHomeForm mutation={createHomeMutation} />;
  }

  return (
    <div className="space-y-8">
      {/* Pending Invitations */}
      <PendingInvitations />
      
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-primary/15 via-primary/5 to-background">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.25),transparent_65%)]" />
          <CardHeader className="relative z-10 flex flex-col gap-4 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge variant="secondary" className="mb-3 bg-primary/10 text-primary">
                {home?.homeName ?? "Electra Home"}
              </Badge>
              <CardTitle className="text-3xl font-semibold text-foreground">
                {profile?.full_name ? `Good to see you, ${profile.full_name.split(" ")[0]}` : "Good to see you"}
              </CardTitle>
              <CardDescription className="text-base">
                {activeAppliances.length} appliance{activeAppliances.length === 1 ? " is" : "s are"} running •
                Total draw {totalPower} W • Schedules humming along.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/analytics" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  View analytics
                </Link>
              </Button>
              <Button asChild>
                <Link to="/devices" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  Manage devices
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 grid gap-6 md:grid-cols-3">
            <MetricTile
              icon={PlugZap}
              title="Active appliances"
              value={`${activeAppliances.length}/${appliances.length}`}
              helper="All connected to Electra mesh"
            />
            <MetricTile
              icon={Bolt}
              title="Today's draw"
              value={`${todayUsage ? todayUsage.total_power : totalPower} W`}
              helper="Based on logged sessions"
            />
            <MetricTile
              icon={Leaf}
              title="Energy efficiency"
              value={todayUsage ? `${100 - Math.min(100, todayUsage.total_power / 20)}%` : "Optimizing"}
              helper="Adaptive schedules reduce spikes"
            />
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Power className="h-5 w-5 text-primary" />
              Quick controls
            </CardTitle>
            <CardDescription>Instantly toggle high-priority appliances.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {quickControls.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appliances found. Add your first device to begin.</p>) : (
              quickControls.map((device) => (
                <QuickControl
                  key={device.id}
                  appliance={device}
                  loading={toggleMutation.isPending}
                  onToggle={(status) => toggleMutation.mutate({ id: device.id, status })}
                />
              ))
            )}
          </CardContent>
        </Card>
      </section>
      


      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Energy timeline
            </CardTitle>
            <CardDescription>30-day rolling power usage across all connected appliances.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <UsageChart data={usage} />
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings2 className="h-5 w-5 text-primary" />
              Recent activity
            </CardTitle>
            <CardDescription>Latest automations and manual overrides.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Stay tuned. No events logged in the last hour.</p>
            ) : (
              recentEvents.map((event) => (
                <TimelineItem key={event.id} event={event} />
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PlugZap className="h-5 w-5 text-primary" />
              Register New Device
            </CardTitle>
            <CardDescription>
              Add a new ESP32 device to your home network.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddDeviceForm />
          </CardContent>
        </Card>
      </section>

    </div>
  );
}

function CreateHomeForm({ mutation }: { mutation: any }) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      mutation.mutate(name.trim());
    }
  };

  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your Home</CardTitle>
          <CardDescription>
            You need a home to manage your devices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="home-name">Home Name</Label>
              <Input
                id="home-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., My Smart Home"
              />
            </div>
            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? "Creating..." : "Create Home"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ... The rest of your MetricTile, QuickControl, TimelineItem, and UsageChart components remain unchanged ...
type MetricTileProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  value: string;
  helper: string;
};

function MetricTile({ icon: Icon, title, value, helper }: MetricTileProps) {
  return (
    <div className="rounded-3xl border border-border/60 bg-background/50 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Live</span>
      </div>
      <p className="mt-6 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
    </div>
  );
}

type QuickControlProps = {
  appliance: Appliance;
  loading: boolean;
  onToggle: (status: "on" | "off") => void;
};

function QuickControl({ appliance, loading, onToggle }: QuickControlProps) {
  const isOn = appliance.status === "on";
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{appliance.name}</p>
        <p className="text-xs text-muted-foreground">
          {isOn ? `${appliance.power_usage ?? 0} W draw` : "Idle"}
        </p>
      </div>
      <Switch
        checked={isOn}
        disabled={loading}
        onCheckedChange={(checked) => onToggle(checked ? "on" : "off")}
      />
    </div>
  );
}

type TimelineItemProps = {
  event: ApplianceEvent & { appliance_name?: string; home_name?: string };
};

function TimelineItem({ event }: TimelineItemProps) {
  const timestamp = new Date(event.recorded_at);
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/60 p-4">
      <div className={cn(
        "mt-1 h-2 w-2 rounded-full",
        event.status === "on" ? "bg-emerald-500" : "bg-slate-400",
      )} />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {event.name ?? event.appliance_name ?? "Appliance"}
        </p>
        <p className="text-xs text-muted-foreground">
          {event.status === "on" ? "Activated" : "Standby"} • {event.power_usage} W • {timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

type UsageChartProps = {
  data: UsageAnalyticsPoint[];
};

function UsageChart({ data }: UsageChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No data yet. Toggle a few appliances to begin building your timeline.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="usageGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="day"
          stroke="hsl(var(--muted-foreground))"
          tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            borderRadius: "1rem",
            border: "1px solid hsl(var(--border))",
            color: "hsl(var(--foreground))",
          }}
          labelFormatter={(value) =>
            new Date(value).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          }
          formatter={(value: number) => [`${value} W`, "Load"]}
        />
        <Area
          type="monotone"
          dataKey="total_power"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#usageGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}