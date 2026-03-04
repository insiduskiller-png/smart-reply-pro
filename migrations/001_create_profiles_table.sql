-- Create profiles table with all required fields
-- This table stores user profile information linked to auth users

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT UNIQUE,
  subscription_status TEXT DEFAULT 'free' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can SELECT their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can UPDATE their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can INSERT their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can SELECT their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can UPDATE their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can INSERT their own profile" ON profiles;

-- Allow authenticated users to SELECT their own profile
CREATE POLICY "Authenticated users can SELECT their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow authenticated users to UPDATE their own profile
CREATE POLICY "Authenticated users can UPDATE their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to INSERT their own profile
CREATE POLICY "Authenticated users can INSERT their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create function to extract username from email (part before @)
DROP FUNCTION IF EXISTS public.extract_username_from_email(TEXT);
CREATE OR REPLACE FUNCTION public.extract_username_from_email(email TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN SPLIT_PART(email, '@', 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER IMMUTABLE;

-- Create trigger function to auto-create profile on new user signup
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    username,
    subscription_status
  )
  VALUES (
    new.id,
    new.email,
    public.extract_username_from_email(new.email),
    'free'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
