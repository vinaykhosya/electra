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

async function ensureProfile(user: User) {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) {
    const { data: profile, error } = await supabase
      .from("users")
      .insert({
        id: user.id,
        full_name: user.user_metadata?.full_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return profile as UserProfile;
  }
  return data as UserProfile;
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
    // We only call signUp and pass the fullName in the metadata.
    // The database trigger will automatically handle creating the profile.
    const { error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password: normalizePassword(password),
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      return { error: translateAuthError(error.message) };
    }

    // The manual profile creation is removed from here. It's all done on the backend now!
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

  return <AuthContext.Provider value={value}>{children}</Auth.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}