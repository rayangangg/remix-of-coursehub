CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_default BOOLEAN NOT NULL DEFAULT true UNIQUE,
  payment_bkash TEXT NOT NULL DEFAULT '01633005730',
  payment_nagad TEXT NOT NULL DEFAULT '01711950646',
  hero_badge TEXT NOT NULL DEFAULT 'Welcome to CourseHUB',
  hero_title TEXT NOT NULL DEFAULT 'Master New Skills with',
  hero_highlight TEXT NOT NULL DEFAULT 'Premium Online Courses',
  hero_description TEXT NOT NULL DEFAULT 'Join thousands of students learning from expert instructors. Pay with bKash and Nagad.',
  primary_hue INTEGER NOT NULL DEFAULT 28,
  primary_saturation INTEGER NOT NULL DEFAULT 95,
  primary_lightness INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
CREATE POLICY "Anyone can view site settings"
ON public.site_settings
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;
CREATE POLICY "Admins can manage site settings"
ON public.site_settings
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

DROP TRIGGER IF EXISTS update_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER update_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_settings (is_default)
VALUES (true)
ON CONFLICT (is_default) DO NOTHING;