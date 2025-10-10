import { useQuery } from "@tanstack/react-query";
import { AlarmClock, BellRing, ShieldCheck, Zap } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/providers/AuthProvider";
import { fetchRecentNotifications } from "@/lib/api";

const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

export default function Notifications() {
  const { session } = useAuth();

  const notificationsQuery = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => fetchRecentNotifications(session!.access_token!),
    enabled: Boolean(session?.access_token),
  });

  const notifications = notificationsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Priority alerts, manual overrides, and automation summaries from the last 24 hours.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BellRing className="h-5 w-5 text-primary" />
              Recent alerts
            </CardTitle>
            <CardDescription>Your most impactful device events and automations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">You're all caught up. No alerts have fired recently.</p>
            ) : (
              notifications.map((notification) => (
                <AlertRow key={notification.id} notification={notification} />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Safety status
            </CardTitle>
            <CardDescription>Security layers and parental control enforcement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/60 p-3">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">Green</Badge>
              All schedules respect parental permissions and zero overrides were blocked today.
            </div>
            <Separator className="bg-border/50" />
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Recommendations</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Invite guardians to receive alerts instantly.</li>
                <li>Enable push notifications on the Electra mobile app.</li>
                <li>Set weekly summary emails for energy reports.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type AlertRowProps = {
  notification: Awaited<ReturnType<typeof fetchRecentNotifications>>[number];
};

function AlertRow({ notification }: AlertRowProps) {
  const timestamp = new Date(notification.recorded_at);
  const critical = notification.status === "on" && notification.power_usage > 1500;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/60 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${critical ? "bg-amber-500/15 text-amber-600" : "bg-primary/10 text-primary"}`}>
          {critical ? <AlarmClock className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {notification.appliance_name} {notification.status === "on" ? "activated" : "paused"}
          </p>
          <p className="text-xs text-muted-foreground">
            {timestamp.toLocaleString()} • {notification.power_usage} W • {notification.home_name}
          </p>
        </div>
      </div>
      <Badge variant="outline" className="text-xs uppercase tracking-widest">
        {critical ? "High draw" : "Routine"}
      </Badge>
    </div>
  );
}
