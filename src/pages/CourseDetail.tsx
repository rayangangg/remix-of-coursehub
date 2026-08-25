import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PaymentForm from "@/components/PaymentForm";
import {
  BookOpen,
  Users,
  PlayCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Video,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveVideo, getEmbeddableVideoUrl } from "@/lib/video";

type LessonItem = {
  id: string;
  title: string;
  sort_order: number;
  is_free: boolean;
  video_url: string | null;
};

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const [showPayment, setShowPayment] = useState(false);
  const [activePreviewLessonId, setActivePreviewLessonId] = useState<string | null>(null);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

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

  const { data: enrollment } = useQuery({
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

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };
const navigate = useNavigate();
  const totalLessons = sections?.reduce((acc, s) => acc + ((s.lessons as LessonItem[])?.length || 0), 0) || 0;

  const freePreviewLessons = useMemo(() => {
    if (!sections) return [] as LessonItem[];

    return sections
      .flatMap((section) => (section.lessons as LessonItem[]) || [])
      .filter((lesson) => lesson.is_free && !!getEmbeddableVideoUrl(lesson.video_url))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [sections]);

  useEffect(() => {
    if (freePreviewLessons.length === 0) {
      setActivePreviewLessonId(null);
      return;
    }

    if (!activePreviewLessonId || !freePreviewLessons.some((lesson) => lesson.id === activePreviewLessonId)) {
      setActivePreviewLessonId(freePreviewLessons[0].id);
    }
  }, [freePreviewLessons, activePreviewLessonId]);

  const activeFreePreviewLesson = freePreviewLessons.find((lesson) => lesson.id === activePreviewLessonId) ?? null;
  const activePreview =
    resolveVideo(activeFreePreviewLesson?.video_url) || resolveVideo(course?.video_url);
  const activePreviewUrl = activePreview?.url ?? null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 px-4 container mx-auto">
          <div className="glass-card h-96 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 px-4 container mx-auto text-center">
          <h1 className="text-2xl font-display text-foreground">Course not found</h1>
        </div>
      </div>
    );
  }

  if (enrollment) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <div className="glass-card p-12">
              <BookOpen className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-display font-bold text-foreground mb-3">You're enrolled!</h2>
              <p className="text-muted-foreground mb-6">Continue learning from where you left off.</p>
              <Link to={`/learn/${course.id}`}>
                <Button size="lg" className="btn-primary px-8 glow-sm">
                  <PlayCircle className="w-5 h-5 mr-2" /> Continue Course
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16">
        <div className="bg-card border-b border-border/30 py-8">
          <div className="container mx-auto px-4 max-w-6xl">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">{course.title}</h1>
            {course.instructor_name && (
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{course.instructor_name}</p>
                  {course.instructor_title && <p className="text-xs text-muted-foreground">{course.instructor_title}</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-6xl mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {activePreviewUrl ? (
                <div className="space-y-3">
                  <div className="aspect-video rounded-xl overflow-hidden border border-border/30 bg-secondary/50">
                    {activePreview?.kind === "file" ? (
                      <video
                        src={activePreviewUrl}
                        className="w-full h-full"
                        controls
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <iframe
                        src={activePreviewUrl ?? undefined}
                        className="w-full h-full"
                        referrerPolicy="origin"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        title={activeFreePreviewLesson?.title || course.title}
                      />
                    )}
                  </div>
                  {activeFreePreviewLesson && (
                    <p className="text-xs text-primary font-medium">
                      Playing free demo: {activeFreePreviewLesson.title}
                    </p>
                  )}
                </div>
              ) : course.image_url ? (
                <div className="rounded-xl overflow-hidden border border-border/30">
                  <img referrerPolicy="no-referrer" src={course.image_url} alt={course.title} className="w-full h-64 md:h-80 object-cover" loading="lazy" />
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-card border border-border/30 rounded-xl p-4 text-center">
                  <PlayCircle className="w-6 h-6 text-destructive mx-auto mb-1" />
                  <p className="font-display font-bold text-foreground">{course.total_classes || totalLessons}</p>
                  <p className="text-xs text-muted-foreground">Total Class</p>
                </div>
                <div className="bg-card border border-border/30 rounded-xl p-4 text-center">
                  <FileText className="w-6 h-6 text-green-accent mx-auto mb-1" />
                  <p className="font-display font-bold text-foreground">{course.total_exams || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Exam</p>
                </div>
                <div className="bg-card border border-border/30 rounded-xl p-4 text-center">
                  <BookOpen className="w-6 h-6 text-primary mx-auto mb-1" />
                  <p className="font-display font-bold text-foreground">{course.total_materials || 0}</p>
                  <p className="text-xs text-muted-foreground">Materials</p>
                </div>
              </div>

              {course.description && (
                <div className="glass-card p-6">
                  <h3 className="font-display font-semibold text-foreground mb-3">About the Course</h3>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{course.description}</p>
                </div>
              )}

              {sections && sections.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-display font-semibold text-primary text-center text-xl mb-4">Course Content</h3>
                  {sections.map((section) => (
                    <div key={section.id} className="border border-border/30 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between p-4 bg-card hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Video className="w-5 h-5 text-primary" />
                          <span className="font-medium text-foreground text-sm">{section.title}</span>
                        </div>
                        {expandedSections.has(section.id) ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                      {expandedSections.has(section.id) && (section.lessons as LessonItem[])?.length > 0 && (
                        <div className="border-t border-border/30">
                          {(section.lessons as LessonItem[])
                            .sort((a, b) => a.sort_order - b.sort_order)
                            .map((lesson) => {
                              const canPreview = lesson.is_free && !!getEmbeddableVideoUrl(lesson.video_url);
                              const isActivePreview = lesson.id === activeFreePreviewLesson?.id;

                              return canPreview ? (
                                <button
                                  key={lesson.id}
                                  type="button"
                                  onClick={() => setActivePreviewLessonId(lesson.id)}
                                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border/20 last:border-0 transition-colors text-left ${
                                    isActivePreview
                                      ? "bg-primary/10"
                                      : "bg-background/50 hover:bg-secondary/40"
                                  }`}
                                >
                                  <PlayCircle className="w-4 h-4 text-primary flex-shrink-0" />
                                  <span className="text-sm text-foreground">{lesson.title}</span>
                                  <span className="ml-auto text-xs text-success bg-success/10 px-2 py-0.5 rounded">
                                    Free demo
                                  </span>
                                </button>
                              ) : (
                                <div
                                  key={lesson.id}
                                  className="flex items-center gap-3 px-4 py-3 border-b border-border/20 last:border-0 bg-background/50"
                                >
                                  {lesson.is_free ? (
                                    <PlayCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  ) : (
                                    <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  )}
                                  <span className="text-sm text-muted-foreground">{lesson.title}</span>
                                  {lesson.is_free ? (
                                    <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                                      Invalid link
                                    </span>
                                  ) : (
                                    <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                                      Enroll to watch
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                {!showPayment ? (
                  <div className="glass-card p-6 space-y-4">
                    <div className="text-center">
                      <p className="text-3xl font-display font-bold text-primary">
                        {course.is_free ? "Free" : `৳${course.price_bdt}`}
                      </p>
                      {course.is_free && (
                        <p className="text-xs text-muted-foreground mt-1">No payment required</p>
                      )}
                    </div>
                    <Button
                      onClick={() => {
                        if (!session?.user) {
                          navigate("/auth");
                          return;
                        }
                        if (course.is_free) {
                          enrollFree.mutate();
                          return;
                        }
                        setShowPayment(true);
                      }}
                      disabled={enrollFree.isPending}
                      className="w-full btn-primary py-6 text-base glow-sm"
                      size="lg"
                    >
                      {enrollFree.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {!session?.user
                        ? course.is_free
                          ? "Login to Enroll"
                          : "Login to Buy"
                        : course.is_free
                          ? "Enroll for Free"
                          : "Buy Now"}
                    </Button>
                    <div className="text-center text-xs text-muted-foreground space-y-1">
                      <p>✓ Lifetime access</p>
                      <p>✓ All course materials</p>
                      <p>✓ Certificate of completion</p>
                    </div>
                  </div>
                ) : (
                  <PaymentForm course={course} />
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CourseDetail;
