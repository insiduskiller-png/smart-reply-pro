CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.pro_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  note TEXT,
  source_page TEXT NOT NULL DEFAULT 'unknown',
  user_id UUID,
  subscription_status TEXT,
  email_notification_status TEXT NOT NULL DEFAULT 'pending',
  email_notification_error TEXT,
  email_notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pro_waitlist_email_unique
  ON public.pro_waitlist (lower(email));

CREATE INDEX IF NOT EXISTS idx_pro_waitlist_created_at
  ON public.pro_waitlist (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pro_waitlist_source_page
  ON public.pro_waitlist (source_page);

CREATE INDEX IF NOT EXISTS idx_pro_waitlist_user_id
  ON public.pro_waitlist (user_id);

CREATE INDEX IF NOT EXISTS idx_pro_waitlist_notification_status
  ON public.pro_waitlist (email_notification_status);

ALTER TABLE public.pro_waitlist ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pro_waitlist'
      AND policyname = 'allow_anon_insert_pro_waitlist'
  ) THEN
    CREATE POLICY allow_anon_insert_pro_waitlist
      ON public.pro_waitlist
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;
