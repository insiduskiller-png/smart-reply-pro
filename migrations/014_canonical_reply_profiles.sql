-- Migration: Align reply_profiles table to canonical schema

ALTER TABLE public.reply_profiles
  DROP COLUMN IF EXISTS profile_name,
  DROP COLUMN IF EXISTS profile_category,
  DROP COLUMN IF EXISTS tone_pattern,
  DROP COLUMN IF EXISTS sentence_length,
  DROP COLUMN IF EXISTS directness_level,
  DROP COLUMN IF EXISTS emoji_usage,
  DROP COLUMN IF EXISTS formality_level,
  DROP COLUMN IF EXISTS conflict_style,
  DROP COLUMN IF EXISTS last_activity_at;

-- Rename style_summary to style_memory
ALTER TABLE public.reply_profiles
  RENAME COLUMN style_summary TO style_memory;

-- Add message_history field
ALTER TABLE public.reply_profiles
  ADD COLUMN IF NOT EXISTS message_history TEXT;

-- Ensure canonical fields are NOT NULL where required
ALTER TABLE public.reply_profiles
  ALTER COLUMN contact_name SET NOT NULL,
  ALTER COLUMN relationship_type SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- All app code now uses canonical fields only
