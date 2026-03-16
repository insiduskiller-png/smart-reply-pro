-- Migration: Drop profile_name column from reply_profiles and standardize on contact_name

ALTER TABLE public.reply_profiles
  DROP COLUMN IF EXISTS profile_name;

-- Ensure contact_name is NOT NULL
ALTER TABLE public.reply_profiles
  ALTER COLUMN contact_name SET NOT NULL;

-- Optionally, update any code or triggers that reference profile_name
-- All app code now uses contact_name only
