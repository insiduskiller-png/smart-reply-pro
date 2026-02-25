# Smart Reply Pro

Premium SaaS app built with Next.js App Router, TypeScript, TailwindCSS, Supabase, Stripe, and OpenAI.

## Features
- Supabase email/password login
- Protected dashboard with middleware gate
- AI reply generation with strategic system prompt
- Free vs Pro quotas (5/day for free)
- Pro-only power score analysis
- Pro-only multi-variant generation + escalate/de-escalate rewrites
- Stripe Checkout + webhook subscription updates
- Rate-limited API endpoints

## Project Structure
```
app/
  login/
  dashboard/
  pricing/
  api/
    generate/
    power-score/
    webhook/
  layout.tsx
  page.tsx
```

## 1) Supabase Setup
1. Create a Supabase project.
2. Add these tables in SQL editor:

```sql
create table if not exists users (
  id uuid primary key,
  email text not null unique,
  stripe_customer_id text,
  subscription_status text not null default 'free',
  daily_usage_count int not null default 0,
  last_usage_reset timestamptz not null default now()
);

create table if not exists generations (
  id bigint generated always as identity primary key,
  user_id uuid not null references users(id) on delete cascade,
  input_text text not null,
  style text not null,
  generated_output text not null,
  created_at timestamptz not null default now()
);
```
3. Enable Email auth in Supabase Auth settings.
4. Copy project URL, anon key, and service role key.

## 2) Stripe Setup
1. Create a product priced at **€12/month** and copy `price_...` id.
2. Configure checkout and webhook endpoint: `https://your-domain.com/api/webhook`.
3. Copy Stripe secret key and webhook signing secret.

## 3) OpenAI Setup
1. Create an OpenAI API key.
2. Add it to environment variables.

## 4) Local Development
1. Create `.env.local`:

```bash
# Required (production-safe)
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=

# Optional aliases accepted by this app
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

2. Install deps and run:

```bash
npm install
npm run dev
```

## 5) Vercel Deploy
1. Push to GitHub and import project in Vercel.
2. Add all environment variables in Vercel settings.
3. Set Stripe webhook to deployed `/api/webhook` URL.
4. Deploy.

