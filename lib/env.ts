function readRequired(keys: string[]) {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}

function readFromAliases(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return "";
}

export function getSupabaseEnv() {
  const supabaseUrl = readFromAliases("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = readFromAliases("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    throw new Error(
      "Missing environment variables: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY), SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceKey };
}

export function getOpenAiEnv() {
  readRequired(["OPENAI_API_KEY"]);
  return { openAiApiKey: process.env.OPENAI_API_KEY! };
}

export function getStripeCheckoutEnv() {
  readRequired(["STRIPE_SECRET_KEY", "STRIPE_PRICE_ID"]);
  return {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
    stripePriceId: process.env.STRIPE_PRICE_ID!,
  };
}

export function getStripeWebhookEnv() {
  readRequired(["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]);
  return {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  };
}

export function getSiteUrl() {
  const configured = readFromAliases("NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_APP_URL");
  const fallback = "http://localhost:3000";

  try {
    return new URL(configured || fallback).toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

export function validateProductionEnv() {
  getOpenAiEnv();
  getSupabaseEnv();
  getStripeCheckoutEnv();
  getStripeWebhookEnv();
}
