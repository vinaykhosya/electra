import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Mail, Shield, ShieldHalf, UserCog } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import {
  Appliance,
  listAppliancePermissions,
  listAppliances,
  listHomeMembers,
  setAppliancePermission,
} from "@/lib/api";
import { usePrimaryHome } from "@/hooks/usePrimaryHome";
import { supabase } from "@/lib/supabaseClient";

const APPLIANCES_QUERY_KEY = ["appliances"] as const;

export default function Settings() {
  const { user, profile, signOut } = useAuth();
  const { data: home } = usePrimaryHome();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");

  const appliancesQuery = useQuery({
    queryKey: APPLIANCES_QUERY_KEY,
    queryFn: listAppliances,
    enabled: Boolean(user),
  });

  const membersQuery = useQuery({
    queryKey: ["home-members", home?.homeId],
    queryFn: () => listHomeMembers(home!.homeId),
    enabled: Boolean(home?.homeId),
  });

  const permissionsQuery = useQuery({
    queryKey: ["appliance-permissions", home?.homeId],
    queryFn: () => listAppliancePermissions(home!.homeId),
    enabled: Boolean(home?.homeId),
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be logged in");
      const { error } = await supabase
        .from("users")
        .update({ full_name: fullName || null })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      toast({ title: "Profile updated" });
    },
    onError: (error) => {
      toast({
        title: "Unable to update profile",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const togglePermissionMutation = useMutation({
    mutationFn: ({
      home_member_id,
      appliance_id,
      enabled,
    }: {
      home_member_id: number;
      appliance_id: number;
      enabled: boolean;
    }) => setAppliancePermission(home_member_id, appliance_id, enabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["appliance-permissions", home?.homeId] });
      toast({ title: "Access rules saved" });
    },
    onError: (error) => {
      toast({
        title: "Unable to update access",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const appliances = appliancesQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const permissions = permissionsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Settings & parental controls</h1>
        <p className="text-sm text-muted-foreground">
          Update your identity, manage household roles, and determine which appliances kids can use.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCog className="h-5 w-5 text-primary" />
              Profile
            </CardTitle>
            <CardDescription>Control how ElectraWireless greets you and manages ownership.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full name</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {user?.email ?? "No email"}
              </p>
              <p>Primary role: {home?.role ?? "member"}</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending}>
                Save changes
              </Button>
              <Button variant="outline" onClick={() => signOut()}>
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              Home membership
            </CardTitle>
            <CardDescription>{home?.homeName ?? "Primary home"} roles and status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {members.length === 0 ? (
              <p className="text-muted-foreground">No household members yet. Invite family to collaborate.</p>
            ) : (
              members.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/60 p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {member.users?.full_name ?? member.users?.id ?? "Member"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.users?.id} • Role {member.role}
                    </p>
                  </div>
                  <Badge variant={member.role === "owner" ? "default" : "outline"}>
                    {member.role === "owner" ? "Owner" : "Member"}
                  </Badge>
                </div>
              ))
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                if (user?.email) navigator.clipboard.writeText(user.email).catch(() => undefined);
                toast({ title: "Invite link copied", description: "Share your email with support to onboard guardians." });
              }}
            >
              <Copy className="h-4 w-4" />
              Copy owner email
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/60 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldHalf className="h-5 w-5 text-primary" />
            Parental control matrix
          </CardTitle>
          <CardDescription>Grant or revoke appliance access for each member.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.length === 0 || appliances.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add household members and appliances to configure permissions.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-3 pr-4">Appliance</th>
                    {members.map((member) => (
                      <th key={member.id} className="py-3 px-4 text-center">
                        {member.users?.full_name ?? member.users?.id ?? "Member"}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appliances.map((appliance) => (
                    <PermissionRow
                      key={appliance.id}
                      appliance={appliance}
                      members={members}
                      permissions={permissions}
                      onToggle={(home_member_id, enabled) =>
                        togglePermissionMutation.mutate({
                          home_member_id,
                          appliance_id: appliance.id,
                          enabled,
                        })
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type PermissionRowProps = {
  appliance: Appliance;
  members: Awaited<ReturnType<typeof listHomeMembers>>;
  permissions: Awaited<ReturnType<typeof listAppliancePermissions>>;
  onToggle: (home_member_id: number, enabled: boolean) => void;
};

function PermissionRow({ appliance, members, permissions, onToggle }: PermissionRowProps) {
  const memberPermissions = permissions.filter((permission) => permission.appliance_id === appliance.id);

  return (
    <tr className="border-b border-border/40">
      <td className="py-3 pr-4 font-medium text-foreground">{appliance.name}</td>
      {members.map((member) => {
        const isOwner = member.role === "owner";
        const hasAccess = memberPermissions.some(
          (permission) => permission.home_member_id === member.id,
        );
        return (
          <td key={member.id} className="py-3 px-4 text-center">
            {isOwner ? (
              <Badge variant="outline" className="text-xs text-primary">
                Owner
              </Badge>
            ) : (
              <Switch
                checked={hasAccess}
                onCheckedChange={(checked) => onToggle(member.id, checked)}
              />
            )}
          </td>
        );
      })}
    </tr>
  );
}
