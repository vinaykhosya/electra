import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Plug,
  BarChart3,
  BellRing,
  Settings,
  Menu,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { usePrimaryHome } from "@/hooks/usePrimaryHome";

const navigation = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Devices", to: "/devices", icon: Plug },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
  { label: "Notifications", to: "/notifications", icon: BellRing },
  { label: "Settings", to: "/settings", icon: Settings },
] as const;

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <nav className="mt-6 flex flex-1 flex-col gap-1">
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.to === "/devices"
            ? location.pathname.startsWith("/devices")
            : location.pathname === item.to;

        const navClass = cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
          "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive && "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm",
        );

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/dashboard"}
            onClick={onNavigate}
            className={navClass}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function DesktopSidebar() {
  const { profile } = useAuth();

  const { data: home } = usePrimaryHome();

  return (
    <aside className="relative hidden w-[280px] shrink-0 flex-col border-r border-border/30 bg-sidebar pb-6 pt-8 text-sidebar-foreground lg:flex">
      <div className="px-6">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/70">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sidebar-primary text-lg text-sidebar-primary-foreground">
            EW
          </span>
          ElectraWireless
        </div>
        <p className="mt-3 text-sm text-sidebar-foreground/60">
          {home?.homeName ? `${home.homeName} • ` : ""}Control, automate, and optimize every smart appliance from one hub.
        </p>
      </div>
      <NavItems />
      <div className="mt-auto px-6">
        <Separator className="mb-4 bg-sidebar-border" />
        <div className="flex items-center gap-3 rounded-2xl bg-sidebar-accent p-4 text-sidebar-accent-foreground">
          <Avatar className="h-10 w-10">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? "Electra user"} />
            ) : null}
            <AvatarFallback>
              {profile?.full_name
                ?.split(" ")
                .map((chunk) => chunk[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "EW"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col">
            <span className="text-sm font-semibold">
              {profile?.full_name ?? "New Resident"}
            </span>
            <span className="text-xs text-sidebar-accent-foreground/70">
              Primary Home Owner
            </span>
          </div>
          <Badge variant="secondary" className="bg-sidebar-primary text-sidebar-primary-foreground">
            Live
          </Badge>
        </div>
      </div>
    </aside>
  );
}

export const AppShell = () => {
  const { profile, user, signOut } = useAuth();
  const { data: home } = usePrimaryHome();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = useMemo(() => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((chunk) => chunk[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "EW";
  }, [profile?.full_name, user?.email]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-secondary/40 to-background">
      <DesktopSidebar />
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[280px] border-r border-border/30 bg-sidebar px-6 pt-8 text-sidebar-foreground"
        >
          <div className="flex items-center gap-2 text-base font-semibold text-sidebar-foreground">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sidebar-primary text-lg text-sidebar-primary-foreground">
              EW
            </span>
            ElectraWireless
          </div>
          <NavItems onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-border/50 bg-card/70 px-5 py-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open navigation</span>
                </Button>
              </SheetTrigger>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                  {home?.homeName ?? "ElectraWireless"}
                </p>
                <h1 className="text-lg font-semibold text-foreground">Smart Home Control Center</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-semibold text-foreground">
                  {profile?.full_name ?? "New Resident"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date().toLocaleString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    weekday: "short",
                  })}
                </span>
              </div>
              <Avatar className="h-10 w-10 border border-border/50">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? "Electra user"} />
                ) : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="flex flex-1 flex-col overflow-y-auto px-5 pb-10 pt-6 lg:px-10">
            <Outlet />
          </main>
          <footer className="border-t border-border/50 bg-card/60 px-5 py-4 text-sm text-muted-foreground lg:px-10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Connected to <strong>{home?.homeName ?? "Electra Cloud"}</strong> • {user?.email ?? "No email on file"}
              </span>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Sign out
              </Button>
            </div>
          </footer>
        </div>
      </Sheet>
    </div>
  );
};
