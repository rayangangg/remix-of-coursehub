import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CourseCard from "@/components/CourseCard";
import Navbar from "@/components/Navbar";
import { BookOpen, Sparkles } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-background bg-gradient-hero">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Premium Online Courses</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-bold text-gradient mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Learn. Grow. Succeed.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Master new skills with our expertly crafted courses. Pay with bKash, Nagad, or international cards.
          </p>
        </div>
      </section>

      {/* Courses */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-display font-semibold text-foreground">Available Courses</h2>
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
        </div>
      </section>
    </div>
  );
};

export default Index;
