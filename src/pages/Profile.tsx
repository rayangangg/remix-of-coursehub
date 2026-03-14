import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Shield, BookOpen } from "lucide-react";

const Profile = () => {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url")
        .eq("id", session!.user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() || null, avatar_url: avatarUrl.trim() || null })
        .eq("id", session!.user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile", session?.user?.id] });
      toast({ title: "Profile updated" });
    },
    onError: (error: any) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-3xl space-y-6">
          <header className="glass-card p-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">My Profile</h1>
              <p className="text-sm text-muted-foreground">Manage your account details and quick actions.</p>
            </div>
            <div className="text-sm text-muted-foreground">{session.user.email}</div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/dashboard" className="glass-card p-4 transition-all hover:border-primary/40 border border-transparent">
              <BookOpen className="w-5 h-5 text-primary mb-2" />
              <p className="font-medium text-foreground">My Courses</p>
              <p className="text-xs text-muted-foreground mt-1">Continue your enrolled courses.</p>
            </Link>

            {isAdmin && (
              <Link to="/admin" className="glass-card p-4 transition-all hover:border-primary/40 border border-transparent">
                <Shield className="w-5 h-5 text-primary mb-2" />
                <p className="font-medium text-foreground">Admin Panel</p>
                <p className="text-xs text-muted-foreground mt-1">Manage courses, students and orders.</p>
              </Link>
            )}

            <div className="glass-card p-4">
              <User className="w-5 h-5 text-primary mb-2" />
              <p className="font-medium text-foreground">Account Status</p>
              <p className="text-xs text-muted-foreground mt-1">Authenticated and synced.</p>
            </div>
          </section>

          <section className="glass-card p-6 space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-10 rounded bg-secondary/50 animate-pulse" />
                <div className="h-10 rounded bg-secondary/50 animate-pulse" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="bg-secondary/50 border-border/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatar_url">Avatar URL</Label>
                  <Input
                    id="avatar_url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="bg-secondary/50 border-border/50"
                  />
                </div>

                <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} className="btn-primary">
                  {updateProfile.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save Changes
                </Button>
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
