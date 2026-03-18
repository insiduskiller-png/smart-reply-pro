-- Add lightweight Profile Intelligence Engine (PIE) support to reply_profiles
-- Keep existing style_memory workflow as primary; these are additive fields only.

ALTER TABLE public.reply_profiles
  ADD COLUMN IF NOT EXISTS profile_summary TEXT,
  ADD COLUMN IF NOT EXISTS interaction_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS intelligence_model JSONB;

-- Backfill safe defaults for existing rows
UPDATE public.reply_profiles
SET interaction_count = COALESCE(interaction_count, 0)
WHERE interaction_count IS NULL;
