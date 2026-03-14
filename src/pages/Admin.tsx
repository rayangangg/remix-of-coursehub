import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen, Plus, Trash2, Edit, CheckCircle, XCircle, Clock,
  Eye, EyeOff, Package, Users, Loader2, Layers, Video, UserPlus
} from "lucide-react";

const Admin = () => {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"courses" | "orders" | "enrollments">("courses");
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [managingSections, setManagingSections] = useState<string | null>(null);
  const [sectionForm, setSectionForm] = useState({ title: "", section_type: "content" });
  const [lessonForm, setLessonForm] = useState({ title: "", video_url: "", is_free: false });
  const [addingLessonToSection, setAddingLessonToSection] = useState<string | null>(null);
  const [enrollForm, setEnrollForm] = useState({ email: "", course_id: "" });

  const [courseForm, setCourseForm] = useState({
    title: "", description: "", image_url: "", video_url: "",
    price_bdt: "", price_usd: "", is_published: false,
    instructor_name: "", instructor_title: "",
    total_classes: "", total_exams: "", total_materials: "", category: "Main",
  });

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, courses(title)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: sections } = useQuery({
    queryKey: ["admin-sections", managingSections],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_sections")
        .select("*, lessons(*)")
        .eq("course_id", managingSections!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!managingSections,
  });

  const { data: enrollments } = useQuery({
    queryKey: ["admin-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(title)")
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && activeTab === "enrollments",
  });

  const saveCourse = useMutation({
    mutationFn: async () => {
      const payload = {
        title: courseForm.title,
        description: courseForm.description || null,
        image_url: courseForm.image_url || null,
        video_url: courseForm.video_url || null,
        price_bdt: Number(courseForm.price_bdt) || 0,
        price_usd: Number(courseForm.price_usd) || 0,
        is_published: courseForm.is_published,
        instructor_name: courseForm.instructor_name || null,
        instructor_title: courseForm.instructor_title || null,
        total_classes: Number(courseForm.total_classes) || 0,
        total_exams: Number(courseForm.total_exams) || 0,
        total_materials: Number(courseForm.total_materials) || 0,
        category: courseForm.category || "Main",
      };
      if (editingCourse) {
        const { error } = await supabase.from("courses").update(payload).eq("id", editingCourse.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("courses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: editingCourse ? "Course updated!" : "Course created!" });
      resetForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteCourse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Course deleted" });
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({ title: "Order status updated" });
    },
  });

  const addSection = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("course_sections").insert({
        course_id: managingSections!,
        title: sectionForm.title,
        section_type: sectionForm.section_type,
        sort_order: (sections?.length || 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sections"] });
      setSectionForm({ title: "", section_type: "content" });
      toast({ title: "Section added!" });
    },
  });

  const deleteSection = useMutation({
    mutationFn: async (sectionId: string) => {
      const { error } = await supabase.from("course_sections").delete().eq("id", sectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sections"] });
      toast({ title: "Section deleted" });
    },
  });

  const addLesson = useMutation({
    mutationFn: async (sectionId: string) => {
      const sectionLessons = sections?.find((s) => s.id === sectionId)?.lessons as any[] || [];
      const { error } = await supabase.from("lessons").insert({
        section_id: sectionId,
        course_id: managingSections!,
        title: lessonForm.title,
        video_url: lessonForm.video_url || null,
        is_free: lessonForm.is_free,
        sort_order: sectionLessons.length + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sections"] });
      setLessonForm({ title: "", video_url: "", is_free: false });
      setAddingLessonToSection(null);
      toast({ title: "Lesson added!" });
    },
  });

  const deleteLesson = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sections"] });
      toast({ title: "Lesson deleted" });
    },
  });

  const addEnrollment = useMutation({
    mutationFn: async () => {
      // Look up user by email - we need an edge function or RPC for this
      // For now, just insert with email lookup hint
      const { data: userData, error: userError } = await supabase.rpc("is_admin");
      // We'll use a simpler approach - admin enters user_id directly or we search
      toast({ title: "Info", description: "Use the orders panel to verify orders, which auto-enrolls students." });
    },
  });

  const resetForm = () => {
    setCourseForm({
      title: "", description: "", image_url: "", video_url: "",
      price_bdt: "", price_usd: "", is_published: false,
      instructor_name: "", instructor_title: "",
      total_classes: "", total_exams: "", total_materials: "", category: "Main",
    });
    setEditingCourse(null);
    setShowForm(false);
  };

  const startEdit = (course: any) => {
    setCourseForm({
      title: course.title,
      description: course.description || "",
      image_url: course.image_url || "",
      video_url: course.video_url || "",
      price_bdt: String(course.price_bdt),
      price_usd: String(course.price_usd),
      is_published: course.is_published,
      instructor_name: course.instructor_name || "",
      instructor_title: course.instructor_title || "",
      total_classes: String(course.total_classes || 0),
      total_exams: String(course.total_exams || 0),
      total_materials: String(course.total_materials || 0),
      category: course.category || "Main",
    });
    setEditingCourse(course);
    setShowForm(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" />;
  if (!isAdmin) return <Navigate to="/" />;

  // Section management view
  if (managingSections) {
    const managedCourse = courses?.find((c) => c.id === managingSections);
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <Button variant="outline" size="sm" onClick={() => setManagingSections(null)} className="border-border/50">
                ← Back
              </Button>
              <h1 className="text-xl font-display font-bold text-foreground">
                Manage Content: {managedCourse?.title}
              </h1>
            </div>

            {/* Add Section */}
            <div className="glass-card p-4 mb-6">
              <h3 className="font-display font-semibold text-foreground text-sm mb-3">Add Section</h3>
              <div className="flex gap-3">
                <Input
                  value={sectionForm.title}
                  onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                  placeholder="Section title"
                  className="bg-secondary/50 border-border/50"
                />
                <select
                  value={sectionForm.section_type}
                  onChange={(e) => setSectionForm({ ...sectionForm, section_type: e.target.value })}
                  className="bg-secondary/50 border border-border/50 rounded-lg px-3 text-sm text-foreground"
                >
                  <option value="outline">Course Outline</option>
                  <option value="content">Course Content</option>
                  <option value="exam">Exam</option>
                  <option value="material">Material</option>
                </select>
                <Button onClick={() => addSection.mutate()} disabled={!sectionForm.title} className="btn-primary">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Sections List */}
            <div className="space-y-4">
              {sections?.map((section) => (
                <div key={section.id} className="glass-card overflow-hidden">
                  <div className="flex items-center justify-between p-4 bg-card">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground text-sm">{section.title}</span>
                      <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                        {section.section_type}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        setAddingLessonToSection(section.id);
                        setLessonForm({ title: "", video_url: "", is_free: false });
                      }} className="border-border/50 text-foreground/80">
                        <Plus className="w-3 h-3 mr-1" /> Lesson
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteSection.mutate(section.id)}
                        className="border-destructive/50 text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Add Lesson Form */}
                  {addingLessonToSection === section.id && (
                    <div className="p-4 bg-secondary/30 border-t border-border/20 space-y-3">
                      <Input
                        value={lessonForm.title}
                        onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                        placeholder="Lesson title"
                        className="bg-secondary/50 border-border/50"
                      />
                      <Input
                        value={lessonForm.video_url}
                        onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                        placeholder="YouTube URL (optional)"
                        className="bg-secondary/50 border-border/50"
                      />
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-foreground/80">
                          <input
                            type="checkbox"
                            checked={lessonForm.is_free}
                            onChange={(e) => setLessonForm({ ...lessonForm, is_free: e.target.checked })}
                            className="accent-primary"
                          />
                          Free preview
                        </label>
                        <div className="flex gap-2 ml-auto">
                          <Button size="sm" onClick={() => addLesson.mutate(section.id)} disabled={!lessonForm.title} className="btn-primary">
                            Add
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setAddingLessonToSection(null)} className="border-border/50">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lessons */}
                  {((section.lessons as any[]) || [])
                    .sort((a: any, b: any) => a.sort_order - b.sort_order)
                    .map((lesson: any) => (
                      <div key={lesson.id} className="flex items-center justify-between px-6 py-3 border-t border-border/10">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground/80">{lesson.title}</span>
                          {lesson.is_free && (
                            <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded">Free</span>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => deleteLesson.mutate(lesson.id)}
                          className="text-destructive hover:text-destructive/80 h-7 w-7 p-0">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <h1 className="text-2xl font-display font-bold text-gradient mb-8">Admin Dashboard</h1>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 flex-wrap">
            {[
              { key: "courses", icon: Package, label: "Courses" },
              { key: "orders", icon: Users, label: "Orders" },
              { key: "enrollments", icon: UserPlus, label: "Enrollments" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground border border-border/50"
                }`}
              >
                <tab.icon className="w-4 h-4" /> {tab.label}
                {tab.key === "orders" && orders?.filter((o: any) => o.status === "pending").length ? (
                  <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                    {orders.filter((o: any) => o.status === "pending").length}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {/* Courses Tab */}
          {activeTab === "courses" && (
            <div className="space-y-6">
              {!showForm && (
                <Button onClick={() => setShowForm(true)} className="btn-primary">
                  <Plus className="w-4 h-4 mr-2" /> Add Course
                </Button>
              )}

              {showForm && (
                <div className="glass-card p-6 animate-fade-in">
                  <h3 className="font-display font-semibold text-foreground mb-4">
                    {editingCourse ? "Edit Course" : "New Course"}
                  </h3>
                  <form onSubmit={(e) => { e.preventDefault(); saveCourse.mutate(); }} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground/80">Title</Label>
                        <Input value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                          className="bg-secondary/50 border-border/50" required />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground/80">Category</Label>
                        <Input value={courseForm.category} onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                          className="bg-secondary/50 border-border/50" placeholder="Main" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground/80">Description</Label>
                      <Textarea value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                        className="bg-secondary/50 border-border/50" rows={3} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground/80">Image URL</Label>
                        <Input value={courseForm.image_url} onChange={(e) => setCourseForm({ ...courseForm, image_url: e.target.value })}
                          className="bg-secondary/50 border-border/50" placeholder="https://..." />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground/80">YouTube Preview URL</Label>
                        <Input value={courseForm.video_url} onChange={(e) => setCourseForm({ ...courseForm, video_url: e.target.value })}
                          className="bg-secondary/50 border-border/50" placeholder="https://youtube.com/watch?v=..." />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground/80">Instructor Name</Label>
                        <Input value={courseForm.instructor_name} onChange={(e) => setCourseForm({ ...courseForm, instructor_name: e.target.value })}
                          className="bg-secondary/50 border-border/50" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground/80">Instructor Title</Label>
                        <Input value={courseForm.instructor_title} onChange={(e) => setCourseForm({ ...courseForm, instructor_title: e.target.value })}
                          className="bg-secondary/50 border-border/50" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground/80">Price (BDT)</Label>
                        <Input type="number" value={courseForm.price_bdt} onChange={(e) => setCourseForm({ ...courseForm, price_bdt: e.target.value })}
                          className="bg-secondary/50 border-border/50" required />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground/80">Price (USD)</Label>
                        <Input type="number" value={courseForm.price_usd} onChange={(e) => setCourseForm({ ...courseForm, price_usd: e.target.value })}
                          className="bg-secondary/50 border-border/50" required />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground/80">Total Classes</Label>
                        <Input type="number" value={courseForm.total_classes} onChange={(e) => setCourseForm({ ...courseForm, total_classes: e.target.value })}
                          className="bg-secondary/50 border-border/50" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground/80">Total Exams</Label>
                        <Input type="number" value={courseForm.total_exams} onChange={(e) => setCourseForm({ ...courseForm, total_exams: e.target.value })}
                          className="bg-secondary/50 border-border/50" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-foreground/80">
                        <input type="checkbox" checked={courseForm.is_published}
                          onChange={(e) => setCourseForm({ ...courseForm, is_published: e.target.checked })}
                          className="accent-primary" />
                        Published
                      </label>
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" disabled={saveCourse.isPending} className="btn-primary">
                        {saveCourse.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        {editingCourse ? "Update" : "Create"}
                      </Button>
                      <Button type="button" variant="outline" onClick={resetForm} className="border-border/50">Cancel</Button>
                    </div>
                  </form>
                </div>
              )}

              {coursesLoading ? (
                <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="glass-card h-20 animate-pulse" />)}</div>
              ) : (
                <div className="space-y-3">
                  {courses?.map((course: any) => (
                    <div key={course.id} className="glass-card p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground truncate">{course.title}</h4>
                          {course.is_published ? <Eye className="w-4 h-4 text-success flex-shrink-0" /> : <EyeOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                        </div>
                        <p className="text-sm text-muted-foreground">৳{course.price_bdt} / ${course.price_usd} · {course.category}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" variant="outline" onClick={() => setManagingSections(course.id)}
                          className="border-border/50 text-foreground/80">
                          <Layers className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startEdit(course)} className="border-border/50 text-foreground/80">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteCourse.mutate(course.id)}
                          className="border-destructive/50 text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div className="space-y-3">
              {ordersLoading ? (
                <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="glass-card h-20 animate-pulse" />)}</div>
              ) : orders && orders.length > 0 ? (
                orders.map((order: any) => (
                  <div key={order.id} className="glass-card p-4 animate-fade-in">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-1 min-w-0">
                        <p className="font-semibold text-foreground">{order.full_name}</p>
                        <p className="text-sm text-muted-foreground">{order.email} · {order.phone}</p>
                        <p className="text-sm text-primary">
                          {(order.courses as any)?.title || "Unknown"} — {order.currency === "BDT" ? `৳${order.amount}` : `$${order.amount}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.payment_method} {order.transaction_id && `· TrxID: ${order.transaction_id}`}
                          {order.country && ` · ${order.country}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {order.status === "pending" ? (
                          <>
                            <Button size="sm" onClick={() => updateOrderStatus.mutate({ id: order.id, status: "verified" })}
                              className="bg-success hover:bg-success/90 text-success-foreground">
                              <CheckCircle className="w-4 h-4 mr-1" /> Verify
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => updateOrderStatus.mutate({ id: order.id, status: "rejected" })}
                              className="border-destructive/50 text-destructive">
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            order.status === "verified" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                          }`}>
                            {order.status === "verified" ? "Verified" : "Rejected"}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <div className="glass-card p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No orders yet</p>
                </div>
              )}
            </div>
          )}

          {/* Enrollments Tab */}
          {activeTab === "enrollments" && (
            <div className="space-y-3">
              {enrollments && enrollments.length > 0 ? (
                enrollments.map((enrollment: any) => (
                  <div key={enrollment.id} className="glass-card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">User: {enrollment.user_id.slice(0, 8)}...</p>
                        <p className="text-sm text-primary">{(enrollment.courses as any)?.title}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(enrollment.enrolled_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="glass-card p-8 text-center">
                  <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No enrollments yet. Verify orders to create enrollments.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
