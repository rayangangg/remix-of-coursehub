import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, Shield, User } from "lucide-react";

const Navbar = () => {
  const { session, isAdmin, signOut } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          <span className="font-display font-bold text-xl text-foreground">
            CourseHub
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link to="/admin">
              <Button variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10">
                <Shield className="w-4 h-4 mr-1" /> Admin
              </Button>
            </Link>
          )}
          {session ? (
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 mr-1" /> Sign Out
            </Button>
          ) : (
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <User className="w-4 h-4 mr-1" /> Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
