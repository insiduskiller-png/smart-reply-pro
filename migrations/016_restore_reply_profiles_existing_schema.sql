-- Restore reply_profiles to the existing schema used in production code
-- Target schema fields:
-- id, user_id, profile_name, category, context_notes, style_memory, created_at

-- 1) Ensure expected columns exist
ALTER TABLE public.reply_profiles
  ADD COLUMN IF NOT EXISTS profile_name TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS context_notes TEXT,
  ADD COLUMN IF NOT EXISTS style_memory TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2) Backfill from alternate column names if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reply_profiles'
      AND column_name = 'contact_name'
  ) THEN
    UPDATE public.reply_profiles
    SET profile_name = COALESCE(profile_name, contact_name)
    WHERE contact_name IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reply_profiles'
      AND column_name = 'relationship_type'
  ) THEN
    UPDATE public.reply_profiles
    SET category = COALESCE(category, relationship_type)
    WHERE relationship_type IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reply_profiles'
      AND column_name = 'style_summary'
  ) THEN
    UPDATE public.reply_profiles
    SET style_memory = COALESCE(style_memory, style_summary)
    WHERE style_summary IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reply_profiles'
      AND column_name = 'message_history'
  ) THEN
    UPDATE public.reply_profiles
    SET style_memory = COALESCE(style_memory, message_history)
    WHERE message_history IS NOT NULL;
  END IF;
END $$;

-- 3) Enforce required fields
ALTER TABLE public.reply_profiles
  ALTER COLUMN profile_name SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

-- 4) Drop columns that are not part of the existing schema
ALTER TABLE public.reply_profiles
  DROP COLUMN IF EXISTS contact_name,
  DROP COLUMN IF EXISTS relationship_type,
  DROP COLUMN IF EXISTS style_summary,
  DROP COLUMN IF EXISTS message_history,
  DROP COLUMN IF EXISTS updated_at;
