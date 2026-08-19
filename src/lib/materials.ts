import { supabase } from "@/integrations/supabase/client";

export const MATERIALS_BUCKET = "course-materials";
export const STORAGE_QUOTA_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

export const isStoredMaterial = (value?: string | null) =>
  !!value && !/^https?:\/\//i.test(value.trim());

export const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

/** External links pass through; stored files get a temporary signed link. */
export const resolveMaterialUrl = async (value?: string | null): Promise<string | null> => {
  const raw = value?.trim();
  if (!raw) return null;
  if (!isStoredMaterial(raw)) return raw;

  const { data, error } = await supabase.storage
    .from(MATERIALS_BUCKET)
    .createSignedUrl(raw.replace(/^course-materials\//, ""), 60 * 60);

  if (error) return null;
  return data?.signedUrl ?? null;
};

export const openMaterial = async (value?: string | null) => {
  const url = await resolveMaterialUrl(value);
  if (url) window.open(url, "_blank", "noopener,noreferrer");
};

export const uploadMaterial = async (courseId: string, file: File) => {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${courseId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(MATERIALS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
};

export const getStorageUsage = async (): Promise<number> => {
  const { data, error } = await supabase.rpc("course_materials_storage_usage" as any);
  if (error) throw error;
  return Number(data) || 0;
};
