REVOKE ALL ON FUNCTION public.main_admin_email() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.is_main_admin(uuid) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.protect_main_admin() FROM anon, authenticated, public;