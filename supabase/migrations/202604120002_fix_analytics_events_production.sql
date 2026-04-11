-- Migration 029: Production fix — create public.analytics_events with complete schema
-- Safe to run multiple times (fully idempotent).
-- Run this in the Supabase SQL Editor for the production project.

-- ─────────────────────────────────────────────
-- 1. Create table (no-op if already present)
-- ─────────────────────────────────────────────
-- NOTE: No FOREIGN KEY to profiles. Analytics events may arrive from
-- anonymous users. Making analytics dependent on user cleanup is incorrect.
-- user_id is nullable and intentionally unconstrained.
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id         BIGSERIAL                PRIMARY KEY,
  event      TEXT                     NOT NULL,
  user_id    UUID,
  metadata   JSONB,
  timestamp  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 2. Add any columns that may be missing
--    (no-op if column already exists)
-- ─────────────────────────────────────────────
ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS user_id    UUID,
  ADD COLUMN IF NOT EXISTS metadata   JSONB,
  ADD COLUMN IF NOT EXISTS timestamp  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ─────────────────────────────────────────────
-- 3. Indexes
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_analytics_event
  ON public.analytics_events (event);

CREATE INDEX IF NOT EXISTS idx_analytics_user_id
  ON public.analytics_events (user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_timestamp
  ON public.analytics_events (timestamp DESC);

-- ─────────────────────────────────────────────
-- 4. Row Level Security
-- ─────────────────────────────────────────────
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can INSERT (fire-and-forget client tracking, anon + authenticated)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'analytics_events'
      AND policyname = 'allow_insert_analytics_events'
  ) THEN
    CREATE POLICY allow_insert_analytics_events
      ON  public.analytics_events
      FOR INSERT
      TO  anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Service role (dashboards / internal reads) is unrestricted by RLS automatically.
-- No SELECT policy needed for anonymous users.

-- ─────────────────────────────────────────────
-- 5. Verification query (uncomment to run after migration)
-- ─────────────────────────────────────────────
-- SELECT column_name, data_type, is_nullable
-- FROM   information_schema.columns
-- WHERE  table_schema = 'public'
--   AND  table_name   = 'analytics_events'
-- ORDER  BY ordinal_position;
