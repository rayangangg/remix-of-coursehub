import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  listFolder,
  uploadToFolder,
  createFolder,
  renameFile,
  deletePath,
  getShareLink,
  getStorageUsage,
  formatBytes,
  STORAGE_QUOTA_BYTES,
  type StorageEntry,
} from "@/lib/materials";
import {
  Loader2, Folder, FileText, Upload, FolderPlus, Trash2, Edit,
  Link as LinkIcon, ArrowLeft, Home, ChevronRight, RefreshCw,
} from "lucide-react";

const AdminFiles = () => {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [folder, setFolder] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: entries, isLoading } = useQuery({
    queryKey: ["admin-files", folder],
    queryFn: () => listFolder(folder),
    enabled: isAdmin,
  });

  const { data: storageUsed = 0 } = useQuery({
    queryKey: ["storage-usage"],
    queryFn: getStorageUsage,
    enabled: isAdmin,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-files"] });
    queryClient.invalidateQueries({ queryKey: ["storage-usage"] });
  };

  const addFolder = useMutation({
    mutationFn: () => createFolder(folder, newFolder),
    onSuccess: () => {
      setNewFolder("");
      refresh();
      toast({ title: "Folder created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeEntry = useMutation({
    mutationFn: (entry: StorageEntry) => deletePath(entry),
    onSuccess: () => {
      refresh();
      toast({ title: "Deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rename = useMutation({
    mutationFn: ({ path, name }: { path: string; name: string }) => renameFile(path, name),
    onSuccess: () => {
      refresh();
      toast({ title: "Renamed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleUpload = async (file: File) => {
    if (storageUsed + file.size > STORAGE_QUOTA_BYTES) {
      toast({
        title: "Storage full",
        description: `Only ${formatBytes(STORAGE_QUOTA_BYTES - storageUsed)} left of your 5 GB quota.`,
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    try {
      await uploadToFolder(folder, file);
      refresh();
      toast({ title: "File uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const copyLink = async (path: string) => {
    try {
      const url = await getShareLink(path);
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied to clipboard" });
    } catch (e: any) {
      toast({ title: "Could not create link", description: e.message, variant: "destructive" });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" />;
  if (!isAdmin) return <Navigate to="/" />;

  const crumbs = folder ? folder.split("/") : [];
  const storagePercent = Math.min(100, Math.round((storageUsed / STORAGE_QUOTA_BYTES) * 100));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Link to="/admin" className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-1">
                <ArrowLeft className="w-4 h-4" /> Admin
              </Link>
              <h1 className="text-2xl font-display font-bold text-foreground">File Manager</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={refresh}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>

          <div className="glass-card p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-foreground">Storage used</p>
              <p className="text-sm text-muted-foreground">
                {formatBytes(storageUsed)} of {formatBytes(STORAGE_QUOTA_BYTES)} ({storagePercent}%)
              </p>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${storagePercent}%` }} />
            </div>
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-sm mb-4 flex-wrap">
            <button onClick={() => setFolder("")} className="inline-flex items-center gap-1 text-primary">
              <Home className="w-4 h-4" /> Root
            </button>
            {crumbs.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <button
                  onClick={() => setFolder(crumbs.slice(0, i + 1).join("/"))}
                  className="text-foreground/80 hover:text-primary"
                >
                  {c}
                </button>
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="glass-card p-4 mb-6 flex flex-col sm:flex-row gap-3">
            <label className="inline-flex items-center justify-center gap-2 text-sm text-primary cursor-pointer border border-primary/40 rounded-lg px-3 py-2 hover:bg-primary/10">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload to {folder ? `/${folder}` : "root"}
              <input
                type="file"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) handleUpload(file);
                }}
              />
            </label>
            <Input
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              placeholder="New folder name"
              className="bg-secondary/50 border-border/50 flex-1"
            />
            <Button
              onClick={() => addFolder.mutate()}
              disabled={!newFolder.trim() || addFolder.isPending}
              className="btn-primary whitespace-nowrap"
            >
              {addFolder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4 mr-1" />}
              Create folder
            </Button>
          </div>

          {/* Listing */}
          <div className="glass-card divide-y divide-border/10">
            {isLoading ? (
              <div className="p-10 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
              </div>
            ) : entries && entries.length > 0 ? (
              entries.map((entry) => (
                <div key={entry.path} className="flex items-center gap-3 px-4 py-3 group">
                  {entry.isFolder ? (
                    <Folder className="w-4 h-4 text-primary flex-shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <button
                    className="text-sm text-foreground/90 truncate text-left hover:text-primary"
                    onClick={() => entry.isFolder ? setFolder(entry.path) : copyLink(entry.path)}
                  >
                    {entry.name}
                  </button>
                  {!entry.isFolder && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">{formatBytes(entry.size)}</span>
                  )}
                  <div className="ml-auto flex gap-1 flex-shrink-0">
                    {!entry.isFolder && (
                      <>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => copyLink(entry.path)}>
                          <LinkIcon className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            const name = prompt("New file name", entry.name);
                            if (name) rename.mutate({ path: entry.path, name });
                          }}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={() => {
                        if (confirm(`Delete ${entry.name}?`)) removeEntry.mutate(entry);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <Folder className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">This folder is empty.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminFiles;
