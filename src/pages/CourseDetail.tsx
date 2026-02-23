import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import PaymentForm from "@/components/PaymentForm";
import { BookOpen, Clock, Users } from "lucide-react";

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: course, isLoading } = useQuery({
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background bg-gradient-hero">
        <Navbar />
        <div className="pt-24 px-4 container mx-auto">
          <div className="glass-card h-96 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background bg-gradient-hero">
        <Navbar />
        <div className="pt-24 px-4 container mx-auto text-center">
          <h1 className="text-2xl font-display text-foreground">Course not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-gradient-hero">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Course Info */}
            <div className="lg:col-span-3 space-y-6">
              <div className="glass-card overflow-hidden">
                {course.image_url ? (
                  <img src={course.image_url} alt={course.title} className="w-full h-64 object-cover" />
                ) : (
                  <div className="w-full h-64 bg-secondary/50 flex items-center justify-center">
                    <BookOpen className="w-20 h-20 text-muted-foreground/30" />
                  </div>
                )}
                <div className="p-6 space-y-4">
                  <h1 className="text-3xl font-display font-bold text-foreground">{course.title}</h1>
                  {course.description && (
                    <p className="text-muted-foreground leading-relaxed">{course.description}</p>
                  )}
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Self-paced</span>
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" /> Unlimited access</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="lg:col-span-2">
              <PaymentForm course={course} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
