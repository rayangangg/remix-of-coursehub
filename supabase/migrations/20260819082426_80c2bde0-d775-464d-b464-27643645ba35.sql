
UPDATE public.site_settings
SET primary_hue = 142,
    primary_saturation = 70,
    primary_lightness = 42,
    hero_badge = replace(hero_badge, 'CourseHUB', 'Premium Course'),
    updated_at = now()
WHERE is_default = true;

ALTER TABLE public.site_settings ALTER COLUMN primary_hue SET DEFAULT 142;
ALTER TABLE public.site_settings ALTER COLUMN primary_saturation SET DEFAULT 70;
ALTER TABLE public.site_settings ALTER COLUMN primary_lightness SET DEFAULT 42;
ALTER TABLE public.site_settings ALTER COLUMN hero_badge SET DEFAULT 'Welcome to Premium Course';
