-- Migration 028: Production fix — create public.pro_waitlist with complete schema
-- Safe to run multiple times (fully idempotent).
-- Run this in the Supabase SQL Editor for the production project.

-- ─────────────────────────────────────────────
-- 1. Extension (no-op if already present)
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────
-- 2. Create table (no-op if already present)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pro_waitlist (
  id                        UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  email                     TEXT                     NOT NULL,
  note                      TEXT,
  source_page               TEXT                     NOT NULL DEFAULT 'unknown',
  user_id                   UUID,
  subscription_status       TEXT,
  email_notification_status TEXT                     NOT NULL DEFAULT 'pending',
  email_notification_error  TEXT,
  email_notified_at         TIMESTAMP WITH TIME ZONE,
  created_at                TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

-- ─────────────────────────────────────────────
-- 3. Add any columns that may be missing
--    (no-op if column already exists)
-- ─────────────────────────────────────────────
ALTER TABLE public.pro_waitlist
  ADD COLUMN IF NOT EXISTS user_id                   UUID,
  ADD COLUMN IF NOT EXISTS subscription_status       TEXT,
  ADD COLUMN IF NOT EXISTS email_notification_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS email_notification_error  TEXT,
  ADD COLUMN IF NOT EXISTS email_notified_at         TIMESTAMP WITH TIME ZONE;

-- ─────────────────────────────────────────────
-- 4. Indexes
-- ─────────────────────────────────────────────
-- Unique case-insensitive email index (enforces one entry per email)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pro_waitlist_email_unique
  ON public.pro_waitlist (lower(email));

CREATE INDEX IF NOT EXISTS idx_pro_waitlist_created_at
  ON public.pro_waitlist (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pro_waitlist_source_page
  ON public.pro_waitlist (source_page);

CREATE INDEX IF NOT EXISTS idx_pro_waitlist_user_id
  ON public.pro_waitlist (user_id);

CREATE INDEX IF NOT EXISTS idx_pro_waitlist_notification_status
  ON public.pro_waitlist (email_notification_status);

-- ─────────────────────────────────────────────
-- 5. Row Level Security
-- ─────────────────────────────────────────────
-- Enable RLS (no-op if already enabled)
ALTER TABLE public.pro_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anon / authenticated users to INSERT (used by the Next.js backend
-- when the service role key is not yet available, and as a safety net).
-- Note: service_role bypasses RLS entirely; no separate policy needed for it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_policies
    WHERE  schemaname = 'public'
      AND  tablename  = 'pro_waitlist'
      AND  policyname = 'allow_anon_insert_pro_waitlist'
  ) THEN
    CREATE POLICY allow_anon_insert_pro_waitlist
      ON  public.pro_waitlist
      FOR INSERT
      TO  anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 6. Verification query
--    Run this after the migration to confirm the table exists.
-- ─────────────────────────────────────────────
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM   information_schema.columns
-- WHERE  table_schema = 'public'
--   AND  table_name   = 'pro_waitlist'
-- ORDER  BY ordinal_position;
