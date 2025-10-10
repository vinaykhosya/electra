import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
// --- THIS IMPORT PATH HAS BEEN RESTORED TO THE CORRECT ALIAS ---
import { supabase } from "@/lib/supabaseClient";

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
}

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizePassword = (value: string) => value.trim();
const translateAuthError = (message: string) => {
  if (/email not confirmed/i.test(message)) {
    return "Please confirm the verification link we sent to your inbox before signing in.";
  }
  if (/invalid login credentials/i.test(message)) {
    return "Email or password is incorrect, or the account hasn’t been verified yet.";
  }
  if (/user already registered/i.test(message)) {
    return "An account with this email already exists. Try signing in instead.";
  }
  return message;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (params: { email: string; password: string }) => Promise<{ error?: string }>;
  signUp: (
    params: { email: string; password: string; fullName: string }
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function ensureProfile(user: User, fullName?: string) {
  const now = new Date().toISOString();
  const upsert = await supabase
    .from("users")
    .upsert({
      id: user.id,
      full_name: fullName ?? user.user_metadata?.full_name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      updated_at: now,
    })
    .select()
    .single();

  if (upsert.error) {
    throw upsert.error;
  }

  const homes = await supabase
    .from("homes")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (homes.error) {
    throw homes.error;
  }

  if (!homes.data) {
    const homeInsert = await supabase
      .from("homes")
      .insert({ name: "Primary Residence", owner_id: user.id })
      .select("id")
      .single();

    if (homeInsert.error) {
      throw homeInsert.error;
    }

    const membership = await supabase.from("home_members").insert({
      home_id: homeInsert.data.id,
      user_id: user.id,
      role: "owner",
    });

    if (membership.error) {
      throw membership.error;
    }
  }

  return upsert.data as UserProfile;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(initialSession);
      setLoading(false);
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, avatar_url, updated_at")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("fetchProfile error", error);
        setLoading(false);
        return;
      }

      if (!data) {
        try {
          const created = await ensureProfile(session.user);
          if (!cancelled) {
            setProfile(created);
          }
        } catch (creationError) {
          console.error("ensureProfile error", creationError);
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
        return;
      }

      if (!cancelled) {
        setProfile(data as UserProfile);
        setLoading(false);
      }
    };

    void fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const signIn = useCallback<AuthContextValue["signIn"]>(async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password: normalizePassword(password),
    });
    if (error) {
      return { error: translateAuthError(error.message) };
    }
    return {};
  }, []);

  const signUp = useCallback<AuthContextValue["signUp"]>(async ({
    email,
    password,
    fullName,
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password: normalizePassword(password),
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      return { error: translateAuthError(error.message) };
    }

    const user = data.user;
    if (user) {
      try {
        const profileRecord = await ensureProfile(user, fullName);
        setProfile(profileRecord);
      } catch (profileError) {
        console.error("profile upsert failed", profileError);
        return {
          error:
            profileError instanceof Error
              ? profileError.message
              : "Unable to complete profile setup",
        };
      }
    }

    return {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [session, profile, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

