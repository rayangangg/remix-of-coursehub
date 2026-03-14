import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <BookOpen className="w-6 h-6 text-primary" />
              <span className="font-display font-bold text-xl text-primary">
                Course<span className="text-foreground">HUB</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm">
              Premium online courses to help you master new skills and achieve your goals.
            </p>
          </div>
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Quick Links</h4>
            <div className="space-y-2">
              <Link to="/" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Home</Link>
              <Link to="/courses" className="block text-sm text-muted-foreground hover:text-primary transition-colors">All Courses</Link>
              <Link to="/auth" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Login / Signup</Link>
            </div>
          </div>
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Payment Methods</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>bKash (Personal)</p>
              <p>Nagad (Personal)</p>
              <p>International Cards (USD)</p>
            </div>
          </div>
        </div>
        <div className="border-t border-border/30 mt-8 pt-8">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/60 to-primary rounded-full mb-6" />
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} CourseHUB. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
