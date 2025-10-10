import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleCheck,
  CirclePower,
  Filter,
  Lightbulb,
  Plus,
  Power,
  ShieldCheck,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import {
  Appliance,
  listAppliances,
  listHomes,
  toggleApplianceStatus,
} from "@/lib/api";
import { usePrimaryHome } from "@/hooks/usePrimaryHome";

const APPLIANCES_QUERY_KEY = ["appliances"] as const;
const HOMES_QUERY_KEY = ["homes"] as const;

export default function Devices() {
  const { session } = useAuth();
  const { data: home } = usePrimaryHome();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");

  const appliancesQuery = useQuery({
    queryKey: APPLIANCES_QUERY_KEY,
    queryFn: listAppliances,
    enabled: Boolean(session?.user),
  });

  const homesQuery = useQuery({
    queryKey: HOMES_QUERY_KEY,
    queryFn: listHomes,
    enabled: Boolean(session?.user),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "on" | "off" }) =>
      toggleApplianceStatus(session!.access_token!, id, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: APPLIANCES_QUERY_KEY });
      toast({ title: "Device toggled" });
    },
    onError: (error) => {
      toast({
        title: "We couldn't reach that device",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!newDeviceName.trim()) {
        throw new Error("Device name is required");
      }

      const selectedHomeId = home?.homeId ?? homesQuery.data?.[0]?.id;
      if (!selectedHomeId) {
        throw new Error("Please create a home before adding devices");
      }

      const { error } = await supabaseInsertAppliance({
        name: newDeviceName.trim(),
        home_id: selectedHomeId,
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      setAddDialogOpen(false);
      setNewDeviceName("");
      toast({ title: "Appliance added", description: "Assign permissions from Settings to keep it safe." });
      void queryClient.invalidateQueries({ queryKey: APPLIANCES_QUERY_KEY });
    },
    onError: (error) => {
      toast({
        title: "Unable to add appliance",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const appliances = appliancesQuery.data ?? [];

  const onDevices = useMemo(
    () => appliances.filter((device) => device.status === "on"),
    [appliances],
  );
  const offDevices = useMemo(
    () => appliances.filter((device) => device.status === "off"),
    [appliances],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Devices</h1>
          <p className="text-sm text-muted-foreground">
            Every appliance enrolled in your {home?.homeName ?? "Electra"} home. Toggle, automate, and secure access.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link to="/analytics">
              <Filter className="h-4 w-4" />
              Analyze usage
            </Link>
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add appliance
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Register a new appliance</DialogTitle>
                <DialogDescription>
                  Smart outlets, lighting, HVAC, and more. Owners can later delegate access via parental controls.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="device-name">Device name</Label>
                  <Input
                    id="device-name"
                    placeholder="Living room air purifier"
                    value={newDeviceName}
                    onChange={(event) => setNewDeviceName(event.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                  className="gap-2"
                >
                  <CircleCheck className="h-4 w-4" />
                  Save appliance
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="on">Running</TabsTrigger>
          <TabsTrigger value="off">Standby</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
          <DeviceGrid
            devices={appliances}
            emptyMessage="No appliances yet. Add your first device to start monitoring."
            onToggle={(appliance, status) => toggleMutation.mutate({ id: appliance.id, status })}
            loading={toggleMutation.isPending}
          />
        </TabsContent>
        <TabsContent value="on" className="mt-6">
          <DeviceGrid
            devices={onDevices}
            emptyMessage="Nothing is drawing power right now."
            onToggle={(appliance, status) => toggleMutation.mutate({ id: appliance.id, status })}
            loading={toggleMutation.isPending}
          />
        </TabsContent>
        <TabsContent value="off" className="mt-6">
          <DeviceGrid
            devices={offDevices}
            emptyMessage="No devices are idle currently."
            onToggle={(appliance, status) => toggleMutation.mutate({ id: appliance.id, status })}
            loading={toggleMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type DeviceGridProps = {
  devices: Appliance[];
  emptyMessage: string;
  loading: boolean;
  onToggle: (device: Appliance, status: "on" | "off") => void;
};

function DeviceGrid({ devices, emptyMessage, loading, onToggle }: DeviceGridProps) {
  if (devices.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {devices.map((device) => (
        <DeviceTile
          key={device.id}
          appliance={device}
          loading={loading}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

type DeviceTileProps = {
  appliance: Appliance;
  loading: boolean;
  onToggle: (device: Appliance, status: "on" | "off") => void;
};

function DeviceTile({ appliance, loading, onToggle }: DeviceTileProps) {
  const isOn = appliance.status === "on";
  const icon = isOn ? Power : Lightbulb;

  return (
    <Card className="group flex h-full flex-col border-border/60 bg-card/80 backdrop-blur">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg font-semibold text-foreground">
            {appliance.name}
          </CardTitle>
          <CardDescription>
            {isOn ? "Active" : "Standby"} • {new Date(appliance.created_at ?? Date.now()).toLocaleDateString()}
          </CardDescription>
        </div>
        <Badge variant={isOn ? "default" : "outline"} className="gap-1">
          <CirclePower className="h-3 w-3" />
          {isOn ? "On" : "Off"}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/60 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon === Power ? <Power className="h-5 w-5" /> : <Lightbulb className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{isOn ? "Live draw" : "Baseline"}</p>
            <p className="text-xs text-muted-foreground">{appliance.power_usage ?? 0} watts</p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/40 p-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Automation</p>
            <p className="text-sm font-medium text-foreground">Follow home schedules</p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            Safe
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/devices/${appliance.id}`}>View details</Link>
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{isOn ? "On" : "Off"}</span>
          <Switch
            checked={isOn}
            disabled={loading}
            onCheckedChange={(checked) => onToggle(appliance, checked ? "on" : "off")}
          />
        </div>
      </CardFooter>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="border-dashed border-border/60 bg-card/60 p-10 text-center text-sm text-muted-foreground">
      <p>{message}</p>
    </Card>
  );
}

type InsertApplianceInput = {
  name: string;
  home_id: number;
};

async function supabaseInsertAppliance({ name, home_id }: InsertApplianceInput) {
  const { supabase } = await import("@/lib/supabaseClient");
  return supabase.from("appliances").insert({ name, home_id });
}
