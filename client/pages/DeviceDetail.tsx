import { ComponentType, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Clock4,
  Flame,
  Lightbulb,
  ListChecks,
  Power,
  CalendarClock,
  SwitchCamera,
  Trash2,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import {
  Appliance,
  ApplianceEvent,
  createSchedule,
  deleteSchedule,
  fetchAppliance,
  fetchApplianceActivity,
  listSchedules,
  toggleApplianceStatus,
  updateSchedule,
} from "@/lib/api";

const APPLIANCE_QUERY_KEY = (id: number) => ["appliance", id] as const;
const SCHEDULES_QUERY_KEY = (id: number) => ["schedules", id] as const;
const ACTIVITY_QUERY_KEY = (id: number) => ["appliance-activity", id] as const;

const PERIOD_OPTIONS = [
  { label: "Daily", value: "daily", cron: "*" },
  { label: "Weekdays", value: "weekdays", cron: "1-5" },
  { label: "Weekends", value: "weekends", cron: "6,0" },
];

type ScheduleFormState = {
  time: string;
  action: "on" | "off";
  period: "daily" | "weekdays" | "weekends";
  isActive: boolean;
};

const initialScheduleForm: ScheduleFormState = {
  time: "18:00",
  action: "on",
  period: "daily",
  isActive: true,
};

export default function DeviceDetail() {
  const { id } = useParams();
  const numericId = Number.parseInt(id ?? "", 10);
  const navigate = useNavigate();
  const { session, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (Number.isNaN(numericId)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="mt-4 text-sm text-muted-foreground">We could not find that appliance.</p>
        <Button className="mt-4" onClick={() => navigate("/devices")}>Back to devices</Button>
      </div>
    );
  }

  const applianceQuery = useQuery({
    queryKey: APPLIANCE_QUERY_KEY(numericId),
    queryFn: () => fetchAppliance(numericId),
    enabled: Boolean(session?.user),
    retry: false,
  });

  const schedulesQuery = useQuery({
    queryKey: SCHEDULES_QUERY_KEY(numericId),
    queryFn: () => listSchedules(numericId),
    enabled: Boolean(session?.user),
  });

  const activityQuery = useQuery({
    queryKey: ACTIVITY_QUERY_KEY(numericId),
    queryFn: () => fetchApplianceActivity(session!.access_token!, numericId),
    enabled: Boolean(session?.access_token),
  });

  const toggleMutation = useMutation({
    mutationFn: (status: "on" | "off") =>
      toggleApplianceStatus(session!.access_token!, numericId, { status }),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: APPLIANCE_QUERY_KEY(numericId) }),
        queryClient.invalidateQueries({ queryKey: ACTIVITY_QUERY_KEY(numericId) }),
        queryClient.invalidateQueries({ queryKey: ["usage-analytics"] }),
      ]);
      toast({ title: "Device updated" });
    },
    onError: (error) => {
      toast({
        title: "Toggle failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (form: ScheduleFormState) => {
      if (!user) throw new Error("You must be logged in");
      const cron = deriveCron(form.time, form.period);
      return createSchedule({
        appliance_id: numericId,
        user_id: user.id,
        action: form.action,
        cron_expression: cron,
        is_active: form.isActive,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SCHEDULES_QUERY_KEY(numericId) });
      toast({ title: "Schedule created" });
    },
    onError: (error) => {
      toast({
        title: "Unable to create schedule",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id: scheduleId, is_active }: { id: number; is_active: boolean }) =>
      updateSchedule(scheduleId, { is_active }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SCHEDULES_QUERY_KEY(numericId) });
      toast({ title: "Schedule updated" });
    },
    onError: (error) => {
      toast({
        title: "Unable to update schedule",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (scheduleId: number) => deleteSchedule(scheduleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SCHEDULES_QUERY_KEY(numericId) });
      toast({ title: "Schedule removed" });
    },
    onError: (error) => {
      toast({
        title: "Unable to remove schedule",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const appliance = applianceQuery.data;
  const schedules = schedulesQuery.data ?? [];
  const events = activityQuery.data ?? [];

  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>(initialScheduleForm);
  const [scheduleToDelete, setScheduleToDelete] = useState<number | null>(null);

  if (applianceQuery.isError || (!appliance && applianceQuery.isFetched)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="mt-4 text-sm text-muted-foreground">This appliance is unavailable or you lack permission.</p>
        <Button className="mt-4" onClick={() => navigate("/devices")}>Back to devices</Button>
      </div>
    );
  }

  if (!appliance) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Loading appliance…
      </div>
    );
  }

  const isOn = appliance.status === "on";
  const statusBadge = isOn ? "bg-emerald-500/20 text-emerald-600" : "bg-slate-500/20 text-muted-foreground";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/devices" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{appliance.name}</h1>
            <p className="text-sm text-muted-foreground">
              Registered {new Date(appliance.created_at ?? Date.now()).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={statusBadge}>{isOn ? "Active" : "Standby"}</Badge>
          <Switch
            checked={isOn}
            disabled={toggleMutation.isPending}
            onCheckedChange={(checked) => toggleMutation.mutate(checked ? "on" : "off")}
          />
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Power className="h-5 w-5 text-primary" />
              Live telemetry
            </CardTitle>
            <CardDescription>Last recorded draw and event history.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-4 rounded-3xl border border-border/60 bg-background/50 p-5">
              <TelemetryPill icon={Flame} label="Power" value={`${appliance.power_usage ?? 0} W`} />
              <TelemetryPill icon={SwitchCamera} label="State" value={isOn ? "On" : "Off"} />
              <TelemetryPill
                icon={Clock4}
                label="Last change"
                value={events[0] ? new Date(events[0].recorded_at).toLocaleString() : "Awaiting event"}
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Recent timeline</h2>
                <Badge variant="outline" className="gap-1 text-xs uppercase tracking-widest">
                  <ListChecks className="h-3 w-3" />
                  {events.length} events
                </Badge>
              </div>
              <div className="space-y-3">
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity logged. Toggle the device to generate telemetry.</p>
                ) : (
                  events.slice(0, 10).map((event) => <ActivityRow key={event.id} event={event} />)
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarClock className="h-5 w-5 text-primary" />
              Automation schedules
            </CardTitle>
            <CardDescription>Fine-tune when this appliance should switch states.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="space-y-4 rounded-2xl border border-border/60 bg-background/60 p-4"
              onSubmit={(event) => {
                event.preventDefault();
                createScheduleMutation.mutate(scheduleForm);
              }}
            >
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label htmlFor="schedule-time">Time (24h)</Label>
                  <Input
                    id="schedule-time"
                    type="time"
                    required
                    value={scheduleForm.time}
                    onChange={(event) =>
                      setScheduleForm((prev) => ({ ...prev, time: event.target.value || "18:00" }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Action</Label>
                    <Select
                      value={scheduleForm.action}
                      onValueChange={(value: "on" | "off") =>
                        setScheduleForm((prev) => ({ ...prev, action: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="on">Turn on</SelectItem>
                        <SelectItem value="off">Turn off</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cadence</Label>
                    <Select
                      value={scheduleForm.period}
                      onValueChange={(value: ScheduleFormState["period"]) =>
                        setScheduleForm((prev) => ({ ...prev, period: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIOD_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value as ScheduleFormState["period"]}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-background/70 px-3 py-2">
                  <span className="text-sm text-muted-foreground">Enable immediately</span>
                  <Switch
                    checked={scheduleForm.isActive}
                    onCheckedChange={(checked) =>
                      setScheduleForm((prev) => ({ ...prev, isActive: checked }))
                    }
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createScheduleMutation.isPending}>
                Add schedule
              </Button>
            </form>

            <Separator className="bg-border/60" />

            <div className="space-y-3">
              {schedules.length === 0 ? (
                <p className="text-sm text-muted-foreground">No schedules yet. Create one to automate this device.</p>
              ) : (
                schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/60 p-4 text-sm md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {describeCron(schedule.cron_expression)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {schedule.action === "on" ? "Power on" : "Shut down"} • Created {new Date(schedule.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={schedule.is_active}
                        disabled={updateScheduleMutation.isPending}
                        onCheckedChange={(checked) =>
                          updateScheduleMutation.mutate({ id: schedule.id, is_active: checked })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setScheduleToDelete(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <AlertDialog open={scheduleToDelete !== null} onOpenChange={() => setScheduleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove schedule</AlertDialogTitle>
            <AlertDialogDescription>
              This automation will stop running immediately. You can recreate it anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (scheduleToDelete !== null) {
                  deleteScheduleMutation.mutate(scheduleToDelete);
                  setScheduleToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type TelemetryPillProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
};

function TelemetryPill({ icon: Icon, label, value }: TelemetryPillProps) {
  return (
    <div className="flex flex-1 min-w-[140px] items-center gap-3 rounded-2xl border border-border/60 bg-background/80 px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

type ActivityRowProps = {
  event: ApplianceEvent;
};

function ActivityRow({ event }: ActivityRowProps) {
  const timestamp = new Date(event.recorded_at);
  const isOn = event.status === "on";

  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-full ${isOn ? "bg-emerald-500/15 text-emerald-600" : "bg-slate-500/15 text-slate-500"} flex items-center justify-center`}>
          {isOn ? <Power className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" />}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{isOn ? "Power on" : "Power off"}</p>
          <p className="text-xs text-muted-foreground">
            {timestamp.toLocaleString()} • {event.power_usage} W
          </p>
        </div>
      </div>
    </div>
  );
}

function deriveCron(time: string, period: ScheduleFormState["period"]) {
  const [hour, minute] = time.split(":");
  const dayField = PERIOD_OPTIONS.find((option) => option.value === period)?.cron ?? "*";
  return `${minute} ${hour} * * ${dayField}`;
}

function describeCron(cron: string) {
  const [minute, hour, , , day] = cron.split(" ");
  const time = formatTime(hour, minute);
  if (day === "*" || day === undefined) {
    return `Daily at ${time}`;
  }
  if (day === "1-5") {
    return `Weekdays at ${time}`;
  }
  if (day === "6,0") {
    return `Weekends at ${time}`;
  }
  return `Cron: ${cron}`;
}

function formatTime(hour: string, minute: string) {
  const date = new Date();
  date.setHours(Number(hour), Number(minute));
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
