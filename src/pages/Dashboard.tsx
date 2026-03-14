import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BookOpen, PlayCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const Dashboard = () => {
  const { session, loading: authLoading } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ["my-enrollments", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("user_id", session!.user.id)
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  // Get progress for each course
  const { data: progressMap } = useQuery({
    queryKey: ["my-progress", session?.user?.id],
    queryFn: async () => {
      // Get all lesson progress for this user
      const { data: progress, error: progressError } = await supabase
        .from("lesson_progress")
        .select("course_id, completed")
        .eq("user_id", session!.user.id)
        .eq("completed", true);
      if (progressError) throw progressError;

      // Get total lessons per course for enrolled courses
      const courseIds = enrollments?.map((e: any) => e.course_id) || [];
      if (courseIds.length === 0) return {};

      const { data: lessons, error: lessonsError } = await supabase
        .from("lessons")
        .select("course_id")
        .in("course_id", courseIds);
      if (lessonsError) throw lessonsError;

      // Build map
      const totalMap: Record<string, number> = {};
      const completedMap: Record<string, number> = {};

      lessons?.forEach((l: any) => {
        totalMap[l.course_id] = (totalMap[l.course_id] || 0) + 1;
      });

      progress?.forEach((p: any) => {
        completedMap[p.course_id] = (completedMap[p.course_id] || 0) + 1;
      });

      const result: Record<string, number> = {};
      Object.keys(totalMap).forEach((courseId) => {
        const total = totalMap[courseId] || 1;
        const completed = completedMap[courseId] || 0;
        result[courseId] = Math.round((completed / total) * 100);
      });

      return result;
    },
    enabled: !!session?.user?.id && !!enrollments,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" />;

  const courses = enrollments?.map((e: any) => ({ ...e.courses, enrollment_id: e.id })) || [];
  const categories = ["All", ...new Set(courses.map((c: any) => c?.category || "Main"))];
  const filtered = selectedCategory === "All" ? courses : courses.filter((c: any) => (c?.category || "Main") === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20">
        {/* Header */}
        <div className="bg-card border-b border-border/30 py-8">
          <div className="container mx-auto px-4">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">My Courses</h1>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat as string}
                onClick={() => setSelectedCategory(cat as string)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground border border-border/50"
                }`}
              >
                {cat as string}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card h-72 animate-pulse" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((course: any) => {
                const progress = progressMap?.[course.id] || 0;
                return (
                  <div key={course.id} className="glass-card overflow-hidden course-card-hover">
                    <div className="h-44 bg-secondary/50 overflow-hidden">
                      {course.image_url ? (
                        <img
                          src={course.image_url}
                          alt={course.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-green">
                          <BookOpen className="w-14 h-14 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-5 space-y-3">
                      <h3 className="font-display font-semibold text-foreground text-sm line-clamp-2">
                        {course.title}
                      </h3>
                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <div className="w-full bg-secondary rounded-full h-1.5 mr-3 mt-1">
                            <div
                              className="bg-primary h-1.5 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-primary font-medium whitespace-nowrap">{progress}%</span>
                        </div>
                      </div>
                      <Link to={`/learn/${course.id}`}>
                        <Button className="w-full btn-primary mt-2" size="sm">
                          <PlayCircle className="w-4 h-4 mr-2" /> Continue Course
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 glass-card">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-display font-semibold text-foreground mb-2">No courses yet</h3>
              <p className="text-muted-foreground mb-6">Browse our courses and start learning!</p>
              <Link to="/courses">
                <Button className="btn-primary">Browse Courses</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;
