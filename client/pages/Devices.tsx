import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CirclePower,
  Filter,
  Lightbulb,
  Power,
  ShieldCheck,
  Trash2,
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/lib/api";
import {
  Appliance,
  listAppliances,
  toggleApplianceStatus,
} from "@/lib/api";
import { usePrimaryHome } from "@/hooks/usePrimaryHome";
import { DeleteWithPinModal } from "@/components/DeleteWithPinModal";

const APPLIANCES_QUERY_KEY = ["appliances"] as const;

export default function Devices() {
  const { session } = useAuth();
  const { data: home } = usePrimaryHome();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deviceToDelete, setDeviceToDelete] = useState<Appliance | null>(null);

  const appliancesQuery = useQuery({
    queryKey: APPLIANCES_QUERY_KEY,
    queryFn: listAppliances,
    enabled: Boolean(session?.user),
  });

  console.log("Appliances:", appliancesQuery.data);
  console.log("Error:", appliancesQuery.error);

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

  const appliances = appliancesQuery.data ?? [];

  const onDevices = useMemo(
    () => appliances.filter((device) => device.status === "on"),
    [appliances],
  );
  const offDevices = useMemo(
    () => appliances.filter((device) => device.status === "off"),
    [appliances],
  );

  const handleDelete = (device: Appliance) => {
    setDeviceToDelete(device);
  };

  const handleConfirmDelete = async (pin: string) => {
    if (!deviceToDelete) {
      throw new Error('No device selected');
    }

    const response = await api.post<{ success: boolean }>(
      `/api/v2/devices/${deviceToDelete.id}/delete-with-pin`,
      {
        security_pin: pin,
      }
    );

    if (response.success) {
      toast({
        title: 'Device Deleted',
        description: `${deviceToDelete.name} has been removed`,
      });
      await queryClient.invalidateQueries({ queryKey: APPLIANCES_QUERY_KEY });
      setDeviceToDelete(null);
    } else {
      throw new Error('Failed to delete device');
    }
  };

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
            onDelete={handleDelete}
            loading={toggleMutation.isPending}
          />
        </TabsContent>
        <TabsContent value="on" className="mt-6">
          <DeviceGrid
            devices={onDevices}
            emptyMessage="Nothing is drawing power right now."
            onToggle={(appliance, status) => toggleMutation.mutate({ id: appliance.id, status })}
            onDelete={handleDelete}
            loading={toggleMutation.isPending}
          />
        </TabsContent>
        <TabsContent value="off" className="mt-6">
          <DeviceGrid
            devices={offDevices}
            emptyMessage="No devices are idle currently."
            onToggle={(appliance, status) => toggleMutation.mutate({ id: appliance.id, status })}
            onDelete={handleDelete}
            loading={toggleMutation.isPending}
          />
        </TabsContent>
      </Tabs>

      <DeleteWithPinModal
        open={deviceToDelete !== null}
        onOpenChange={() => setDeviceToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Device"
        description="This action cannot be undone. The device will be permanently removed from your home."
        deviceName={deviceToDelete?.name}
      />
    </div>
  );
}

type DeviceGridProps = {
  devices: Appliance[];
  emptyMessage: string;
  loading: boolean;
  onToggle: (device: Appliance, status: "on" | "off") => void;
  onDelete: (device: Appliance) => void;
};

function DeviceGrid({ devices, emptyMessage, loading, onToggle, onDelete }: DeviceGridProps) {
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
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

type DeviceTileProps = {
  appliance: Appliance;
  loading: boolean;
  onToggle: (device: Appliance, status: "on" | "off") => void;
  onDelete: (device: Appliance) => void;
};

function DeviceTile({ appliance, loading, onToggle, onDelete }: DeviceTileProps) {
  const isOn = appliance.status === "on";
  const icon = isOn ? Power : Lightbulb;

  const formatUsage = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <Card className="group flex h-full flex-col border-border/60 bg-card/80 backdrop-blur">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg font-semibold text-foreground">
            {appliance.name}
          </CardTitle>
          <CardDescription>
            {isOn ? "Active" : "Standby"} • Registered: {new Date(appliance.created_at ?? Date.now()).toLocaleDateString()}
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
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Usage</p>
            <p className="text-sm font-medium text-foreground">{formatUsage(appliance.total_usage_ms || 0)}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/devices/${appliance.id}`}>View details</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(appliance)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
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