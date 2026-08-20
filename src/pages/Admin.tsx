import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { defaultSiteSettings } from "@/hooks/useSiteSettings";
import {
  uploadMaterial,
  getStorageUsage,
  formatBytes,
  isStoredMaterial,
  STORAGE_QUOTA_BYTES,
} from "@/lib/materials";
import {
  Plus, Trash2, Edit, CheckCircle, XCircle, Clock, Eye, EyeOff,
  Package, Users, Loader2, Layers, Video, UserPlus, Search,
  BarChart3, ArrowLeft, Link as LinkIcon, RefreshCw, Settings2,
  Palette, Smartphone, Image, FileText, FolderOpen, ShieldCheck, ShieldOff,
} from "lucide-react";

const Admin = () => {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "courses" | "orders" | "enrollments" | "users" | "settings"
  >("dashboard");
  const [userSearch, setUserSearch] = useState("");
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [managingSections, setManagingSections] = useState<string | null>(null);
  const [sectionForm, setSectionForm] = useState({ title: "", section_type: "content" });
  const [lessonForm, setLessonForm] = useState({ title: "", video_url: "", material_url: "", is_free: false });
  const [addingLessonToSection, setAddingLessonToSection] = useState<string | null>(null);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "verified" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [siteSettingsForm, setSiteSettingsForm] = useState({
    payment_bkash: defaultSiteSettings.payment_bkash,
    payment_nagad: defaultSiteSettings.payment_nagad,
    hero_badge: defaultSiteSettings.hero_badge,
    hero_title: defaultSiteSettings.hero_title,
    hero_highlight: defaultSiteSettings.hero_highlight,
    hero_description: defaultSiteSettings.hero_description,
    hero_image_url: "",
    primary_hue: String(defaultSiteSettings.primary_hue),
    primary_saturation: String(defaultSiteSettings.primary_saturation),
    primary_lightness: String(defaultSiteSettings.primary_lightness),
    stat_students: defaultSiteSettings.stat_students,
    stat_lessons: defaultSiteSettings.stat_lessons,
    stat_instructors: defaultSiteSettings.stat_instructors,
    stat_materials: defaultSiteSettings.stat_materials,
  });

  const [courseForm, setCourseForm] = useState({
    title: "", description: "", image_url: "", video_url: "",
    price_bdt: "", is_published: false,
    instructor_name: "", instructor_title: "",
    total_classes: "", total_exams: "", total_materials: "",
    category: "Main", promo_code: "", discount_percent: "",
    group_link: "",
  });

  const shouldLoadCourses = isAdmin && (activeTab === "dashboard" || activeTab === "courses" || !!managingSections);
  const shouldLoadOrders = isAdmin && (activeTab === "dashboard" || activeTab === "orders");
  const shouldLoadEnrollments = isAdmin && (activeTab === "dashboard" || activeTab === "enrollments");
  const shouldLoadProfiles = isAdmin && activeTab === "users";
  const shouldLoadSiteSettings = isAdmin && (activeTab === "dashboard" || activeTab === "settings");

  // ===== QUERIES =====
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: shouldLoadCourses,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, courses(title)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: shouldLoadOrders,
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
    enabled: isAdmin && !!managingSections,
  });

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ["admin-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(title)")
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: shouldLoadEnrollments,
  });

  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: shouldLoadProfiles,
  });

  const { data: adminRoles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (error) throw error;
      return data;
    },
    enabled: shouldLoadProfiles,
  });

  const adminUserIds = new Set((adminRoles || []).map((r: any) => r.user_id));

  const { data: storageUsed = 0 } = useQuery({
    queryKey: ["storage-usage"],
    queryFn: getStorageUsage,
    enabled: isAdmin,
  });

  const { data: siteSettings, isLoading: siteSettingsLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;
      return { ...defaultSiteSettings, ...(data ?? {}) };
    },
    enabled: shouldLoadSiteSettings,
  });

  useEffect(() => {
    if (!siteSettings) return;
    setSiteSettingsForm({
      payment_bkash: siteSettings.payment_bkash,
      payment_nagad: siteSettings.payment_nagad,
      hero_badge: siteSettings.hero_badge,
      hero_title: siteSettings.hero_title,
      hero_highlight: siteSettings.hero_highlight,
      hero_description: siteSettings.hero_description,
      hero_image_url: siteSettings.hero_image_url || "",
      primary_hue: String(siteSettings.primary_hue),
      primary_saturation: String(siteSettings.primary_saturation),
      primary_lightness: String(siteSettings.primary_lightness),
      stat_students: siteSettings.stat_students,
      stat_lessons: siteSettings.stat_lessons,
      stat_instructors: siteSettings.stat_instructors,
      stat_materials: siteSettings.stat_materials,
    });
  }, [siteSettings]);

  // ===== MUTATIONS =====
  const saveCourse = useMutation({
    mutationFn: async () => {
      const title = courseForm.title.trim();
      if (!title) throw new Error("Course title is required");

      const priceBdt = Number(courseForm.price_bdt);
      if (!Number.isFinite(priceBdt) || priceBdt < 0) {
        throw new Error("Please enter a valid BDT price");
      }

      const payload = {
        title,
        description: courseForm.description.trim() || null,
        image_url: courseForm.image_url.trim() || null,
        video_url: courseForm.video_url.trim() || null,
        price_bdt: priceBdt,
        price_usd: 0,
        is_published: courseForm.is_published,
        instructor_name: courseForm.instructor_name.trim() || null,
        instructor_title: courseForm.instructor_title.trim() || null,
        total_classes: Number(courseForm.total_classes) || 0,
        total_exams: Number(courseForm.total_exams) || 0,
        total_materials: Number(courseForm.total_materials) || 0,
        category: courseForm.category.trim() || "Main",
        promo_code: courseForm.promo_code.trim() || null,
        discount_percent: Number(courseForm.discount_percent) || 0,
        group_link: courseForm.group_link.trim() || null,
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
    // 1. Order status আপডেট
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id)
      .select("id, email, course_id, user_id, full_name")
      .single();

    if (orderError) throw orderError;

    // 2. শুধু verified হলে enrollment তৈরি করো
    if (status === "verified" && order) {
      let userId = order.user_id;

      // user_id না থাকলে email দিয়ে profiles থেকে খুঁজো
      if (!userId && order.email) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", order.email.trim().toLowerCase())
          .maybeSingle();

        if (profile?.id) {
          userId = profile.id;
          // order-এ user_id সেট করে দাও
          await supabase
            .from("orders")
            .update({ user_id: userId })
            .eq("id", order.id);
        }
      }

      if (userId) {
        // ইতিমধ্যে enrolled আছে কিনা চেক
        const { data: existing } = await supabase
          .from("enrollments")
          .select("id")
          .eq("user_id", userId)
          .eq("course_id", order.course_id)
          .maybeSingle();

        if (!existing) {
          const { error: enrollError } = await supabase.from("enrollments").insert({
            user_id: userId,
            course_id: order.course_id,
          });
          if (enrollError) throw enrollError;
        }
      } else {
        // কোনো matching user পাওয়া যায়নি
        console.warn("No matching user found for email:", order.email);
      }
    }
  },
  onSuccess: (_data, variables) => {
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    queryClient.invalidateQueries({ queryKey: ["admin-enrollments"] });
    queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });

    if (variables.status === "verified") {
      toast({
        title: "Order verified!",
        description: "Student enrolled if they have an account with the same email. Otherwise ask them to sign up with that email.",
      });
    } else {
      toast({ title: "Order status updated!" });
    }
  },
  onError: (err: any) => {
    toast({
      title: "Error",
      description: err.message || "Failed to update order",
      variant: "destructive",
    });
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
      const sectionLessons = (sections?.find((s) => s.id === sectionId)?.lessons as any[]) || [];
      const { error } = await supabase.from("lessons").insert({
        section_id: sectionId,
        course_id: managingSections!,
        title: lessonForm.title,
        video_url: lessonForm.video_url || null,
        material_url: lessonForm.material_url || null,
        is_free: lessonForm.is_free,
        sort_order: sectionLessons.length + 1,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sections"] });
      setLessonForm({ title: "", video_url: "", material_url: "", is_free: false });
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

  const deleteEnrollment = useMutation({
    mutationFn: async (enrollId: string) => {
      const { error } = await supabase.from("enrollments").delete().eq("id", enrollId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-enrollments"] });
      toast({ title: "Enrollment removed" });
    },
  });

  const toggleAdminRole = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      toast({ title: variables.makeAdmin ? "User promoted to admin" : "Admin access removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("courses").update({ is_published: published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast({ title: "Course visibility updated" });
    },
  });

  const saveSiteSettings = useMutation({
    mutationFn: async () => {
      const hue = Math.max(0, Math.min(360, Number(siteSettingsForm.primary_hue) || defaultSiteSettings.primary_hue));
      const saturation = Math.max(0, Math.min(100, Number(siteSettingsForm.primary_saturation) || defaultSiteSettings.primary_saturation));
      const lightness = Math.max(0, Math.min(100, Number(siteSettingsForm.primary_lightness) || defaultSiteSettings.primary_lightness));

      const payload = {
        is_default: true,
        payment_bkash: siteSettingsForm.payment_bkash.trim() || defaultSiteSettings.payment_bkash,
        payment_nagad: siteSettingsForm.payment_nagad.trim() || defaultSiteSettings.payment_nagad,
        hero_badge: siteSettingsForm.hero_badge.trim() || defaultSiteSettings.hero_badge,
        hero_title: siteSettingsForm.hero_title.trim() || defaultSiteSettings.hero_title,
        hero_highlight: siteSettingsForm.hero_highlight.trim() || defaultSiteSettings.hero_highlight,
        hero_description: siteSettingsForm.hero_description.trim() || defaultSiteSettings.hero_description,
        hero_image_url: siteSettingsForm.hero_image_url.trim() || null,
        primary_hue: hue,
        primary_saturation: saturation,
        primary_lightness: lightness,
        stat_students: siteSettingsForm.stat_students.trim() || defaultSiteSettings.stat_students,
        stat_lessons: siteSettingsForm.stat_lessons.trim() || defaultSiteSettings.stat_lessons,
        stat_instructors: siteSettingsForm.stat_instructors.trim() || defaultSiteSettings.stat_instructors,
        stat_materials: siteSettingsForm.stat_materials.trim() || defaultSiteSettings.stat_materials,
      };

      const { error } = await supabase.from("site_settings").upsert(payload as any, { onConflict: "is_default" });
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate and immediately refetch so SiteThemeSync picks up new colors
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      queryClient.refetchQueries({ queryKey: ["site-settings"] });
      toast({ title: "Website settings updated — changes are live!" });
    },
    onError: (error: any) => {
      toast({ title: "Settings update failed", description: error.message, variant: "destructive" });
    },
  });

  // ===== HELPERS =====
  const storagePercent = Math.min(100, Math.round((storageUsed / STORAGE_QUOTA_BYTES) * 100));

  const handleMaterialUpload = async (file: File) => {
    if (!managingSections) return;
    if (!lessonForm.title.trim()) {
      toast({
        title: "Add the class name first",
        description: "The slide file is renamed after the class title.",
        variant: "destructive",
      });
      return;
    }
    if (storageUsed + file.size > STORAGE_QUOTA_BYTES) {
      toast({
        title: "Storage full",
        description: `Only ${formatBytes(STORAGE_QUOTA_BYTES - storageUsed)} left of your 5 GB quota.`,
        variant: "destructive",
      });
      return;
    }
    setUploadingMaterial(true);
    try {
      const path = await uploadMaterial(managingSections, file, lessonForm.title);
      setLessonForm((prev) => ({ ...prev, material_url: path }));
      queryClient.invalidateQueries({ queryKey: ["storage-usage"] });
      toast({ title: `Slides uploaded as ${path.split("/").pop()}` });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploadingMaterial(false);
    }
  };


  const resetForm = () => {
    setCourseForm({
      title: "", description: "", image_url: "", video_url: "",
      price_bdt: "", is_published: false,
      instructor_name: "", instructor_title: "",
      total_classes: "", total_exams: "", total_materials: "",
      category: "Main", promo_code: "", discount_percent: "",
      group_link: "",
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
      is_published: course.is_published,
      instructor_name: course.instructor_name || "",
      instructor_title: course.instructor_title || "",
      total_classes: String(course.total_classes || 0),
      total_exams: String(course.total_exams || 0),
      total_materials: String(course.total_materials || 0),
      category: course.category || "Main",
      promo_code: course.promo_code || "",
      discount_percent: String(course.discount_percent || 0),
      group_link: course.group_link || "",
    });
    setEditingCourse(course);
    setShowForm(true);
  };

  // Stats
  const totalRevenueBDT = orders?.filter((o: any) => o.status === "verified" && o.currency === "BDT").reduce((s: number, o: any) => s + Number(o.amount), 0) || 0;
  const pendingOrders = orders?.filter((o: any) => o.status === "pending").length || 0;
  const totalEnrollments = enrollments?.length || 0;
  const publishedCourses = courses?.filter((c: any) => c.is_published).length || 0;

  // Filtered orders
  const filteredOrders = orders?.filter((o: any) => {
    if (orderFilter !== "all" && o.status !== orderFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return o.full_name?.toLowerCase().includes(q) || o.email?.toLowerCase().includes(q) || o.transaction_id?.toLowerCase().includes(q);
    }
    return true;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" />;
  if (!isAdmin) return <Navigate to="/" />;

  // ===== SECTION MANAGEMENT VIEW =====
  if (managingSections) {
    const managedCourse = courses?.find((c) => c.id === managingSections);
    const totalLessonsInCourse = sections?.reduce((acc, s) => acc + ((s.lessons as any[])?.length || 0), 0) || 0;

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="sm" onClick={() => setManagingSections(null)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            </div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-display font-bold text-foreground">
                  {managedCourse?.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {sections?.length || 0} sections · {totalLessonsInCourse} lessons
                </p>
              </div>
            </div>

            <div className="glass-card p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">Storage used</p>
                <p className="text-sm text-muted-foreground">
                  {formatBytes(storageUsed)} of {formatBytes(STORAGE_QUOTA_BYTES)} ({storagePercent}%)
                </p>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${storagePercent}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {formatBytes(Math.max(0, STORAGE_QUOTA_BYTES - storageUsed))} remaining for class slides.
              </p>
            </div>

            {/* Add Section */}
            <div className="glass-card p-4 mb-6">
              <h3 className="font-display font-semibold text-foreground text-sm mb-3">Add Section</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={sectionForm.title}
                  onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                  placeholder="Section title (e.g. Physics Chapter 1)"
                  className="bg-secondary/50 border-border/50 flex-1"
                />
                <select
                  value={sectionForm.section_type}
                  onChange={(e) => setSectionForm({ ...sectionForm, section_type: e.target.value })}
                  className="bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground"
                >
                  <option value="outline">Course Outline</option>
                  <option value="content">Course Content</option>
                  <option value="exam">Exam</option>
                  <option value="material">Material</option>
                </select>
                <Button onClick={() => addSection.mutate()} disabled={!sectionForm.title || addSection.isPending} className="btn-primary whitespace-nowrap">
                  {addSection.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                  Add Section
                </Button>
              </div>
            </div>

            {/* Sections List */}
            <div className="space-y-4">
              {sections?.map((section, sIdx) => (
                <div key={section.id} className="glass-card overflow-hidden">
                  <div className="flex items-center justify-between p-4 bg-card">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xs text-muted-foreground font-mono bg-secondary px-2 py-1 rounded">
                        {sIdx + 1}
                      </span>
                      <Layers className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="font-medium text-foreground text-sm truncate">{section.title}</span>
                      <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded flex-shrink-0">
                        {section.section_type} · {((section.lessons as any[]) || []).length} lessons
                      </span>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" onClick={() => {
                        setAddingLessonToSection(section.id);
                        setLessonForm({ title: "", video_url: "", material_url: "", is_free: false });
                      }} className="border-primary/50 text-primary hover:bg-primary/10">
                        <Plus className="w-3 h-3 mr-1" /> Lesson
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        if (confirm("Delete this section and all its lessons?")) deleteSection.mutate(section.id);
                      }}
                        className="border-destructive/50 text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Add Lesson Form */}
                  {addingLessonToSection === section.id && (
                    <div className="p-4 bg-primary/5 border-t border-border/20 space-y-3 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                          value={lessonForm.title}
                          onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                          placeholder="Lesson title"
                          className="bg-secondary/50 border-border/50"
                        />
                        <Input
                          value={lessonForm.video_url}
                          onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                          placeholder="YouTube or video URL (optional)"
                          className="bg-secondary/50 border-border/50"
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <Input
                          value={lessonForm.material_url}
                          onChange={(e) => setLessonForm({ ...lessonForm, material_url: e.target.value })}
                          placeholder="Paste Google Drive / Dropbox link for slides (optional)"
                          className="bg-secondary/50 border-border/50"
                        />
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="inline-flex items-center gap-2 text-sm text-primary cursor-pointer border border-primary/40 rounded-lg px-3 py-2 hover:bg-primary/10">
                            {uploadingMaterial ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                            Upload class slides
                            <input
                              type="file"
                              className="hidden"
                              disabled={uploadingMaterial}
                              accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,.png,.jpg,.jpeg"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = "";
                                if (file) handleMaterialUpload(file);
                              }}
                            />
                          </label>
                          {isStoredMaterial(lessonForm.material_url) && (
                            <span className="text-xs text-success truncate max-w-[240px]">
                              Uploaded: {lessonForm.material_url.split("/").pop()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-foreground/80">
                          <input
                            type="checkbox"
                            checked={lessonForm.is_free}
                            onChange={(e) => setLessonForm({ ...lessonForm, is_free: e.target.checked })}
                            className="accent-primary w-4 h-4"
                          />
                          Free preview lesson
                        </label>
                        <div className="flex gap-2 ml-auto">
                          <Button size="sm" onClick={() => addLesson.mutate(section.id)} disabled={!lessonForm.title || addLesson.isPending}
                            className="btn-primary">
                            {addLesson.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                            Add Lesson
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setAddingLessonToSection(null)}>Cancel</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lessons */}
                  {((section.lessons as any[]) || [])
                    .sort((a: any, b: any) => a.sort_order - b.sort_order)
                    .map((lesson: any, lIdx: number) => (
                      <div key={lesson.id} className="flex items-center justify-between px-4 py-3 border-t border-border/10 hover:bg-secondary/20 transition-colors group">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs text-muted-foreground font-mono w-6">{lIdx + 1}.</span>
                          <Video className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm text-foreground/80 truncate">{lesson.title}</span>
                          {lesson.is_free && (
                            <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded flex-shrink-0">Free</span>
                          )}
                          {lesson.video_url && (
                            <LinkIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          )}
                          {lesson.material_url && (
                            <FileText className="w-3 h-3 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <Button size="sm" variant="ghost"
                          onClick={() => { if (confirm("Delete this lesson?")) deleteLesson.mutate(lesson.id); }}
                          className="text-destructive hover:text-destructive/80 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}

                  {((section.lessons as any[]) || []).length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground border-t border-border/10">
                      No lessons yet. Click "+ Lesson" to add one.
                    </div>
                  )}
                </div>
              ))}

              {(!sections || sections.length === 0) && (
                <div className="glass-card p-12 text-center">
                  <Layers className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No sections yet. Add your first section above.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== MAIN ADMIN VIEW =====
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-display font-bold text-foreground">Admin Dashboard</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/files")}>
                <FolderOpen className="w-4 h-4 mr-1" /> Files
              </Button>
              <Button variant="ghost" size="sm" onClick={() => {
                queryClient.invalidateQueries();
                toast({ title: "Data refreshed!" });
              }}>
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
            {[
              { key: "dashboard", icon: BarChart3, label: "Overview" },
              { key: "courses", icon: Package, label: "Courses" },
              { key: "orders", icon: Users, label: "Orders", badge: pendingOrders },
              { key: "enrollments", icon: UserPlus, label: "Enrollments" },
              { key: "users", icon: Users, label: "Users" },
              { key: "settings", icon: Settings2, label: "Website" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground border border-border/50"
                }`}
              >
                <tab.icon className="w-4 h-4" /> {tab.label}
                {tab.badge ? (
                  <span className="bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full ml-1">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            ))}
            <button
              onClick={() => navigate("/admin/files")}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-card text-muted-foreground hover:text-foreground border border-border/50"
            >
              <FolderOpen className="w-4 h-4" /> Files
            </button>
          </div>

          {/* ===== DASHBOARD TAB ===== */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-5">
                  <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                  <p className="text-2xl font-display font-bold text-primary">৳{totalRevenueBDT.toLocaleString()}</p>
                </div>
                <div className="glass-card p-5">
                  <p className="text-xs text-muted-foreground mb-1">Pending Orders</p>
                  <p className="text-2xl font-display font-bold text-primary">{pendingOrders}</p>
                </div>
                <div className="glass-card p-5">
                  <p className="text-xs text-muted-foreground mb-1">Total Enrollments</p>
                  <p className="text-2xl font-display font-bold text-foreground">{totalEnrollments}</p>
                </div>
              </div>

              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">Class materials storage (5 GB quota)</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(storageUsed)} / {formatBytes(STORAGE_QUOTA_BYTES)} · {storagePercent}%
                  </p>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${storagePercent}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                  <p className="text-xs text-muted-foreground mb-3">Courses</p>
                  <p className="text-lg font-display font-bold text-foreground">{courses?.length || 0} total · {publishedCourses} published</p>
                </div>
                <div className="glass-card p-5">
                  <p className="text-xs text-muted-foreground mb-3">Total Orders</p>
                  <p className="text-lg font-display font-bold text-foreground">{orders?.length || 0}</p>
                </div>
              </div>

              <div className="glass-card p-5">
                <p className="text-xs text-muted-foreground mb-2">Live Website Settings</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <p className="text-foreground/90">bKash: <span className="font-mono">{siteSettings?.payment_bkash || defaultSiteSettings.payment_bkash}</span></p>
                  <p className="text-foreground/90">Nagad: <span className="font-mono">{siteSettings?.payment_nagad || defaultSiteSettings.payment_nagad}</span></p>
                </div>
              </div>

              {/* Recent Pending Orders */}
              {pendingOrders > 0 && (
                <div>
                  <h3 className="font-display font-semibold text-foreground mb-3">⚡ Pending Orders</h3>
                  <div className="space-y-2">
                    {orders?.filter((o: any) => o.status === "pending").slice(0, 5).map((order: any) => (
                      <div key={order.id} className="glass-card p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm">{order.full_name}</p>
                          <p className="text-xs text-muted-foreground">{order.email} · {(order.courses as any)?.title}</p>
                          {order.transaction_id && <p className="text-xs text-primary">TrxID: {order.transaction_id}</p>}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" onClick={() => updateOrderStatus.mutate({ id: order.id, status: "verified" })}
                            className="bg-success hover:bg-success/90 text-success-foreground">
                            <CheckCircle className="w-3 h-3 mr-1" /> Verify
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateOrderStatus.mutate({ id: order.id, status: "rejected" })}
                            className="border-destructive/50 text-destructive">
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== COURSES TAB ===== */}
          {activeTab === "courses" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex gap-3 flex-wrap">
                {!showForm && (
                  <Button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
                    <Plus className="w-4 h-4 mr-2" /> New Course
                  </Button>
                )}
              </div>

              {showForm && (
                <div className="glass-card p-6 animate-fade-in">
                  <h3 className="font-display font-semibold text-foreground mb-4">
                    {editingCourse ? "Edit Course" : "Create New Course"}
                  </h3>
                  <form onSubmit={(e) => { e.preventDefault(); saveCourse.mutate(); }} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground/80">Course Title *</Label>
                        <Input value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                          className="bg-secondary/50 border-border/50" placeholder="e.g. HSC Physics Complete Course" required />
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
                        className="bg-secondary/50 border-border/50" rows={4}
                        placeholder="Detailed course description... (supports multiple lines)" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground/80">Thumbnail Image URL</Label>
                        <Input value={courseForm.image_url} onChange={(e) => setCourseForm({ ...courseForm, image_url: e.target.value })}
                          className="bg-secondary/50 border-border/50" placeholder="https://..." />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground/80">YouTube Preview Video URL</Label>
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
                          className="bg-secondary/50 border-border/50" placeholder="e.g. DU, BUET" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground/80">Price BDT ৳</Label>
                        <Input type="number" value={courseForm.price_bdt} onChange={(e) => setCourseForm({ ...courseForm, price_bdt: e.target.value })}
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
                      <div className="space-y-2">
                        <Label className="text-foreground/80">Materials</Label>
                        <Input type="number" value={courseForm.total_materials} onChange={(e) => setCourseForm({ ...courseForm, total_materials: e.target.value })}
                          className="bg-secondary/50 border-border/50" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground/80">Promo Code</Label>
                        <Input value={courseForm.promo_code} onChange={(e) => setCourseForm({ ...courseForm, promo_code: e.target.value })}
                          className="bg-secondary/50 border-border/50" placeholder="SAVE20" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground/80">Discount %</Label>
                        <Input type="number" value={courseForm.discount_percent} onChange={(e) => setCourseForm({ ...courseForm, discount_percent: e.target.value })}
                          className="bg-secondary/50 border-border/50" placeholder="0" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground/80">Group Link</Label>
                        <Input value={courseForm.group_link} onChange={(e) => setCourseForm({ ...courseForm, group_link: e.target.value })}
                          className="bg-secondary/50 border-border/50" placeholder="https://t.me/..." />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-foreground/80">
                        <input type="checkbox" checked={courseForm.is_published}
                          onChange={(e) => setCourseForm({ ...courseForm, is_published: e.target.checked })}
                          className="accent-primary w-4 h-4" />
                        Published (visible to students)
                      </label>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button type="submit" disabled={saveCourse.isPending} className="btn-primary px-6">
                        {saveCourse.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        {editingCourse ? "Update Course" : "Create Course"}
                      </Button>
                      <Button type="button" variant="outline" onClick={resetForm} className="border-border/50">Cancel</Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Course List */}
              {coursesLoading ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="glass-card h-20 animate-pulse" />)}</div>
              ) : (
                <div className="space-y-3">
                  {courses?.map((course: any) => (
                    <div key={course.id} className="glass-card p-4 flex items-center justify-between gap-4 course-card-hover">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        {course.image_url && (
                          <img referrerPolicy="no-referrer" src={course.image_url} alt="" className="w-16 h-12 rounded-lg object-cover flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-foreground truncate">{course.title}</h4>
                            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">{course.category}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            ৳{course.price_bdt}
                            {course.discount_percent > 0 && (
                              <span className="text-primary ml-2">-{course.discount_percent}%</span>
                            )}
                            {course.enrolled_count > 0 && (
                              <span className="ml-2">· {course.enrolled_count} enrolled</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Button size="sm" variant="ghost"
                          onClick={() => togglePublish.mutate({ id: course.id, published: !course.is_published })}
                          className={course.is_published ? "text-success" : "text-muted-foreground"}>
                          {course.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setManagingSections(course.id)} className="text-primary">
                          <Layers className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(course)} className="text-foreground/70">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost"
                          onClick={() => { if (confirm(`Delete "${course.title}"?`)) deleteCourse.mutate(course.id); }}
                          className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!courses || courses.length === 0) && (
                    <div className="glass-card p-12 text-center">
                      <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">No courses yet. Create your first course!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== ORDERS TAB ===== */}
          {activeTab === "orders" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or TrxID..."
                    className="pl-10 bg-secondary/50 border-border/50"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(["all", "pending", "verified", "rejected"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setOrderFilter(f)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all capitalize ${
                        orderFilter === f
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground border border-border/50"
                      }`}
                    >
                      {f} {f !== "all" && `(${orders?.filter((o: any) => o.status === f).length || 0})`}
                    </button>
                  ))}
                </div>
              </div>

              {ordersLoading ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="glass-card h-24 animate-pulse" />)}</div>
              ) : filteredOrders && filteredOrders.length > 0 ? (
                <div className="space-y-3">
                  {filteredOrders.map((order: any) => (
                    <div key={order.id} className="glass-card p-4 animate-fade-in">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">{order.full_name}</p>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              order.status === "verified" ? "bg-success/20 text-success" :
                              order.status === "rejected" ? "bg-destructive/20 text-destructive" :
                              "bg-primary/20 text-primary"
                            }`}>
                              {order.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{order.email} · {order.phone}</p>
                          <p className="text-sm text-primary">
                            {(order.courses as any)?.title} — ৳{order.amount}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.payment_method}
                            {order.transaction_id && (
                              <span className="ml-1 font-mono bg-secondary px-1.5 py-0.5 rounded">TrxID: {order.transaction_id}</span>
                            )}
                            {order.country && ` · ${order.country}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {order.status === "pending" && (
                            <>
                              <Button size="sm" onClick={() => updateOrderStatus.mutate({ id: order.id, status: "verified" })}
                                disabled={updateOrderStatus.isPending}
                                className="bg-success hover:bg-success/90 text-success-foreground">
                                <CheckCircle className="w-4 h-4 mr-1" /> Verify & Enroll
                              </Button>
                              <Button size="sm" variant="outline"
                                onClick={() => updateOrderStatus.mutate({ id: order.id, status: "rejected" })}
                                disabled={updateOrderStatus.isPending}
                                className="border-destructive/50 text-destructive">
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-card p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No orders found</p>
                </div>
              )}
            </div>
          )}

          {/* ===== ENROLLMENTS TAB ===== */}
          {activeTab === "enrollments" && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm text-muted-foreground mb-4">
                Students are automatically enrolled when you verify their orders. Total: {enrollments?.length || 0}
              </p>
              {enrollmentsLoading ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="glass-card h-20 animate-pulse" />)}</div>
              ) : enrollments && enrollments.length > 0 ? (
                enrollments.map((enrollment: any) => (
                  <div key={enrollment.id} className="glass-card p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        User: <span className="font-mono text-muted-foreground">{enrollment.user_id.slice(0, 8)}...</span>
                      </p>
                      <p className="text-sm text-primary">{(enrollment.courses as any)?.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(enrollment.enrolled_at).toLocaleDateString()}</p>
                    </div>
                    <Button size="sm" variant="ghost"
                      onClick={() => { if (confirm("Remove this enrollment?")) deleteEnrollment.mutate(enrollment.id); }}
                      className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="glass-card p-12 text-center">
                  <UserPlus className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No enrollments yet. Verify orders to auto-enroll students.</p>
                </div>
              )}
            </div>
          )}

          {/* ===== WEBSITE SETTINGS TAB ===== */}
          {activeTab === "settings" && (
            <div className="space-y-6 animate-fade-in">
              {/* Payment Numbers */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <h3 className="font-display font-semibold text-foreground">Payment Numbers</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  These numbers are shown in checkout on mobile, tablet and desktop.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground/80">bKash Number</Label>
                    <Input
                      value={siteSettingsForm.payment_bkash}
                      onChange={(e) => setSiteSettingsForm({ ...siteSettingsForm, payment_bkash: e.target.value })}
                      className="bg-secondary/50 border-border/50"
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground/80">Nagad Number</Label>
                    <Input
                      value={siteSettingsForm.payment_nagad}
                      onChange={(e) => setSiteSettingsForm({ ...siteSettingsForm, payment_nagad: e.target.value })}
                      className="bg-secondary/50 border-border/50"
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                </div>
              </div>

              {/* Website Colors */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="w-4 h-4 text-primary" />
                  <h3 className="font-display font-semibold text-foreground">Website Colors (Instant Update)</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Changes apply instantly across the whole site — no reload needed.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground/80">Hue (0-360)</Label>
                    <Input
                      type="number" min={0} max={360}
                      value={siteSettingsForm.primary_hue}
                      onChange={(e) => setSiteSettingsForm({ ...siteSettingsForm, primary_hue: e.target.value })}
                      className="bg-secondary/50 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground/80">Saturation (0-100)</Label>
                    <Input
                      type="number" min={0} max={100}
                      value={siteSettingsForm.primary_saturation}
                      onChange={(e) => setSiteSettingsForm({ ...siteSettingsForm, primary_saturation: e.target.value })}
                      className="bg-secondary/50 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground/80">Lightness (0-100)</Label>
                    <Input
                      type="number" min={0} max={100}
                      value={siteSettingsForm.primary_lightness}
                      onChange={(e) => setSiteSettingsForm({ ...siteSettingsForm, primary_lightness: e.target.value })}
                      className="bg-secondary/50 border-border/50"
                    />
                  </div>
                </div>
                {/* Color preview */}
                <div className="mt-4 flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg border border-border/30"
                    style={{ backgroundColor: `hsl(${siteSettingsForm.primary_hue}, ${siteSettingsForm.primary_saturation}%, ${siteSettingsForm.primary_lightness}%)` }}
                  />
                  <span className="text-sm text-muted-foreground">
                    Preview: hsl({siteSettingsForm.primary_hue}, {siteSettingsForm.primary_saturation}%, {siteSettingsForm.primary_lightness}%)
                  </span>
                </div>
              </div>

              {/* Homepage Stats */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <h3 className="font-display font-semibold text-foreground">Homepage Stats Bar</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Edit the numbers shown in the stats section below the hero.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground/80">Students</Label>
                    <Input
                      value={siteSettingsForm.stat_students}
                      onChange={(e) => setSiteSettingsForm({ ...siteSettingsForm, stat_students: e.target.value })}
                      className="bg-secondary/50 border-border/50"
                      placeholder="10k+"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground/80">Lessons</Label>
                    <Input
                      value={siteSettingsForm.stat_lessons}
                      onChange={(e) => setSiteSettingsForm({ ...siteSettingsForm, stat_lessons: e.target.value })}
                      className="bg-secondary/50 border-border/50"
                      placeholder="500+"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground/80">Instructors</Label>
                    <Input
                      value={siteSettingsForm.stat_instructors}
                      onChange={(e) => setSiteSettingsForm({ ...siteSettingsForm, stat_instructors: e.target.value })}
                      className="bg-secondary/50 border-border/50"
                      placeholder="50+"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground/80">Materials</Label>
                    <Input
                      value={siteSettingsForm.stat_materials}
                      onChange={(e) => setSiteSettingsForm({ ...siteSettingsForm, stat_materials: e.target.value })}
                      className="bg-secondary/50 border-border/50"
                      placeholder="1k+"
                    />
                  </div>
                </div>
              </div>

              {/* Hero Image */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Image className="w-4 h-4 text-primary" />
                  <h3 className="font-display font-semibold text-foreground">Hero Background Image</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Add a background image to the hero section. Leave empty for the default gradient.
                </p>
                <div className="space-y-2">
                  <Label className="text-foreground/80">Image URL</Label>
                  <Input
                    value={siteSettingsForm.hero_image_url}
                    onChange={(e) => setSiteSettingsForm({ ...siteSettingsForm, hero_image_url: e.target.value })}
                    className="bg-secondary/50 border-border/50"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
                {siteSettingsForm.hero_image_url && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-border/30 max-w-sm">
                    <img referrerPolicy="no-referrer" src={siteSettingsForm.hero_image_url} alt="Hero preview" className="w-full h-32 object-cover" />
                  </div>
                )}
              </div>

              {/* Homepage Text */}
              <div className="glass-card p-5">
                <h3 className="font-display font-semibold text-foreground mb-2">Homepage Text</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Edit landing page hero texts without touching code.
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-foreground/80">Badge Text</Label>
                    <Input
                      value={siteSettingsForm.hero_badge}
                      onChange={(e) => setSiteSettingsForm({ ...siteSettingsForm, hero_badge: e.target.value })}
                      className="bg-secondary/50 border-border/50"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-foreground/80">Hero Title</Label>
                      <Input
                        value={siteSettingsForm.hero_title}
                        onChange={(e) => setSiteSettingsForm({ ...siteSettingsForm, hero_title: e.target.value })}
                        className="bg-secondary/50 border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground/80">Hero Highlight</Label>
                      <Input
                        value={siteSettingsForm.hero_highlight}
                        onChange={(e) => setSiteSettingsForm({ ...siteSettingsForm, hero_highlight: e.target.value })}
                        className="bg-secondary/50 border-border/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground/80">Hero Description</Label>
                    <Textarea
                      value={siteSettingsForm.hero_description}
                      onChange={(e) => setSiteSettingsForm({ ...siteSettingsForm, hero_description: e.target.value })}
                      rows={3}
                      className="bg-secondary/50 border-border/50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => saveSiteSettings.mutate()}
                  disabled={saveSiteSettings.isPending || siteSettingsLoading}
                  className="btn-primary"
                >
                  {saveSiteSettings.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save Website Settings
                </Button>
              </div>
            </div>
          )}

          {/* ===== USERS TAB ===== */}
          {activeTab === "users" && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  Registered users: {profiles?.length || 0}
                </p>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name or email"
                    className="pl-9 bg-secondary/50 border-border/50 text-sm"
                  />
                </div>
              </div>
              {profilesLoading ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="glass-card h-20 animate-pulse" />)}</div>
              ) : profiles && profiles.length > 0 ? (
                (() => {
                  const q = userSearch.trim().toLowerCase();
                  const filteredProfiles = q
                    ? profiles.filter(
                        (p: any) =>
                          p.full_name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q),
                      )
                    : profiles;

                  if (filteredProfiles.length === 0) {
                    return (
                      <div className="glass-card p-12 text-center">
                        <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">No users match "{userSearch}".</p>
                      </div>
                    );
                  }

                  return filteredProfiles.map((profile: any) => {
                    const userIsAdmin = adminUserIds.has(profile.id);
                    const isSelf = profile.id === session?.user?.id;
                    return (
                      <div key={profile.id} className="glass-card p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm flex items-center gap-2">
                            {profile.full_name || "Unknown"}
                            {userIsAdmin && (
                              <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                                Admin
                              </span>
                            )}
                            {isSelf && (
                              <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full flex-shrink-0">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{profile.email}</p>
                        </div>
                        <p className="text-xs text-muted-foreground ml-auto hidden sm:block">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </p>
                        {userIsAdmin ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={toggleAdminRole.isPending}
                            onClick={() => {
                              if (confirm(`Remove admin access for ${profile.full_name || profile.email}?`)) {
                                toggleAdminRole.mutate({ userId: profile.id, makeAdmin: false });
                              }
                            }}
                            className="border-destructive/50 text-destructive hover:bg-destructive/10 flex-shrink-0"
                          >
                            <ShieldOff className="w-3.5 h-3.5 mr-1" /> Demote
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={toggleAdminRole.isPending}
                            onClick={() => toggleAdminRole.mutate({ userId: profile.id, makeAdmin: true })}
                            className="border-primary/50 text-primary hover:bg-primary/10 flex-shrink-0"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Make Admin
                          </Button>
                        )}
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="glass-card p-12 text-center">
                  <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No users registered yet.</p>
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
