import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CourseCard from "@/components/CourseCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BookOpen } from "lucide-react";
import { useState } from "react";

const Courses = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");

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

  const categories = ["All", ...new Set(courses?.map((c) => c.category || "Main") || [])];
  const filtered = selectedCategory === "All" ? courses : courses?.filter((c) => (c.category || "Main") === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">All Courses</h1>
            <p className="text-muted-foreground">Browse our complete catalog</p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground border border-border/50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card h-80 animate-pulse" />
              ))}
            </div>
          ) : filtered && filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((course, i) => (
                <div key={course.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  <CourseCard course={course} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 glass-card">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-display font-semibold text-foreground mb-2">No courses found</h3>
              <p className="text-muted-foreground">Try a different category</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Courses;
