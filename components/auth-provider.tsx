"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase-browser";

type AuthProfile = {
  username?: string | null;
  subscription_status?: string | null;
  username_color?: string | null;
  username_style?: string | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    console.info("profile fetch started", { userId });

    try {
      const response = await fetch("/api/user/profile", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        setProfile(null);
        console.info("profile fetch completed", { userId, ok: false, source: "api" });
        return;
      }

      const payload = await response.json().catch(() => null) as {
        profile?: AuthProfile & { id?: string };
      } | null;

      const nextProfile = payload?.profile;
      if (nextProfile?.id && nextProfile.id !== userId) {
        setProfile(null);
        console.info("profile fetch completed", { userId, ok: false, source: "api", reason: "profile-id-mismatch" });
        return;
      }

      setProfile({
        ...(nextProfile ?? {}),
        username_color: nextProfile?.username_color || "#ffffff",
        username_style: nextProfile?.username_style || "gradient",
      });
      console.info("profile fetch completed", { userId, ok: true, source: "api" });
    } catch {
      setProfile(null);
      console.info("profile fetch completed", { userId, ok: false, source: "api" });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    await fetchProfile(user.id);
  }, [fetchProfile, user?.id]);

  const syncServerSession = useCallback(async (accessToken?: string) => {
    if (!accessToken) {
      await fetch("/api/auth/session", { method: "DELETE" });
      return;
    }

    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initializeSession() {
      const {
        data: { session: currentSession },
      } = await supabaseBrowser.auth.getSession();

      if (!mounted) return;

      setSession(currentSession ?? null);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user?.id) {
        void syncServerSession(currentSession.access_token);
        await fetchProfile(currentSession.user.id);
      } else {
        void syncServerSession();
        setProfile(null);
      }

      setLoading(false);
    }

    initializeSession();

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange(async (_event, nextSession) => {
      setLoading(true);
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user?.id) {
        void syncServerSession(nextSession.access_token);
        await fetchProfile(nextSession.user.id);
      } else {
        void syncServerSession();
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, syncServerSession]);

  const value = useMemo(
    () => ({ session, user, profile, loading, refreshProfile }),
    [session, user, profile, loading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
