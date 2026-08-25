ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.enroll_in_free_course(_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  free boolean;
  inserted_count int := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT (c.is_free AND c.is_published) INTO free FROM public.courses c WHERE c.id = _course_id;

  IF free IS NOT TRUE THEN
    RAISE EXCEPTION 'This course is not free';
  END IF;

  INSERT INTO public.enrollments (user_id, course_id)
  VALUES (uid, _course_id)
  ON CONFLICT (user_id, course_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count > 0 THEN
    UPDATE public.courses SET enrolled_count = enrolled_count + 1 WHERE id = _course_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enroll_in_free_course(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.enroll_in_free_course(uuid) FROM anon, public;