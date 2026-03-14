
-- Add promo_code and discount fields to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS promo_code text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS discount_percent integer DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS discount_expires_at timestamptz;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS enrolled_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS group_link text;

-- Add user_id to orders so we can link to auth users
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create profiles table for user info
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (is_admin());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));

  -- Assign admin role for specific emails
  IF NEW.email IN ('oyeehgalib@gmail.com', 'ahmedzarir07@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Insert profile for existing user if not exists
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, split_part(email, '@', 1)
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT DO NOTHING;

-- Function to auto-enroll user when order is verified
CREATE OR REPLACE FUNCTION public.handle_order_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
    -- Try to find user by email
    DECLARE
      found_user_id uuid;
    BEGIN
      SELECT id INTO found_user_id FROM auth.users WHERE email = NEW.email LIMIT 1;
      IF found_user_id IS NOT NULL THEN
        INSERT INTO public.enrollments (user_id, course_id)
        VALUES (found_user_id, NEW.course_id)
        ON CONFLICT (user_id, course_id) DO NOTHING;
        
        -- Update enrolled count
        UPDATE public.courses SET enrolled_count = enrolled_count + 1 WHERE id = NEW.course_id;
      END IF;
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_verified
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_verified();
