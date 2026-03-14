import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CourseCard from "@/components/CourseCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BookOpen, Users, PlayCircle, GraduationCap, FileText, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const stats = [
    { icon: Users, value: "10k+", label: "Students" },
    { icon: PlayCircle, value: "500+", label: "Lessons" },
    { icon: GraduationCap, value: "50+", label: "Instructors" },
    { icon: FileText, value: "1k+", label: "Materials" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section - EdgeCourse style */}
      <section className="relative pt-16 overflow-hidden">
        <div className="bg-gradient-green min-h-[500px] flex items-center">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-block bg-primary/20 border border-primary/40 rounded-lg px-4 py-2 mb-4">
                <span className="text-primary font-display font-semibold text-lg">Welcome to CourseHUB</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight">
                Master New Skills with
                <span className="text-gradient block mt-2">Premium Online Courses</span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Join thousands of students learning from expert instructors. Pay with bKash, Nagad, or international cards.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link to="/courses">
                  <Button size="lg" className="btn-primary px-8 py-6 text-base glow-sm">
                    Browse Courses <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-secondary px-8 py-6 text-base">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8 border-b border-border/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <stat.icon className="w-10 h-10 text-primary flex-shrink-0" />
                <div>
                  <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="section-title mb-3">Our Courses</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Explore our expertly crafted courses designed to help you succeed.
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card h-80 animate-pulse" />
              ))}
            </div>
          ) : courses && courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course, i) => (
                <div key={course.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                  <CourseCard course={course} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 glass-card">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-display font-semibold text-foreground mb-2">No courses yet</h3>
              <p className="text-muted-foreground">Check back soon for new courses!</p>
            </div>
          )}

          {courses && courses.length > 0 && (
            <div className="text-center mt-10">
              <Link to="/courses">
                <Button variant="outline" size="lg" className="border-primary/50 text-primary hover:bg-primary/10">
                  View All Courses <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
