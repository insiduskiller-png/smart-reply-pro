CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT UNIQUE,
  subscription_status TEXT DEFAULT 'free' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  username_color TEXT DEFAULT '#ffffff',
  username_style TEXT DEFAULT 'gradient'
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS username_color TEXT DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS username_style TEXT DEFAULT 'gradient';

ALTER TABLE public.profiles
  ALTER COLUMN subscription_status SET DEFAULT 'free',
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN username_color SET DEFAULT '#ffffff',
  ALTER COLUMN username_style SET DEFAULT 'gradient';

UPDATE public.profiles
SET
  subscription_status = COALESCE(NULLIF(subscription_status, ''), 'free'),
  username_color = COALESCE(NULLIF(username_color, ''), '#ffffff'),
  username_style = CASE
    WHEN username_style IS NULL OR username_style = '' THEN 'gradient'
    ELSE 'gradient'
  END,
  created_at = COALESCE(created_at, NOW());

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can SELECT their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can UPDATE their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can INSERT their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can SELECT their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Authenticated users can UPDATE their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can INSERT their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.extract_username_from_email(email TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LEFT(COALESCE(NULLIF(SPLIT_PART(COALESCE(email, ''), '@', 1), ''), 'member'), 80);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER IMMUTABLE;

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
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'username'), ''), public.extract_username_from_email(NEW.email)),
    'free',
    '#ffffff',
    'gradient'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    subscription_status = COALESCE(NULLIF(public.profiles.subscription_status, ''), 'free'),
    username_color = COALESCE(NULLIF(public.profiles.username_color, ''), '#ffffff'),
    username_style = 'gradient';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
