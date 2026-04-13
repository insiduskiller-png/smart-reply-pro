-- Migration: Fix usernames that were incorrectly set to the email prefix by the old trigger.
--
-- The original `handle_new_user` trigger (migration 001) always used SPLIT_PART(email,'@',1)
-- as the username, ignoring the `raw_user_meta_data.username` value the application stored
-- during registration. This migration:
--   1. Backfills affected profiles: any profile whose current username equals the email-prefix
--      AND whose auth user record carries a DIFFERENT username in raw_user_meta_data.
--   2. Re-creates the trigger function so new signups always prefer raw_user_meta_data.username
--      over the email-prefix fallback (idempotent with migration 022).

-- ─── Step 1: backfill existing broken profiles ──────────────────────────────────────────────

UPDATE public.profiles AS p
SET    username = NULLIF(TRIM(u.raw_user_meta_data ->> 'username'), '')
FROM   auth.users AS u
WHERE  p.id = u.id
  -- auth record has a non-empty username in metadata
  AND  NULLIF(TRIM(u.raw_user_meta_data ->> 'username'), '') IS NOT NULL
  -- that metadata username differs from the email prefix
  AND  LOWER(TRIM(u.raw_user_meta_data ->> 'username'))
         <> LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1))
  -- the profile username is null, empty, OR currently equals the email prefix
  --   (i.e. it was set by the old trigger, not chosen by the user)
  AND  (
         p.username IS NULL
         OR LOWER(TRIM(p.username)) = LOWER(SPLIT_PART(COALESCE(p.email, ''), '@', 1))
       );

-- ─── Step 2: re-pin the extract helper (idempotent) ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.extract_username_from_email(email TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LEFT(
    COALESCE(NULLIF(SPLIT_PART(COALESCE(email, ''), '@', 1), ''), 'member'),
    80
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER IMMUTABLE;

-- ─── Step 3: re-pin the trigger function to prefer metadata username ─────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    username,
    subscription_status,
    username_color,
    username_style
  )
  VALUES (
    NEW.id,
    NEW.email,
    -- Prefer the username the user explicitly chose; fall back to email prefix only when absent.
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data ->> 'username'), ''),
      public.extract_username_from_email(NEW.email)
    ),
    'free',
    '#ffffff',
    'gradient'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email              = COALESCE(EXCLUDED.email, public.profiles.email),
    -- Preserve an explicitly set username; only fill in if currently null/empty.
    username           = COALESCE(NULLIF(TRIM(public.profiles.username), ''), EXCLUDED.username),
    subscription_status = COALESCE(NULLIF(public.profiles.subscription_status, ''), 'free'),
    username_color     = COALESCE(NULLIF(public.profiles.username_color, ''), '#ffffff'),
    username_style     = 'gradient';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
