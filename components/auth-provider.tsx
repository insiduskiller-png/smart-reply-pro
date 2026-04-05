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
  id?: string;
  username?: string | null;
  subscription_status?: string | null;
  username_color?: string | null;
  username_style?: string | null;
};

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type SessionBootstrapPayload = {
  user?: User | null;
  profile?: AuthProfile | null;
  bootstrapDeferred?: boolean;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  authStatus: AuthStatus;
  refreshProfile: () => Promise<void>;
  setProfileState: (nextProfile: AuthProfile | null) => void;
  establishAuthenticatedSession: (params: {
    user: User;
    profile?: AuthProfile | null;
    sessionToken?: string;
    refreshToken?: string;
  }) => Promise<void>;
  logout: (redirectPath?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");

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

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch("/api/user/profile", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          console.info("profile fetch attempt failed", { userId, attempt, status: response.status });
        } else {
          const payload = await response.json().catch(() => null) as {
            profile?: AuthProfile & { id?: string };
          } | null;

          const nextProfile = payload?.profile;
          if (nextProfile?.id && nextProfile.id !== userId) {
            console.info("profile fetch completed", { userId, ok: false, source: "api", reason: "profile-id-mismatch", attempt });
            break;
          }

          if (nextProfile) {
            setProfileState(nextProfile);
            console.info("profile fetch completed", { userId, ok: true, source: "api", attempt });
            return nextProfile;
          }
        }
      } catch {
        console.info("profile fetch attempt threw", { userId, attempt, source: "api" });
      }

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
      }
    }

    setProfileState(null);
    console.info("profile fetch completed", { userId, ok: false, source: "api", exhausted: true });
    return null;
  }, [setProfileState]);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    await fetchProfile(user.id);
  }, [fetchProfile, user]);

  const getServerUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        return null;
      }

      const payload = await response.json().catch(() => null) as { user?: User | null } | null;
      return payload?.user ?? null;
    } catch {
      return null;
    }
  }, []);

  const syncServerSession = useCallback(async (accessToken?: string) => {
    if (!accessToken) {
      await fetch("/api/auth/session", { method: "DELETE" });
      return null;
    }

    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });

    if (!response.ok) {
      console.info("auth session sync failed", { status: response.status });
      return null;
    }

    return await response.json().catch(() => null) as SessionBootstrapPayload | null;
  }, []);

  const establishAuthenticatedSession = useCallback(async (params: {
    user: User;
    profile?: AuthProfile | null;
    sessionToken?: string;
    refreshToken?: string;
  }) => {
    setAuthStatus("authenticated");
    setUser(params.user);
    setProfileState(params.profile ?? null);

    if (params.sessionToken && params.refreshToken) {
      const result = await supabaseBrowser.auth.setSession({
        access_token: params.sessionToken,
        refresh_token: params.refreshToken,
      }).catch(() => null);

      if (result?.data?.session) {
        setSession(result.data.session);
        setUser(result.data.session.user);
      }
    }

    setLoading(false);
  }, [setProfileState]);

  const logout = useCallback(async (redirectPath = "/") => {
    setSession(null);
    setUser(null);
    setProfileState(null);
    setAuthStatus("unauthenticated");
    setLoading(false);

    try {
      await clearBrowserSession();
    } finally {
      if (typeof window !== "undefined") {
        window.location.assign(redirectPath);
      }
    }
  }, [setProfileState]);

  const expireTemporarySession = useCallback(async () => {
    setSession(null);
    setUser(null);
    setProfileState(null);
    setAuthStatus("unauthenticated");
    await clearBrowserSession();

    if (typeof window === "undefined" || window.location.pathname.startsWith("/login")) {
      return;
    }

    router.replace("/login?expired=1");
  }, [router, setProfileState]);

  useEffect(() => {
    let mounted = true;

    async function initializeSession() {
      setLoading(true);
      setAuthStatus("loading");

      const [serverUser, browserSessionResult] = await Promise.all([
        getServerUser(),
        supabaseBrowser.auth.getSession().catch(() => ({ data: { session: null } })),
      ]);

      const {
        data: { session: currentSession },
      } = browserSessionResult;

      if (!mounted) return;

      if (currentSession?.user && isTemporarySessionExpired()) {
        await expireTemporarySession();

        if (mounted) {
          setLoading(false);
        }
        return;
      }

      setSession(currentSession ?? null);

      if (currentSession?.user?.id) {
        setUser(currentSession.user);
        setAuthStatus("authenticated");
        if (getStoredSessionMode() === "temporary") {
          touchTemporarySessionActivity();
        }

        const bootstrap = await syncServerSession(currentSession.access_token);
        if (bootstrap?.profile) {
          setProfileState(bootstrap.profile);
        } else {
          await fetchProfile(currentSession.user.id);
        }
      } else if (serverUser?.id) {
        setUser(serverUser);
        setAuthStatus("authenticated");
        await fetchProfile(serverUser.id);
      } else {
        setUser(null);
        setProfileState(null);
        setAuthStatus("unauthenticated");
        void syncServerSession();
      }

      setLoading(false);
    }

    initializeSession();

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange(async (event, nextSession) => {
      setLoading(Boolean(nextSession?.user));
      setAuthStatus(nextSession?.user ? "authenticated" : "loading");

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
        setAuthStatus("authenticated");
        if (getStoredSessionMode() === "temporary") {
          touchTemporarySessionActivity();
        }

        const bootstrap = await syncServerSession(nextSession.access_token);
        if (bootstrap?.profile) {
          setProfileState(bootstrap.profile);
        } else {
          await fetchProfile(nextSession.user.id);
        }
      } else {
        if (event === "SIGNED_OUT") {
          clearSessionPersistenceState();
        }

        void syncServerSession();
        setProfileState(null);
        setAuthStatus("unauthenticated");
        setLoading(false);
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
    () => ({
      session,
      user,
      profile,
      loading,
      authStatus,
      refreshProfile,
      setProfileState,
      establishAuthenticatedSession,
      logout,
    }),
    [session, user, profile, loading, authStatus, refreshProfile, setProfileState, establishAuthenticatedSession, logout],
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
