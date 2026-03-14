import { useState, useEffect } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import {
  PlayCircle, CheckCircle, ChevronDown, ChevronUp, BookOpen,
  ArrowLeft, Loader2, Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const CoursePlayer = () => {
  const { id } = useParams<{ id: string }>();
  const { session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Check enrollment
  const { data: enrollment, isLoading: enrollLoading } = useQuery({
    queryKey: ["enrollment", id, session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", id!)
        .eq("user_id", session!.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!session?.user?.id,
  });

  // Course
  const { data: course } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Sections with lessons
  const { data: sections } = useQuery({
    queryKey: ["course-sections", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_sections")
        .select("*, lessons(*)")
        .eq("course_id", id!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Lesson progress
  const { data: progress } = useQuery({
    queryKey: ["lesson-progress", id, session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("course_id", id!)
        .eq("user_id", session!.user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!session?.user?.id,
  });

  const completedLessonIds = new Set(progress?.filter((p) => p.completed).map((p) => p.lesson_id));

  // All lessons flat
  const allLessons =
    sections
      ?.flatMap((s) =>
        ((s.lessons as any[]) || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((l: any) => ({ ...l, sectionTitle: s.title }))
      ) || [];

  const totalLessons = allLessons.length;
  const completedCount = completedLessonIds.size;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const activeLesson = allLessons.find((l) => l.id === activeLessonId) || allLessons[0];

  // Auto-expand all sections and pick first lesson
  useEffect(() => {
    if (sections && sections.length > 0) {
      setExpandedSections(new Set(sections.map((s) => s.id)));
      if (!activeLessonId && allLessons.length > 0) {
        setActiveLessonId(allLessons[0].id);
      }
    }
  }, [sections]);

  // Mark lesson complete
  const markComplete = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase.from("lesson_progress").upsert(
        {
          user_id: session!.user.id,
          lesson_id: lessonId,
          course_id: id!,
          completed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-progress", id] });
    },
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  if (authLoading || enrollLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" />;
  if (!enrollment) return <Navigate to={`/course/${id}`} />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        {/* Course title bar */}
        <div className="bg-card border-b border-border/30 px-4 py-3">
          <div className="container mx-auto flex items-center gap-3">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-display font-semibold text-foreground text-sm md:text-base truncate">
              {course?.title}
            </h1>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-8rem)]">
          {/* Video Player Area */}
          <div className="flex-1 flex flex-col">
            {/* Video */}
            <div className="bg-black">
              {activeLesson?.video_url ? (
                <div className="aspect-video max-h-[60vh] mx-auto">
                  <iframe
                    src={activeLesson.video_url.replace("watch?v=", "embed/")}
                    className="w-full h-full"
                    allowFullScreen
                    title={activeLesson.title}
                  />
                </div>
              ) : (
                <div className="aspect-video max-h-[60vh] mx-auto flex items-center justify-center bg-secondary">
                  <div className="text-center text-muted-foreground">
                    <PlayCircle className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No video available for this lesson</p>
                  </div>
                </div>
              )}
            </div>

            {/* Lesson info below video */}
            <div className="p-4 md:p-6 border-b border-border/30">
              <p className="text-muted-foreground text-xs mb-1">{activeLesson?.sectionTitle}</p>
              <h2 className="font-display font-semibold text-foreground text-lg mb-3">
                {activeLesson?.title || "Select a lesson"}
              </h2>
              {activeLesson && !completedLessonIds.has(activeLesson.id) && (
                <Button
                  size="sm"
                  onClick={() => markComplete.mutate(activeLesson.id)}
                  disabled={markComplete.isPending}
                  className="btn-primary"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Complete
                </Button>
              )}
              {activeLesson && completedLessonIds.has(activeLesson.id) && (
                <span className="inline-flex items-center gap-1 text-sm text-success">
                  <CheckCircle className="w-4 h-4" /> Completed
                </span>
              )}
            </div>
          </div>

          {/* Sidebar - Course Content */}
          <div className="lg:w-96 border-l border-border/30 bg-card/50 overflow-y-auto max-h-[calc(100vh-8rem)]">
            {/* Progress */}
            <div className="p-4 border-b border-border/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Course Progress</span>
                <span className="text-sm font-medium text-primary">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            {/* Sections */}
            <div>
              {sections?.map((section) => {
                const sectionLessons = ((section.lessons as any[]) || []).sort(
                  (a: any, b: any) => a.sort_order - b.sort_order
                );
                return (
                  <div key={section.id}>
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors border-b border-border/20"
                    >
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-primary" />
                        <span className="font-medium text-foreground text-sm text-left">{section.title}</span>
                      </div>
                      {expandedSections.has(section.id) ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    {expandedSections.has(section.id) &&
                      sectionLessons.map((lesson: any) => {
                        const isActive = lesson.id === activeLessonId;
                        const isCompleted = completedLessonIds.has(lesson.id);
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => setActiveLessonId(lesson.id)}
                            className={`w-full flex items-center gap-3 px-6 py-3 text-left text-sm transition-colors border-b border-border/10 ${
                              isActive
                                ? "bg-primary/10 border-l-2 border-l-primary"
                                : "hover:bg-secondary/30"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                            ) : (
                              <PlayCircle className="w-4 h-4 text-primary flex-shrink-0" />
                            )}
                            <span className={`${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                              {lesson.title}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoursePlayer;
