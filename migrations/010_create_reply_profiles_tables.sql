-- Reply Profiles: person-based memory system for Smart Reply Pro

CREATE TABLE IF NOT EXISTS public.reply_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  relationship_type TEXT NOT NULL DEFAULT 'Other',
  context_notes TEXT,
  style_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.profile_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.reply_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('incoming', 'user_reply', 'assistant_suggestion', 'history_import')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reply_profiles_user_updated
  ON public.reply_profiles(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_reply_profiles_user_activity
  ON public.reply_profiles(user_id, last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_messages_profile_created
  ON public.profile_messages(profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_messages_user_created
  ON public.profile_messages(user_id, created_at DESC);

ALTER TABLE public.reply_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own reply profiles" ON public.reply_profiles;
DROP POLICY IF EXISTS "Users can insert their own reply profiles" ON public.reply_profiles;
DROP POLICY IF EXISTS "Users can update their own reply profiles" ON public.reply_profiles;
DROP POLICY IF EXISTS "Users can view their own profile messages" ON public.profile_messages;
DROP POLICY IF EXISTS "Users can insert their own profile messages" ON public.profile_messages;

CREATE POLICY "Users can view their own reply profiles"
  ON public.reply_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reply profiles"
  ON public.reply_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reply profiles"
  ON public.reply_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own profile messages"
  ON public.profile_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile messages"
  ON public.profile_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.reply_profiles TO authenticated;
GRANT SELECT, INSERT ON public.profile_messages TO authenticated;
