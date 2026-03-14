
-- Add video_url and instructor fields to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor_name text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor_title text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS total_classes integer NOT NULL DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS total_exams integer NOT NULL DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS total_materials integer NOT NULL DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Main';

-- Course sections (e.g. "Course Outline", "Course Content", etc.)
CREATE TABLE public.course_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  section_type text NOT NULL DEFAULT 'content',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view course sections" ON public.course_sections
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage course sections" ON public.course_sections
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Lessons within sections
CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES public.course_sections(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  video_url text,
  duration_minutes integer DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lessons" ON public.lessons
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage lessons" ON public.lessons
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Enrollments (verified orders = enrollments)
CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own enrollments" ON public.enrollments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage enrollments" ON public.enrollments
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Lesson progress tracking
CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON public.lesson_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON public.lesson_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.lesson_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all progress" ON public.lesson_progress
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Update handle_new_user to also grant admin to ahmedzarir07
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email IN ('oyeehgalib@gmail.com', 'ahmedzarir07@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
