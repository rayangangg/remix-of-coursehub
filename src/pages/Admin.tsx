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
  Eye, EyeOff, Package, Users, Loader2
} from "lucide-react";

const Admin = () => {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"courses" | "orders">("courses");
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    image_url: "",
    price_bdt: "",
    price_usd: "",
    is_published: false,
  });

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, courses(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const saveCourse = useMutation({
    mutationFn: async () => {
      const payload = {
        title: courseForm.title,
        description: courseForm.description || null,
        image_url: courseForm.image_url || null,
        price_bdt: Number(courseForm.price_bdt) || 0,
        price_usd: Number(courseForm.price_usd) || 0,
        is_published: courseForm.is_published,
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

  const resetForm = () => {
    setCourseForm({ title: "", description: "", image_url: "", price_bdt: "", price_usd: "", is_published: false });
    setEditingCourse(null);
    setShowForm(false);
  };

  const startEdit = (course: any) => {
    setCourseForm({
      title: course.title,
      description: course.description || "",
      image_url: course.image_url || "",
      price_bdt: String(course.price_bdt),
      price_usd: String(course.price_usd),
      is_published: course.is_published,
    });
    setEditingCourse(course);
    setShowForm(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" />;
  if (!isAdmin) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-background bg-gradient-hero">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <h1 className="text-3xl font-display font-bold text-gradient mb-8">Admin Dashboard</h1>

          {/* Tabs */}
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setActiveTab("courses")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                activeTab === "courses" ? "bg-primary text-primary-foreground glow-sm" : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              <Package className="w-4 h-4" /> Courses
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                activeTab === "orders" ? "bg-primary text-primary-foreground glow-sm" : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4" /> Orders
              {orders && orders.filter((o: any) => o.status === "pending").length > 0 && (
                <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                  {orders.filter((o: any) => o.status === "pending").length}
                </span>
              )}
            </button>
          </div>

          {/* Courses Tab */}
          {activeTab === "courses" && (
            <div className="space-y-6">
              {!showForm && (
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground glow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Course
                </Button>
              )}

              {showForm && (
                <div className="glass-card p-6 animate-fade-in">
                  <h3 className="font-display font-semibold text-foreground mb-4">
                    {editingCourse ? "Edit Course" : "New Course"}
                  </h3>
                  <form
                    onSubmit={(e) => { e.preventDefault(); saveCourse.mutate(); }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label className="text-foreground/80">Title</Label>
                      <Input
                        value={courseForm.title}
                        onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                        className="bg-secondary/50 border-border/50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground/80">Description</Label>
                      <Textarea
                        value={courseForm.description}
                        onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                        className="bg-secondary/50 border-border/50"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground/80">Image URL</Label>
                      <Input
                        value={courseForm.image_url}
                        onChange={(e) => setCourseForm({ ...courseForm, image_url: e.target.value })}
                        className="bg-secondary/50 border-border/50"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground/80">Price (BDT) ৳</Label>
                        <Input
                          type="number"
                          value={courseForm.price_bdt}
                          onChange={(e) => setCourseForm({ ...courseForm, price_bdt: e.target.value })}
                          className="bg-secondary/50 border-border/50"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground/80">Price (USD) $</Label>
                        <Input
                          type="number"
                          value={courseForm.price_usd}
                          onChange={(e) => setCourseForm({ ...courseForm, price_usd: e.target.value })}
                          className="bg-secondary/50 border-border/50"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={courseForm.is_published}
                        onChange={(e) => setCourseForm({ ...courseForm, is_published: e.target.checked })}
                        id="published"
                        className="accent-primary"
                      />
                      <Label htmlFor="published" className="text-foreground/80">Published</Label>
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" disabled={saveCourse.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        {saveCourse.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {editingCourse ? "Update" : "Create"}
                      </Button>
                      <Button type="button" variant="outline" onClick={resetForm} className="border-border/50 text-foreground/80">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {coursesLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => <div key={i} className="glass-card h-20 animate-pulse" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {courses?.map((course: any) => (
                    <div key={course.id} className="glass-card p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground truncate">{course.title}</h4>
                          {course.is_published ? (
                            <Eye className="w-4 h-4 text-success flex-shrink-0" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">৳{course.price_bdt} / ${course.price_usd}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" variant="outline" onClick={() => startEdit(course)} className="border-border/50 text-foreground/80">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteCourse.mutate(course.id)}
                          className="border-destructive/50 text-destructive hover:bg-destructive/10"
                        >
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
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => <div key={i} className="glass-card h-20 animate-pulse" />)}
                </div>
              ) : orders && orders.length > 0 ? (
                orders.map((order: any) => (
                  <div key={order.id} className="glass-card p-4 animate-fade-in">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-1 min-w-0">
                        <p className="font-semibold text-foreground">{order.full_name}</p>
                        <p className="text-sm text-muted-foreground">{order.email} · {order.phone}</p>
                        <p className="text-sm text-primary">
                          {(order.courses as any)?.title || "Unknown course"} —{" "}
                          {order.currency === "BDT" ? `৳${order.amount}` : `$${order.amount}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.payment_method} {order.transaction_id && `· TrxID: ${order.transaction_id}`}
                          {order.country && ` · ${order.country}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {order.status === "pending" ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus.mutate({ id: order.id, status: "verified" })}
                              className="bg-success hover:bg-success/90 text-success-foreground"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" /> Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateOrderStatus.mutate({ id: order.id, status: "rejected" })}
                              className="border-destructive/50 text-destructive"
                            >
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
        </div>
      </div>
    </div>
  );
};

export default Admin;
