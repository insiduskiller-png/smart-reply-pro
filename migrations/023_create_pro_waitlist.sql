CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.pro_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  note TEXT,
  source_page TEXT NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pro_waitlist_email_unique
  ON public.pro_waitlist (lower(email));

CREATE INDEX IF NOT EXISTS idx_pro_waitlist_created_at
  ON public.pro_waitlist (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pro_waitlist_source_page
  ON public.pro_waitlist (source_page);

ALTER TABLE public.pro_waitlist ENABLE ROW LEVEL SECURITY;
