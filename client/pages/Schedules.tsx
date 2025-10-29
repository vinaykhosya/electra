import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { listAppliances, listSchedules, createSchedule, deleteSchedule, updateSchedule } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

const SCHEDULES_QUERY_KEY = ["schedules"];

export default function Schedules() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedAppliance, setSelectedAppliance] = useState<string>("");
  const [action, setAction] = useState<"on" | "off">("on");
  const [cronExpression, setCronExpression] = useState("*");

  const appliancesQuery = useQuery({
    queryKey: ["appliances"],
    queryFn: listAppliances,
    enabled: Boolean(session?.user),
  });

  const schedulesQuery = useQuery({
    queryKey: SCHEDULES_QUERY_KEY,
    queryFn: () => listSchedules(Number(selectedAppliance)),
    enabled: Boolean(session?.user && selectedAppliance),
  });

  const createScheduleMutation = useMutation({
    mutationFn: () => createSchedule({
      appliance_id: Number(selectedAppliance),
      user_id: session!.user.id,
      action,
      cron_expression: cronExpression,
      is_active: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULES_QUERY_KEY });
      toast({ title: "Schedule created" });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id: number) => deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULES_QUERY_KEY });
      toast({ title: "Schedule deleted" });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => updateSchedule(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULES_QUERY_KEY });
      toast({ title: "Schedule updated" });
    },
  });

  const appliances = appliancesQuery.data ?? [];
  const schedules = schedulesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Schedules</h1>

      <Card>
        <CardHeader>
          <CardTitle>Create a new schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="appliance">Appliance</Label>
              <Select value={selectedAppliance} onValueChange={setSelectedAppliance}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an appliance" />
                </SelectTrigger>
                <SelectContent>
                  {appliances.map((appliance) => (
                    <SelectItem key={appliance.id} value={String(appliance.id)}>
                      {appliance.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="action">Action</Label>
              <Select value={action} onValueChange={(value) => setAction(value as "on" | "off")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on">Turn On</SelectItem>
                  <SelectItem value="off">Turn Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cron">Cron Expression</Label>
              <Input id="cron" value={cronExpression} onChange={(e) => setCronExpression(e.target.value)} />
            </div>
          </div>
          <Button onClick={() => createScheduleMutation.mutate()} disabled={!selectedAppliance}>
            <Plus className="mr-2 h-4 w-4" />
            Add Schedule
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {schedules.map((schedule) => (
              <li key={schedule.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-semibold">{appliances.find(a => a.id === schedule.appliance_id)?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Action: {schedule.action}, Cron: {schedule.cron_expression}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Switch
                    checked={schedule.is_active}
                    onCheckedChange={(is_active) => updateScheduleMutation.mutate({ id: schedule.id, is_active })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => deleteScheduleMutation.mutate(schedule.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
