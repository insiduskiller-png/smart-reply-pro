function readRequired(keys: string[]) {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}

export function getSupabaseEnv() {
  const keys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  readRequired(keys);

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  };
}

export function getOpenAiEnv() {
  readRequired(["OPENAI_API_KEY"]);
  return { openAiApiKey: process.env.OPENAI_API_KEY! };
}

export function getStripeEnv() {
  const keys = [
    "STRIPE_SECRET_KEY",
    "STRIPE_PRICE_ID",
    "STRIPE_WEBHOOK_SECRET",
    "NEXT_PUBLIC_APP_URL",
  ];
  readRequired(keys);

  return {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
    stripePriceId: process.env.STRIPE_PRICE_ID!,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    appUrl: process.env.NEXT_PUBLIC_APP_URL!,
  };
}
