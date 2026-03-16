-- Add material_url to lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS material_url text;

-- Add stats and hero image to site_settings
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS stat_students text NOT NULL DEFAULT '10k+';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS stat_lessons text NOT NULL DEFAULT '500+';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS stat_instructors text NOT NULL DEFAULT '50+';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS stat_materials text NOT NULL DEFAULT '1k+';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS hero_image_url text;