-- Migration: realign reply_profiles to canonical schema after prior mixed migrations
-- Canonical: id, user_id, contact_name, relationship_type, context_notes,
--            style_summary, message_history, created_at, updated_at

-- Ensure canonical columns exist
ALTER TABLE public.reply_profiles
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS relationship_type TEXT,
  ADD COLUMN IF NOT EXISTS context_notes TEXT,
  ADD COLUMN IF NOT EXISTS style_summary TEXT,
  ADD COLUMN IF NOT EXISTS message_history TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Recover style_summary if an older migration introduced style_memory
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reply_profiles'
      AND column_name = 'style_memory'
  ) THEN
    UPDATE public.reply_profiles
    SET style_summary = COALESCE(style_summary, style_memory)
    WHERE style_memory IS NOT NULL;

    ALTER TABLE public.reply_profiles
      DROP COLUMN IF EXISTS style_memory;
  END IF;
END $$;

-- Backfill canonical values from legacy columns, when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reply_profiles'
      AND column_name = 'profile_name'
  ) THEN
    UPDATE public.reply_profiles
    SET contact_name = COALESCE(contact_name, profile_name)
    WHERE profile_name IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reply_profiles'
      AND column_name = 'category'
  ) THEN
    UPDATE public.reply_profiles
    SET relationship_type = COALESCE(relationship_type, category)
    WHERE category IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reply_profiles'
      AND column_name = 'profile_category'
  ) THEN
    UPDATE public.reply_profiles
    SET relationship_type = COALESCE(relationship_type, profile_category)
    WHERE profile_category IS NOT NULL;
  END IF;
END $$;

-- Drop legacy/duplicate columns
ALTER TABLE public.reply_profiles
  DROP COLUMN IF EXISTS profile_name,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS profile_category,
  DROP COLUMN IF EXISTS tone_pattern,
  DROP COLUMN IF EXISTS sentence_length,
  DROP COLUMN IF EXISTS directness_level,
  DROP COLUMN IF EXISTS emoji_usage,
  DROP COLUMN IF EXISTS formality_level,
  DROP COLUMN IF EXISTS conflict_style,
  DROP COLUMN IF EXISTS last_activity_at;

-- Final defaults and constraints
UPDATE public.reply_profiles
SET relationship_type = 'Other'
WHERE relationship_type IS NULL;

ALTER TABLE public.reply_profiles
  ALTER COLUMN contact_name SET NOT NULL,
  ALTER COLUMN relationship_type SET NOT NULL,
  ALTER COLUMN relationship_type SET DEFAULT 'Other',
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;
