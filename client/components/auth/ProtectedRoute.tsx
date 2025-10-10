import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium">Verifying your secure Electra session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const redirect = `${location.pathname}${location.search}`;
    const encoded = encodeURIComponent(redirect);
    return <Navigate to={`/?redirect=${encoded}`} replace />;
  }

  return <Outlet />;
};
