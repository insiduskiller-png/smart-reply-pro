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
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_ID",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_APP_URL",
] as const;

export function getEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }

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
    openAiApiKey: process.env.OPENAI_API_KEY!,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
    stripePriceId: process.env.STRIPE_PRICE_ID!,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    appUrl: process.env.NEXT_PUBLIC_APP_URL!,
  };
}
