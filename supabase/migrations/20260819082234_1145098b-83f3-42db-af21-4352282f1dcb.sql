
CREATE OR REPLACE FUNCTION public.handle_order_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  found_user_id uuid;
  inserted_count int := 0;
BEGIN
  IF NEW.status = 'verified' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'verified') THEN
    found_user_id := NEW.user_id;

    IF found_user_id IS NULL THEN
      SELECT id INTO found_user_id
      FROM auth.users
      WHERE lower(email) = lower(trim(NEW.email))
      ORDER BY created_at
      LIMIT 1;
    END IF;

    IF found_user_id IS NOT NULL THEN
      INSERT INTO public.enrollments (user_id, course_id)
      VALUES (found_user_id, NEW.course_id)
      ON CONFLICT (user_id, course_id) DO NOTHING;

      GET DIAGNOSTICS inserted_count = ROW_COUNT;

      IF inserted_count > 0 THEN
        UPDATE public.courses SET enrolled_count = enrolled_count + 1 WHERE id = NEW.course_id;
      END IF;

      IF NEW.user_id IS NULL THEN
        NEW.user_id := found_user_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_order_verified ON public.orders;
CREATE TRIGGER on_order_verified
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_order_verified();

-- Link verified orders to the account and enroll on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  IF NEW.email IN ('oyeehgalib@gmail.com', 'ahmedzarir07@gmail.com', 'ameelara504@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  UPDATE public.orders
  SET user_id = NEW.id
  WHERE user_id IS NULL AND lower(trim(email)) = lower(trim(NEW.email));

  INSERT INTO public.enrollments (user_id, course_id)
  SELECT NEW.id, o.course_id
  FROM public.orders o
  WHERE o.status = 'verified'
    AND lower(trim(o.email)) = lower(trim(NEW.email))
  ON CONFLICT (user_id, course_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Backfill missed enrollments for already verified orders
INSERT INTO public.enrollments (user_id, course_id)
SELECT COALESCE(o.user_id, u.id), o.course_id
FROM public.orders o
LEFT JOIN auth.users u ON lower(u.email) = lower(trim(o.email))
WHERE o.status = 'verified'
  AND COALESCE(o.user_id, u.id) IS NOT NULL
ON CONFLICT (user_id, course_id) DO NOTHING;

-- Storage policies for class materials
CREATE POLICY "Admins can upload course materials"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'course-materials' AND public.is_admin());

CREATE POLICY "Admins can update course materials"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'course-materials' AND public.is_admin());

CREATE POLICY "Admins can delete course materials"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'course-materials' AND public.is_admin());

CREATE POLICY "Signed in users can read course materials"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'course-materials');

-- Storage usage helper (bytes used in the course-materials bucket)
CREATE OR REPLACE FUNCTION public.course_materials_storage_usage()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0)
  FROM storage.objects
  WHERE bucket_id = 'course-materials';
$$;

GRANT EXECUTE ON FUNCTION public.course_materials_storage_usage() TO authenticated;
