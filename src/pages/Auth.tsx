import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, UserPlus, Mail, Lock, BookOpen } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { session } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      navigate("/dashboard");
    }
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back!" });
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: "Check your email to confirm your account!" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-gradient-hero flex items-center justify-center p-4">
      <div className="glass-card p-8 w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <BookOpen className="w-7 h-7 text-primary" />
          <span className="font-display font-bold text-2xl text-primary">
            Course<span className="text-foreground">HUB</span>
          </span>
        </div>

        <h1 className="text-2xl font-display font-bold text-foreground text-center mb-1">
          {isLogin ? "Welcome Back" : "Create Account"}
        </h1>
        <p className="text-muted-foreground text-center text-sm mb-8">
          {isLogin ? "Sign in to access your courses" : "Join Premium Course today"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground/80">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground/80">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/50 focus:border-primary"
                required
                minLength={6}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-5 glow-sm font-semibold"
          >
            {loading ? "Loading..." : isLogin ? (
              <><LogIn className="mr-2 w-4 h-4" /> Sign In</>
            ) : (
              <><UserPlus className="mr-2 w-4 h-4" /> Sign Up</>
            )}
          </Button>
        </form>

        <p className="text-center mt-6 text-muted-foreground text-sm">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:underline font-medium"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
