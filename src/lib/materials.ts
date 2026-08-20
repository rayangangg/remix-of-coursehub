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

const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9._ -]/g, "_").trim();

/** Uploads a lesson slide, renaming the file after the class/lesson title. */
export const uploadMaterial = async (courseId: string, file: File, displayName?: string) => {
  const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
  const base = sanitize(displayName?.trim() || file.name.replace(/\.[^.]+$/, "")) || "file";
  const path = `${courseId}/${base}${ext}`;
  const { error } = await supabase.storage.from(MATERIALS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw error;
  return path;
};

/** Uploads any file to a chosen folder ("" = root, shared/public). */
export const uploadToFolder = async (folder: string, file: File, displayName?: string) => {
  const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
  const base = sanitize(displayName?.trim() || file.name.replace(/\.[^.]+$/, "")) || "file";
  const prefix = folder ? `${folder.replace(/\/+$/, "")}/` : "";
  const path = `${prefix}${base}${ext}`;
  const { error } = await supabase.storage.from(MATERIALS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw error;
  return path;
};

export type StorageEntry = {
  name: string;
  path: string;
  isFolder: boolean;
  size: number;
  updatedAt: string | null;
};

export const listFolder = async (folder: string): Promise<StorageEntry[]> => {
  const prefix = folder ? folder.replace(/\/+$/, "") : "";
  const { data, error } = await supabase.storage.from(MATERIALS_BUCKET).list(prefix, {
    limit: 500,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw error;
  return (data ?? [])
    .filter((item) => item.name !== ".emptyFolderPlaceholder")
    .map((item) => ({
      name: item.name,
      path: prefix ? `${prefix}/${item.name}` : item.name,
      isFolder: !item.id,
      size: Number((item as any).metadata?.size ?? 0),
      updatedAt: (item as any).updated_at ?? null,
    }));
};

export const createFolder = async (folder: string, name: string) => {
  const safe = sanitize(name).replace(/[^a-zA-Z0-9._ -]/g, "");
  if (!safe) throw new Error("Invalid folder name");
  const prefix = folder ? `${folder.replace(/\/+$/, "")}/` : "";
  const { error } = await supabase.storage
    .from(MATERIALS_BUCKET)
    .upload(`${prefix}${safe}/.emptyFolderPlaceholder`, new Blob([""]), { upsert: true });
  if (error) throw error;
};

export const renameFile = async (path: string, newName: string) => {
  const safe = sanitize(newName);
  if (!safe) throw new Error("Invalid file name");
  const parts = path.split("/");
  parts.pop();
  const target = [...parts, safe].join("/");
  const { error } = await supabase.storage.from(MATERIALS_BUCKET).move(path, target);
  if (error) throw error;
  return target;
};

export const deletePath = async (entry: StorageEntry) => {
  if (!entry.isFolder) {
    const { error } = await supabase.storage.from(MATERIALS_BUCKET).remove([entry.path]);
    if (error) throw error;
    return;
  }
  const children = await listFolder(entry.path);
  const files = children.filter((c) => !c.isFolder).map((c) => c.path);
  const { error } = await supabase.storage
    .from(MATERIALS_BUCKET)
    .remove([...files, `${entry.path}/.emptyFolderPlaceholder`]);
  if (error) throw error;
};

/** Long-lived shareable link (1 year). */
export const getShareLink = async (path: string) => {
  const { data, error } = await supabase.storage
    .from(MATERIALS_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (error) throw error;
  return data.signedUrl;
};

export const getStorageUsage = async (): Promise<number> => {
  const { data, error } = await supabase.rpc("course_materials_storage_usage" as any);
  if (error) throw error;
  return Number(data) || 0;
};

