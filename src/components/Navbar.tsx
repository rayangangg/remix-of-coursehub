import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookOpen, LogOut, Shield, User, Menu, X, Loader2 } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const { session, isAdmin, signOut, loading: authLoading } = useAuth();
  const { data: siteSettings } = useSiteSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const siteName = siteSettings?.site_name || "Premium Course";
  const nameParts = siteName.split(" ");
  const firstWord = nameParts[0] || "Premium";
  const restWords = nameParts.slice(1).join(" ") || "Course";

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/courses", label: "Courses" },
    ...(session && !authLoading ? [{ href: "/dashboard", label: "My Courses" }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    setMobileOpen(false);
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          {siteSettings?.logo_url ? (
            <img
              src={siteSettings.logo_url}
              alt={siteName}
              className="h-8 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <BookOpen className="w-6 h-6 text-primary" />
          )}
          <span className="font-display font-bold text-xl text-primary">
            {firstWord}
            <span className="text-foreground"> {restWords}</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`text-sm font-medium transition-colors ${
                location.pathname === link.href
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {authLoading ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-border/50">
                  <User className="w-4 h-4 mr-2" /> Profile
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card border-border/50">
                <DropdownMenuLabel className="text-xs text-muted-foreground truncate">
                  {session.user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">My Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">My Courses</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="text-primary">
                      <Shield className="w-4 h-4 mr-2" /> Admin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    handleSignOut();
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="btn-primary">
                Login
              </Button>
            </Link>
          )}
        </div>

        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-background border-b border-border/50 px-4 pb-4 space-y-2 animate-fade-in">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block py-2 text-sm font-medium ${
                location.pathname === link.href
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {session && !authLoading && (
            <>
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm font-medium text-muted-foreground"
              >
                My Profile
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm font-medium text-muted-foreground"
              >
                My Courses
              </Link>
            </>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium text-primary"
            >
              Admin Panel
            </Link>
          )}

          {authLoading ? (
            <div className="py-2 text-sm text-muted-foreground">Checking account...</div>
          ) : session ? (
            <button onClick={handleSignOut} className="block py-2 text-sm text-muted-foreground">
              Sign Out
            </button>
          ) : (
            <Link
              to="/auth"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm text-primary font-medium"
            >
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
