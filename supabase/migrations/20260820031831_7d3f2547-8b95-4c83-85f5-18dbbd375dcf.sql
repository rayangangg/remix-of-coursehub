-- Main admin helper
CREATE OR REPLACE FUNCTION public.main_admin_email()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT 'ahmedzarir07@gmail.com'::text $$;

CREATE OR REPLACE FUNCTION public.is_main_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND lower(p.email) = public.main_admin_email())
$$;

-- Admins manage roles
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can grant roles" ON public.user_roles;
CREATE POLICY "Admins can grant roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can revoke roles" ON public.user_roles;
CREATE POLICY "Admins can revoke roles" ON public.user_roles FOR DELETE TO authenticated
USING (public.is_admin() AND NOT public.is_main_admin(user_id));

-- Hard guard: main admin role can never be removed or changed
CREATE OR REPLACE FUNCTION public.protect_main_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_main_admin(OLD.user_id) AND OLD.role = 'admin' THEN
    RAISE EXCEPTION 'The main admin cannot be modified';
  END IF;
  RETURN OLD;
END; $$;

DROP TRIGGER IF EXISTS protect_main_admin_row ON public.user_roles;
CREATE TRIGGER protect_main_admin_row BEFORE DELETE OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_main_admin();

-- Hide main admin from other admins' user list
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated
USING (public.is_admin() AND (id = auth.uid() OR lower(coalesce(email,'')) <> public.main_admin_email()));

-- Prevent duplicate enrollment requests
CREATE UNIQUE INDEX IF NOT EXISTS orders_unique_txid_per_course
  ON public.orders (course_id, lower(trim(transaction_id)))
  WHERE transaction_id IS NOT NULL AND trim(transaction_id) <> '' AND status <> 'rejected';

CREATE UNIQUE INDEX IF NOT EXISTS orders_unique_phone_per_course
  ON public.orders (course_id, regexp_replace(phone, '\D', '', 'g'))
  WHERE status <> 'rejected';

-- Shared root-level files in the file manager are readable by everyone
DROP POLICY IF EXISTS "Anyone can read shared root files" ON storage.objects;
CREATE POLICY "Anyone can read shared root files" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'course-materials' AND array_length(storage.foldername(name), 1) IS NULL);