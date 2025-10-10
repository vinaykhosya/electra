import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";

export type PrimaryHome = {
  membershipId: number;
  homeId: number;
  homeName: string;
  role: string;
};

export const PRIMARY_HOME_QUERY_KEY = "primary-home";

export function usePrimaryHome() {
  const { user } = useAuth();

  return useQuery<PrimaryHome | null>({
    queryKey: [PRIMARY_HOME_QUERY_KEY, user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) {
        return null;
      }

      const { data, error } = await supabase
        .from("home_members")
        .select(
          "id, role, home_id, homes:home_id ( id, name, owner_id )",
        )
        .eq("user_id", user.id)
        .order("role", { ascending: true })
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return null;
      }

      const homeRecord = Array.isArray(data.homes) ? data.homes[0] ?? null : data.homes ?? null;

      return {
        membershipId: data.id,
        homeId: data.home_id,
        homeName: homeRecord?.name ?? "",
        role: data.role,
      } satisfies PrimaryHome;
    },
  });
}
