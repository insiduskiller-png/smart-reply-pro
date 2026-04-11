ALTER TABLE public.pro_waitlist
  ADD COLUMN IF NOT EXISTS email_notification_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS email_notification_error TEXT,
  ADD COLUMN IF NOT EXISTS email_notified_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_pro_waitlist_notification_status
  ON public.pro_waitlist (email_notification_status);
