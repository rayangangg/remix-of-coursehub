-- 1. Lessons: restrict full rows
DROP POLICY IF EXISTS "Anyone can view lessons" ON public.lessons;

CREATE POLICY "Free, enrolled or admin can view lessons"
ON public.lessons FOR SELECT
USING (
  is_free = true
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = lessons.course_id AND e.user_id = auth.uid()
  )
);

-- Public curriculum listing without paid media links
CREATE OR REPLACE VIEW public.lessons_public
WITH (security_invoker = off) AS
SELECT
  l.id,
  l.section_id,
  l.course_id,
  l.title,
  l.duration_minutes,
  l.sort_order,
  l.is_free,
  l.created_at,
  CASE WHEN l.is_free THEN l.video_url ELSE NULL END AS video_url
FROM public.lessons l;

GRANT SELECT ON public.lessons_public TO anon, authenticated;

-- 2. Orders
CREATE POLICY "Users can view own orders"
ON public.orders FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
ON public.orders FOR INSERT
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 3. Storage: course materials readable only by admins or enrolled students
DROP POLICY IF EXISTS "Signed in users can read course materials" ON storage.objects;
CREATE POLICY "Enrolled users or admins can read course materials"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.user_id = auth.uid()
        AND e.course_id::text = (storage.foldername(name))[1]
    )
  )
);

-- 4. SECURITY DEFINER function exposure
CREATE OR REPLACE FUNCTION public.course_materials_storage_usage()
RETURNS bigint
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN (
    SELECT COALESCE(SUM((metadata->>'size')::bigint), 0)
    FROM storage.objects
    WHERE bucket_id = 'course-materials'
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.course_materials_storage_usage() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_order_verified() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;