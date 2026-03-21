"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { clearBrowserSession } from "@/lib/client-auth";
import {
  clearSessionPersistenceState,
  getStoredSessionMode,
  isTemporarySessionExpired,
  touchTemporarySessionActivity,
} from "@/lib/session-persistence";
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
  setProfileState: (nextProfile: AuthProfile | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizeProfile = useCallback((nextProfile: AuthProfile | null) => {
    if (!nextProfile) {
      return null;
    }

    return {
      ...nextProfile,
      username_color: nextProfile?.username_color || "#ffffff",
      username_style: nextProfile?.username_style || "gradient",
    };
  }, []);

  const setProfileState = useCallback((nextProfile: AuthProfile | null) => {
    setProfile(normalizeProfile(nextProfile));
  }, [normalizeProfile]);

  const fetchProfile = useCallback(async (userId: string) => {
    console.info("profile fetch started", { userId });

    try {
      const response = await fetch("/api/user/profile", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        setProfileState(null);
        console.info("profile fetch completed", { userId, ok: false, source: "api" });
        return;
      }

      const payload = await response.json().catch(() => null) as {
        profile?: AuthProfile & { id?: string };
      } | null;

      const nextProfile = payload?.profile;
      if (nextProfile?.id && nextProfile.id !== userId) {
        setProfileState(null);
        console.info("profile fetch completed", { userId, ok: false, source: "api", reason: "profile-id-mismatch" });
        return;
      }

      setProfileState(nextProfile ?? null);
      console.info("profile fetch completed", { userId, ok: true, source: "api" });
    } catch {
      setProfileState(null);
      console.info("profile fetch completed", { userId, ok: false, source: "api" });
    }
  }, [setProfileState]);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    await fetchProfile(user.id);
  }, [fetchProfile, user]);

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

  const expireTemporarySession = useCallback(async () => {
    setSession(null);
    setUser(null);
    setProfileState(null);
    await clearBrowserSession();

    if (typeof window === "undefined" || window.location.pathname.startsWith("/login")) {
      return;
    }

    router.replace("/login?expired=1");
  }, [router, setProfileState]);

  useEffect(() => {
    let mounted = true;

    async function initializeSession() {
      const {
        data: { session: currentSession },
      } = await supabaseBrowser.auth.getSession();

      if (!mounted) return;

      if (currentSession?.user && isTemporarySessionExpired()) {
        await expireTemporarySession();

        if (mounted) {
          setLoading(false);
        }
        return;
      }

      setSession(currentSession ?? null);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user?.id) {
        if (getStoredSessionMode() === "temporary") {
          touchTemporarySessionActivity();
        }

        void syncServerSession(currentSession.access_token);
        await fetchProfile(currentSession.user.id);
      } else {
        void syncServerSession();
        setProfileState(null);
      }

      setLoading(false);
    }

    initializeSession();

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange(async (event, nextSession) => {
      setLoading(true);

      if (nextSession?.user && isTemporarySessionExpired()) {
        await expireTemporarySession();

        if (mounted) {
          setLoading(false);
        }
        return;
      }

      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user?.id) {
        if (getStoredSessionMode() === "temporary") {
          touchTemporarySessionActivity();
        }

        void syncServerSession(nextSession.access_token);
        await fetchProfile(nextSession.user.id);
      } else {
        if (event === "SIGNED_OUT") {
          clearSessionPersistenceState();
        }

        void syncServerSession();
        setProfileState(null);
      }

      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [expireTemporarySession, fetchProfile, setProfileState, syncServerSession]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (isTemporarySessionExpired()) {
      window.setTimeout(() => {
        void expireTemporarySession();
      }, 0);
      return;
    }

    touchTemporarySessionActivity();
  }, [expireTemporarySession, pathname, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    function handleResume() {
      if (document.visibilityState === "hidden") {
        return;
      }

      if (isTemporarySessionExpired()) {
        void expireTemporarySession();
        return;
      }

      touchTemporarySessionActivity();
    }

    document.addEventListener("visibilitychange", handleResume);
    window.addEventListener("focus", handleResume);

    return () => {
      document.removeEventListener("visibilitychange", handleResume);
      window.removeEventListener("focus", handleResume);
    };
  }, [expireTemporarySession, user]);

  const value = useMemo(
    () => ({ session, user, profile, loading, refreshProfile, setProfileState }),
    [session, user, profile, loading, refreshProfile, setProfileState],
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
