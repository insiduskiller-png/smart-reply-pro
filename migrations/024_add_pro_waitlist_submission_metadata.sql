ALTER TABLE public.pro_waitlist
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT;

CREATE INDEX IF NOT EXISTS idx_pro_waitlist_user_id
  ON public.pro_waitlist (user_id);

CREATE INDEX IF NOT EXISTS idx_pro_waitlist_subscription_status
  ON public.pro_waitlist (subscription_status);
