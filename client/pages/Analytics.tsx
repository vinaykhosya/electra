import { ComponentType, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  BarChart3,
  Calendar,
  Flame,
  Gauge,
  Layers,
  Zap,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/providers/AuthProvider";
import { fetchUsageAnalytics } from "@/lib/api";

const ANALYTICS_QUERY_KEY = ["usage-analytics"] as const;
const MAX_LIVE_DATA_POINTS = 50;

type LiveEvent = {
  appliance_id: number;
  power_usage: number;
  recorded_at: string;
};

export default function Analytics() {
  const { session } = useAuth();
  const [range, setRange] = useState<"7d" | "30d">("30d");
  const [liveData, setLiveData] = useState<LiveEvent[]>([]);

  const analyticsQuery = useQuery({
    queryKey: ANALYTICS_QUERY_KEY,
    queryFn: () => fetchUsageAnalytics(session!.access_token!),
    enabled: Boolean(session?.access_token),
  });

  useEffect(() => {
    const eventSource = new EventSource("/api/analytics/stream");

    eventSource.onmessage = (event) => {
      try {
        const newEvent = JSON.parse(event.data) as LiveEvent;
        setLiveData((prevData) => {
          const newData = [...prevData, newEvent];
          if (newData.length > MAX_LIVE_DATA_POINTS) {
            return newData.slice(newData.length - MAX_LIVE_DATA_POINTS);
          }
          return newData;
        });
      } catch (error) {
        console.error("Failed to parse SSE event:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const data = useMemo(() => {
    const all = analyticsQuery.data ?? [];
    if (range === "7d") {
      return all.slice(0, 7);
    }
    return all;
  }, [analyticsQuery.data, range]);

  const summary = useMemo(() => computeSummary(analyticsQuery.data ?? []), [analyticsQuery.data]);
  const currentLoad = liveData.length > 0 ? liveData[liveData.length - 1].power_usage : 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Energy analytics</h1>
        <p className="text-sm text-muted-foreground">
          Visualize energy use, identify spikes, and track how schedules keep your footprint efficient.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <StatTile icon={Zap} label="Current Load" value={`${currentLoad} W`} caption={`Live from ESP32`} />
        <StatTile icon={Flame} label="Avg. daily draw" value={`${summary.avgDaily} W`} caption="Across selected range" />
        <StatTile icon={Gauge} label="On cycles" value={`${summary.onEvents}`} caption="Switch-ons logged" />
        <StatTile icon={Layers} label="Automation efficacy" value={`${summary.automationScore}%`} caption="Schedules vs manual" />
      </section>

      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            Live Load
          </CardTitle>
          <CardDescription>Real-time power consumption from active devices.</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={liveData} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="liveGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))/0.2" />
              <XAxis
                dataKey="recorded_at"
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(value) => `${value} W`}
                domain={[0, 'dataMax + 50']}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  borderRadius: "1rem",
                  border: "1px solid hsl(var(--border))",
                }}
                labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                formatter={(value: number) => [`${value} W`, "Power"]}
              />
              <Area type="monotone" dataKey="power_usage" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#liveGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Load trend
            </CardTitle>
            <CardDescription>Rolling view of total recorded wattage from appliance events.</CardDescription>
          </div>
          <Tabs value={range} className="w-auto" onValueChange={(value) => setRange(value as typeof range)}>
            <TabsList>
              <TabsTrigger value="7d">7 days</TabsTrigger>
              <TabsTrigger value="30d">30 days</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="analyticsGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))/0.2" />
              <XAxis
                dataKey="day"
                tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(value) => `${value} W`}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  borderRadius: "1rem",
                  border: "1px solid hsl(var(--border))",
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                formatter={(value: number) => [`${value} W`, "Total load"]}
              />
              <Area type="monotone" dataKey="total_power" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#analyticsGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Daily breakdown
          </CardTitle>
          <CardDescription>Compare automation impact and manual overrides per day.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No analytics available yet. Check back after your devices log activity.</p>
          ) : (
            data.map((day) => (
              <div key={day.day} className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/60 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{new Date(day.day).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</p>
                  <p className="text-xs text-muted-foreground">{day.total_power} W total • {day.on_events} on events • {day.off_events} off events</p>
                </div>
                <Badge variant="outline" className="gap-1 text-xs uppercase tracking-widest">
                  Efficiency {calculateEfficiency(day)}%
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type Summary = {
  peakLoad: number;
  peakDate: string;
  avgDaily: number;
  onEvents: number;
  automationScore: number;
};

function computeSummary(data: Awaited<ReturnType<typeof fetchUsageAnalytics>>) {
  if (!data || data.length === 0) {
    return {
      peakLoad: 0,
      peakDate: "",
      avgDaily: 0,
      onEvents: 0,
      automationScore: 0,
    } satisfies Summary;
  }

  const peak = data.reduce((max, point) => (point.total_power > max.total_power ? point : max), data[0]);
  const avg = Math.round(data.reduce((sum, point) => sum + point.total_power, 0) / data.length);
  const totalOn = data.reduce((sum, point) => sum + point.on_events, 0);
  const automationRatio = data.reduce((sum, point) => sum + point.off_events, 0) || 1;
  const automationScore = Math.min(99, Math.round((totalOn / automationRatio) * 42));

  return {
    peakLoad: peak.total_power,
    peakDate: new Date(peak.day).toLocaleDateString(),
    avgDaily: avg,
    onEvents: totalOn,
    automationScore,
  } satisfies Summary;
}

type StatTileProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  caption: string;
};

function StatTile({ icon: Icon, label, value, caption }: StatTileProps) {
  return (
    <Card className="border-border/60 bg-background/70">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">Live</span>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{caption}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function calculateEfficiency(day: Awaited<ReturnType<typeof fetchUsageAnalytics>>[number]) {
  const totalEvents = day.on_events + day.off_events || 1;
  return Math.min(99, Math.round((day.off_events / totalEvents) * 100));
}
