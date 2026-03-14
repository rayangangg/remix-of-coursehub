import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, Shield, User, Search, Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const { session, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/courses", label: "Courses" },
    ...(session ? [{ href: "/dashboard", label: "My Courses" }] : []),
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          <span className="font-display font-bold text-xl text-primary">
            Course<span className="text-foreground">HUB</span>
          </span>
        </Link>

        {/* Desktop Nav */}
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
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Login
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-background border-b border-border/50 px-4 pb-4 space-y-2 animate-fade-in">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block py-2 text-sm font-medium ${
                location.pathname === link.href ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-primary">
              Admin Panel
            </Link>
          )}
          {session ? (
            <button onClick={() => { signOut(); setMobileOpen(false); }} className="block py-2 text-sm text-muted-foreground">
              Sign Out
            </button>
          ) : (
            <Link to="/auth" onClick={() => setMobileOpen(false)} className="block py-2 text-sm text-primary font-medium">
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
