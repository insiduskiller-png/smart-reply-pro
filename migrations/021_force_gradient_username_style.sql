ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username_style TEXT DEFAULT 'gradient';

ALTER TABLE public.profiles
ALTER COLUMN username_style SET DEFAULT 'gradient';

UPDATE public.profiles
SET username_style = 'gradient'
WHERE username_style IS NULL OR lower(username_style) <> 'gradient';
