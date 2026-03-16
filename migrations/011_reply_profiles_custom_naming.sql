-- Make Reply Profiles fully user-named and optionally categorized

ALTER TABLE public.reply_profiles
  ADD COLUMN IF NOT EXISTS profile_name TEXT,
  ADD COLUMN IF NOT EXISTS profile_category TEXT;

UPDATE public.reply_profiles
SET profile_name = contact_name
WHERE profile_name IS NULL;

ALTER TABLE public.reply_profiles
  ALTER COLUMN profile_name SET NOT NULL;

ALTER TABLE public.reply_profiles
  ALTER COLUMN relationship_type DROP NOT NULL;
