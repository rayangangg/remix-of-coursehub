import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Copy, CheckCircle, Loader2, Tag, LogIn } from "lucide-react";

interface Course {
  id: string;
  title: string;
  price_bdt: number;
  promo_code?: string | null;
  discount_percent?: number | null;
}

const PaymentForm = ({ course }: { course: Course }) => {
  const { session } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const { toast } = useToast();
  const { data: siteSettings } = useSiteSettings();

  const paymentNumbers = useMemo(
    () => ({
      bkash: siteSettings?.payment_bkash?.trim() || "01633005730",
      nagad: siteSettings?.payment_nagad?.trim() || "01711950646",
    }),
    [siteSettings],
  );

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    transactionId: "",
  });

  // Auto-fill name from profile / auth metadata
  useEffect(() => {
    if (!session?.user) return;
    const metaName =
      (session.user.user_metadata?.full_name as string) ||
      (session.user.user_metadata?.name as string) ||
      "";
    setForm((prev) => ({
      ...prev,
      fullName: prev.fullName || metaName,
    }));

    // profiles থেকে নাম আনার চেষ্টা
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .maybeSingle();
      if (data?.full_name) {
        setForm((prev) => ({ ...prev, fullName: data.full_name || prev.fullName }));
      }
    })();
  }, [session?.user?.id]);

  const discount = promoApplied && course.discount_percent ? course.discount_percent : 0;
  const finalBDT = Math.round(course.price_bdt * (1 - discount / 100));

  const copyNumber = (number: string, label: string) => {
    navigator.clipboard.writeText(number);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const applyPromo = () => {
    if (course.promo_code && promoInput.trim().toUpperCase() === course.promo_code.toUpperCase()) {
      setPromoApplied(true);
      toast({ title: `Promo applied! ${course.discount_percent}% off` });
    } else {
      toast({ title: "Invalid promo code", variant: "destructive" });
    }
  };

  // Login ছাড়া form দেখাবে না
  if (!session?.user) {
    return (
      <div className="glass-card p-6 text-center space-y-4 animate-fade-in">
        <LogIn className="w-10 h-10 text-primary mx-auto" />
        <h3 className="font-display font-bold text-lg text-foreground">Login required</h3>
        <p className="text-sm text-muted-foreground">
          Course কিনতে আগে Sign in / Sign up করুন। আপনার account email দিয়েই order যাবে।
        </p>
        <Button asChild className="w-full btn-primary">
          <Link to="/auth">Sign in to buy</Link>
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    setLoading(true);
    try {
      const email = (session.user.email || "").trim().toLowerCase();
      if (!email) throw new Error("Your account has no email. Please update your profile.");

      const { error } = await supabase.from("orders").insert({
        course_id: course.id,
        full_name: form.fullName.trim() || email,
        email,
        phone: form.phone.trim(),
        country: "Bangladesh",
        payment_method: "bkash/nagad",
        transaction_id: form.transactionId.trim(),
        currency: "BDT",
        amount: finalBDT,
        user_id: session.user.id,
        status: "pending",
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: any) {
      const isDuplicate = error?.code === "23505";
      toast({
        title: isDuplicate ? "Already requested" : "Error",
        description: isDuplicate
          ? "You already requested enrollment for this course. We're reviewing your payment — no need to submit again."
          : error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="glass-card p-8 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h3 className="text-xl font-display font-bold text-foreground mb-2">Thank You!</h3>
        <p className="text-muted-foreground text-sm">
          Your enrollment request has been submitted with{" "}
          <span className="text-foreground font-medium">{session.user.email}</span>.
          We will verify your payment shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 sticky top-24 animate-fade-in">
      <div className="text-center mb-5">
        <p className="text-xs text-muted-foreground mb-1">Course Price</p>
        {discount > 0 ? (
          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-lg text-muted-foreground line-through">৳{course.price_bdt}</span>
              <span className="text-2xl font-display font-bold text-primary">৳{finalBDT}</span>
            </div>
            <p className="text-xs text-success">-{discount}% discount applied!</p>
          </div>
        ) : (
          <p className="text-2xl font-display font-bold text-primary">৳{course.price_bdt}</p>
        )}
      </div>

      {/* Promo */}
      {course.promo_code && (
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              placeholder="Promo code"
              className="pl-9 bg-secondary/50 border-border/50 text-sm"
            />
          </div>
          <Button size="sm" variant="outline" onClick={applyPromo} className="border-primary/50 text-primary">
            Apply
          </Button>
        </div>
      )}

      {/* Payment numbers */}
      <div className="space-y-2 mb-4">
        <div className="rounded-lg border border-bkash/30 bg-bkash/5 p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">bKash (Personal)</p>
            <p className="font-mono font-semibold text-foreground">{paymentNumbers.bkash}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => copyNumber(paymentNumbers.bkash, "bkash")}>
            {copied === "bkash" ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <div className="rounded-lg border border-nagad/30 bg-nagad/5 p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Nagad (Personal)</p>
            <p className="font-mono font-semibold text-foreground">{paymentNumbers.nagad}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => copyNumber(paymentNumbers.nagad, "nagad")}>
            {copied === "nagad" ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Account email — read only, no separate email field */}
        <div className="space-y-1.5">
          <Label className="text-foreground/80 text-xs">Account Email</Label>
          <Input
            value={session.user.email || ""}
            disabled
            className="bg-secondary/30 border-border/50 text-muted-foreground"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-foreground/80 text-xs">Full Name</Label>
          <Input
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="Your full name"
            className="bg-secondary/50 border-border/50"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-foreground/80 text-xs">Phone Number</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+880..."
            className="bg-secondary/50 border-border/50"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-foreground/80 text-xs">Transaction ID (TrxID)</Label>
          <Input
            value={form.transactionId}
            onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
            placeholder="e.g. ABC12345"
            className="bg-secondary/50 border-border/50"
            required
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full btn-primary py-5 font-semibold">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Verify & Enroll Now
        </Button>
      </form>
    </div>
  );
};

export default PaymentForm;
