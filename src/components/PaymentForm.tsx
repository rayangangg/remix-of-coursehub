import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, CheckCircle, CreditCard, Smartphone, Loader2, Tag } from "lucide-react";

interface Course {
  id: string;
  title: string;
  price_bdt: number;
  promo_code?: string | null;
  discount_percent?: number | null;
}

const PaymentForm = ({ course }: { course: Course }) => {
  const [tab, setTab] = useState<"local">("local");
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", transactionId: "", country: "",
  });

  const discount = promoApplied && course.discount_percent ? course.discount_percent : 0;
  const finalBDT = Math.round(course.price_bdt * (1 - discount / 100));
  const finalUSD = Math.round(course.price_usd * (1 - discount / 100) * 100) / 100;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isLocal = tab === "local";
      const { error } = await supabase.from("orders").insert({
        course_id: course.id,
        full_name: form.fullName,
        email: form.email,
        phone: form.phone,
        country: isLocal ? "Bangladesh" : form.country,
        payment_method: isLocal ? "bkash/nagad" : "international",
        transaction_id: isLocal ? form.transactionId : null,
        currency: isLocal ? "BDT" : "USD",
        amount: isLocal ? finalBDT : finalUSD,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
          {tab === "local"
            ? "Your enrollment request has been submitted! We will verify your payment and send you access details to your email shortly."
            : "We are preparing your secure payment link. Please check your email inbox (and spam folder) shortly to complete your enrollment."}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 sticky top-24 animate-fade-in">
      {/* Price Display */}
      <div className="text-center mb-5">
        <p className="text-xs text-muted-foreground mb-1">Course Price</p>
        {discount > 0 ? (
          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-lg text-muted-foreground line-through">৳{course.price_bdt}</span>
              <span className="text-2xl font-display font-bold text-primary">৳{finalBDT}</span>
            </div>
            <p className="text-xs text-success">-{discount}% discount applied!</p>
            <p className="text-sm text-muted-foreground mt-1">${finalUSD} USD</p>
          </div>
        ) : (
          <div>
            <p className="text-2xl font-display font-bold text-primary">BDT {course.price_bdt}</p>
            <p className="text-sm text-muted-foreground">${course.price_usd} USD</p>
          </div>
        )}
      </div>

      {/* Promo Code */}
      {course.promo_code && !promoApplied && (
        <div className="flex gap-2 mb-5">
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

      {/* Tab Switcher */}
      <div className="flex rounded-lg bg-secondary/50 p-1 mb-5">
        <button
          onClick={() => setTab("local")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "local" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Smartphone className="w-4 h-4" /> bKash / Nagad
        </button>
        <button
          onClick={() => setTab("international")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "international" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="w-4 h-4" /> International
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {tab === "local" && (
          <div className="space-y-2 mb-3">
            <div className="rounded-lg border border-bkash/30 bg-bkash/5 p-3">
              <p className="text-xs text-muted-foreground mb-1">bKash (Personal)</p>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-foreground text-sm">01633005730</span>
                <button type="button" onClick={() => copyNumber("01633005730", "bkash")}
                  className="flex items-center gap-1 text-xs text-bkash hover:text-bkash/80 transition-colors">
                  {copied === "bkash" ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === "bkash" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-nagad/30 bg-nagad/5 p-3">
              <p className="text-xs text-muted-foreground mb-1">Nagad (Personal)</p>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-foreground text-sm">01711950646</span>
                <button type="button" onClick={() => copyNumber("01711950646", "nagad")}
                  className="flex items-center gap-1 text-xs text-nagad hover:text-nagad/80 transition-colors">
                  {copied === "nagad" ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === "nagad" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Send <span className="text-primary font-semibold">৳{finalBDT}</span> to any number above, then fill in the form below
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-foreground/80 text-xs">Full Name</Label>
          <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="Your full name" className="bg-secondary/50 border-border/50" required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-foreground/80 text-xs">Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@email.com" className="bg-secondary/50 border-border/50" required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-foreground/80 text-xs">Phone Number</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+880..." className="bg-secondary/50 border-border/50" required />
        </div>

        {tab === "local" ? (
          <div className="space-y-1.5">
            <Label className="text-foreground/80 text-xs">Transaction ID (TrxID)</Label>
            <Input value={form.transactionId} onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
              placeholder="e.g. ABC12345" className="bg-secondary/50 border-border/50" required />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-foreground/80 text-xs">Country</Label>
            <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
              placeholder="Your country" className="bg-secondary/50 border-border/50" required />
          </div>
        )}

        <Button type="submit" disabled={loading}
          className="w-full btn-primary py-5 glow-sm font-semibold rounded-lg mt-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {tab === "local" ? "Verify & Enroll Now" : "Confirm Order & Get Link"}
        </Button>
      </form>
    </div>
  );
};

export default PaymentForm;
