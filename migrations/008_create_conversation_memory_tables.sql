-- Conversation memory intelligence tables

CREATE TABLE IF NOT EXISTS public.conversation_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.conversation_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversation_threads_user_created
  ON public.conversation_threads(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_thread_created
  ON public.conversation_messages(thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_user_created
  ON public.conversation_messages(user_id, created_at DESC);

ALTER TABLE public.conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own conversation threads" ON public.conversation_threads;
DROP POLICY IF EXISTS "Users can insert their own conversation threads" ON public.conversation_threads;
DROP POLICY IF EXISTS "Users can view their own conversation messages" ON public.conversation_messages;
DROP POLICY IF EXISTS "Users can insert their own conversation messages" ON public.conversation_messages;

CREATE POLICY "Users can view their own conversation threads"
  ON public.conversation_threads
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversation threads"
  ON public.conversation_threads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own conversation messages"
  ON public.conversation_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversation messages"
  ON public.conversation_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.conversation_threads TO authenticated;
GRANT SELECT, INSERT ON public.conversation_messages TO authenticated;
