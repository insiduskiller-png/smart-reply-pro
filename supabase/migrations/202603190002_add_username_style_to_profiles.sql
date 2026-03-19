ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username_color TEXT DEFAULT '#ffffff';

ALTER TABLE public.profiles
ALTER COLUMN username_color SET DEFAULT '#ffffff';

UPDATE public.profiles
SET username_color = '#ffffff'
WHERE username_color IS NULL;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username_style TEXT DEFAULT 'solid';

ALTER TABLE public.profiles
ALTER COLUMN username_style SET DEFAULT 'solid';

UPDATE public.profiles
SET username_style = 'solid'
WHERE username_style IS NULL;
