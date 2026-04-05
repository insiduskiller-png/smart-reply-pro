import { supabaseService } from "@/lib/supabase";

export type BootstrapUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    username?: string | null;
    [key: string]: unknown;
  } | null;
};

export type UserProfileRecord = {
  id: string;
  email?: string | null;
  username?: string | null;
  subscription_status?: string | null;
  created_at?: string | null;
  username_color?: string | null;
  username_style?: string | null;
  [key: string]: unknown;
};

export type BootstrapProfileResult = {
  profile: UserProfileRecord;
  created: boolean;
  repaired: boolean;
};

type ProfileSeed = {
  id: string;
  email: string;
  username: string;
  subscription_status: "free";
  username_color: string;
  username_style: string;
};

type LogLevel = "info" | "warn" | "error";

const DEFAULT_USERNAME_COLOR = "#ffffff";
const DEFAULT_USERNAME_STYLE = "gradient";
const DEFAULT_SUBSCRIPTION_STATUS = "free";
const PROFILE_BOOTSTRAP_PREFIX = "[profile-bootstrap]";

function logProfileEvent(level: LogLevel, event: string, details: Record<string, unknown>) {
  const logger = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  logger(`${PROFILE_BOOTSTRAP_PREFIX} ${event}`, details);
}

function normalizeEmail(email?: string | null) {
  const value = String(email ?? "").trim().toLowerCase();
  return value || "noemail@user.invalid";
}

function normalizeUsername(rawValue: unknown, fallbackEmail: string, userId: string) {
  const preferred = String(rawValue ?? "").trim();
  const emailLocalPart = fallbackEmail.split("@")[0]?.trim() || "member";
  const candidate = preferred || emailLocalPart || `member-${userId.slice(0, 8)}`;
  return candidate.slice(0, 80);
}

function buildProfileSeed(user: BootstrapUser): ProfileSeed {
  const email = normalizeEmail(user.email);
  const username = normalizeUsername(user.user_metadata?.username, email, user.id);

  return {
    id: user.id,
    email,
    username,
    subscription_status: DEFAULT_SUBSCRIPTION_STATUS,
    username_color: DEFAULT_USERNAME_COLOR,
    username_style: DEFAULT_USERNAME_STYLE,
  };
}

function normalizeProfile(profile: UserProfileRecord, seed?: ProfileSeed): UserProfileRecord {
  return {
    ...profile,
    email: String(profile.email ?? seed?.email ?? "").trim() || seed?.email || null,
    username: String(profile.username ?? seed?.username ?? "").trim() || seed?.username || null,
    subscription_status: String(profile.subscription_status ?? DEFAULT_SUBSCRIPTION_STATUS).toLowerCase() || DEFAULT_SUBSCRIPTION_STATUS,
    username_color: String(profile.username_color ?? seed?.username_color ?? DEFAULT_USERNAME_COLOR) || DEFAULT_USERNAME_COLOR,
    username_style: String(profile.username_style ?? seed?.username_style ?? DEFAULT_USERNAME_STYLE) || DEFAULT_USERNAME_STYLE,
  };
}

function isMissingColumnError(error: { code?: string; message?: string; details?: string } | null | undefined) {
  if (!error) return false;
  return error.code === "42703" || `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase().includes("column");
}

async function readProfileRecord(userId: string, source: string) {
  const { data, error } = await supabaseService
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    logProfileEvent("error", "read-failed", { source, userId, code: error.code, message: error.message });
    throw error;
  }

  logProfileEvent("info", "read-complete", { source, userId, found: Boolean(data) });
  return (data as UserProfileRecord | null) ?? null;
}

async function updateProfileRepair(userId: string, updates: Partial<UserProfileRecord>, source: string) {
  if (Object.keys(updates).length === 0) {
    return null;
  }

  const { data, error } = await supabaseService
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select("*")
    .maybeSingle();

  if (error && isMissingColumnError(error)) {
    const fallbackUpdates = { ...updates };
    delete fallbackUpdates.username_color;
    delete fallbackUpdates.username_style;

    const fallback = await supabaseService
      .from("profiles")
      .update(fallbackUpdates)
      .eq("id", userId)
      .select("*")
      .maybeSingle();

    if (fallback.error) {
      logProfileEvent("error", "repair-failed", {
        source,
        userId,
        code: fallback.error.code,
        message: fallback.error.message,
      });
      throw fallback.error;
    }

    logProfileEvent("warn", "repair-fallback-applied", { source, userId, fields: Object.keys(fallbackUpdates) });
    return (fallback.data as UserProfileRecord | null) ?? null;
  }

  if (error) {
    logProfileEvent("error", "repair-failed", { source, userId, code: error.code, message: error.message });
    throw error;
  }

  logProfileEvent("info", "repair-complete", { source, userId, fields: Object.keys(updates) });
  return (data as UserProfileRecord | null) ?? null;
}

async function upsertProfileRecord(seed: ProfileSeed, source: string, attempt: number) {
  const fullPayload = {
    id: seed.id,
    email: seed.email,
    username: seed.username,
    subscription_status: seed.subscription_status,
    username_color: seed.username_color,
    username_style: seed.username_style,
  };

  const { data, error } = await supabaseService
    .from("profiles")
    .upsert(fullPayload, { onConflict: "id" })
    .select("*")
    .maybeSingle();

  if (!error) {
    logProfileEvent("info", "upsert-complete", { source, userId: seed.id, attempt, fallbackSchema: false });
    return (data as UserProfileRecord | null) ?? null;
  }

  if (!isMissingColumnError(error)) {
    logProfileEvent("warn", "upsert-failed", {
      source,
      userId: seed.id,
      attempt,
      code: error.code,
      message: error.message,
    });
    throw error;
  }

  const fallbackPayload = {
    id: seed.id,
    email: seed.email,
    username: seed.username,
    subscription_status: seed.subscription_status,
  };

  const fallback = await supabaseService
    .from("profiles")
    .upsert(fallbackPayload, { onConflict: "id" })
    .select("*")
    .maybeSingle();

  if (fallback.error) {
    logProfileEvent("error", "upsert-fallback-failed", {
      source,
      userId: seed.id,
      attempt,
      code: fallback.error.code,
      message: fallback.error.message,
    });
    throw fallback.error;
  }

  logProfileEvent("warn", "upsert-fallback-complete", { source, userId: seed.id, attempt, fallbackSchema: true });
  return (fallback.data as UserProfileRecord | null) ?? null;
}

function getRepairUpdates(profile: UserProfileRecord, seed: ProfileSeed) {
  const updates: Partial<UserProfileRecord> = {};

  if (!profile.email) updates.email = seed.email;
  if (!profile.username) updates.username = seed.username;
  if (!profile.subscription_status) updates.subscription_status = seed.subscription_status;
  if (!profile.username_color) updates.username_color = seed.username_color;
  if (!profile.username_style) updates.username_style = seed.username_style;

  return updates;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function bootstrapUserProfile(
  user: BootstrapUser,
  options?: { source?: string; maxAttempts?: number },
): Promise<BootstrapProfileResult> {
  const source = options?.source ?? "unknown";
  const maxAttempts = Math.max(1, options?.maxAttempts ?? 2);
  const seed = buildProfileSeed(user);

  logProfileEvent("info", "bootstrap-start", { source, userId: user.id, maxAttempts });

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const existing = await readProfileRecord(user.id, source);
      if (existing) {
        const normalizedExisting = normalizeProfile(existing, seed);
        const repairUpdates = getRepairUpdates(existing, seed);
        const repairedProfile = Object.keys(repairUpdates).length
          ? await updateProfileRepair(user.id, repairUpdates, source)
          : null;

        const profile = normalizeProfile(repairedProfile ?? normalizedExisting, seed);
        logProfileEvent("info", "bootstrap-success", {
          source,
          userId: user.id,
          attempt,
          created: false,
          repaired: Object.keys(repairUpdates).length > 0,
        });
        return {
          profile,
          created: false,
          repaired: Object.keys(repairUpdates).length > 0,
        };
      }

      const createdProfile = await upsertProfileRecord(seed, source, attempt);
      if (createdProfile) {
        const profile = normalizeProfile(createdProfile, seed);
        logProfileEvent("info", "bootstrap-success", {
          source,
          userId: user.id,
          attempt,
          created: true,
          repaired: false,
        });
        return {
          profile,
          created: true,
          repaired: false,
        };
      }

      const recovered = await readProfileRecord(user.id, source);
      if (recovered) {
        const profile = normalizeProfile(recovered, seed);
        logProfileEvent("warn", "bootstrap-recovered-after-empty-upsert", {
          source,
          userId: user.id,
          attempt,
        });
        return {
          profile,
          created: true,
          repaired: false,
        };
      }
    } catch (error) {
      logProfileEvent(attempt === maxAttempts ? "error" : "warn", "bootstrap-attempt-failed", {
        source,
        userId: user.id,
        attempt,
        message: error instanceof Error ? error.message : "Unknown bootstrap failure",
      });
    }

    if (attempt < maxAttempts) {
      await delay(150 * attempt);
    }
  }

  logProfileEvent("error", "bootstrap-exhausted", { source, userId: user.id, maxAttempts });
  throw new Error(`Unable to bootstrap profile for user ${user.id}`);
}

export async function updateBootstrappedUserProfile(
  user: BootstrapUser,
  updates: Partial<UserProfileRecord>,
  options?: { source?: string },
) {
  const source = options?.source ?? "unknown";
  const bootstrapped = await bootstrapUserProfile(user, { source: `${source}:ensure` });

  const profile = await updateProfileRepair(user.id, updates, source);
  if (profile) {
    return normalizeProfile(profile, buildProfileSeed(user));
  }

  const reloaded = await readProfileRecord(user.id, source);
  if (!reloaded) {
    return bootstrapped.profile;
  }

  return normalizeProfile(reloaded, buildProfileSeed(user));
}
