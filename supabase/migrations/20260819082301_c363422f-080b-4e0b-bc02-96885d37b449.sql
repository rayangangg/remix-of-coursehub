
REVOKE EXECUTE ON FUNCTION public.course_materials_storage_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.course_materials_storage_usage() TO authenticated;
