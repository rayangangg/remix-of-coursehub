import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, CheckCircle, CreditCard, Smartphone, Loader2 } from "lucide-react";

interface Course {
  id: string;
  title: string;
  price_bdt: number;
  price_usd: number;
}

const PaymentForm = ({ course }: { course: Course }) => {
  const [tab, setTab] = useState<"local" | "international">("local");
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    transactionId: "",
    country: "",
  });

  const copyNumber = (number: string, label: string) => {
    navigator.clipboard.writeText(number);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
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
        amount: isLocal ? course.price_bdt : course.price_usd,
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
      <div className="text-center mb-6">
        <p className="text-sm text-muted-foreground mb-1">Course Price</p>
        <div className="flex items-center justify-center gap-4">
          <span className="text-3xl font-display font-bold text-primary">৳{course.price_bdt}</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-xl font-display font-semibold text-foreground/70">${course.price_usd}</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex rounded-2xl bg-secondary/50 p-1 mb-6">
        <button
          onClick={() => setTab("local")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
            tab === "local"
              ? "bg-primary text-primary-foreground glow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Smartphone className="w-4 h-4" />
          bKash / Nagad
        </button>
        <button
          onClick={() => setTab("international")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
            tab === "international"
              ? "bg-primary text-primary-foreground glow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          International
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {tab === "local" && (
          <div className="space-y-3 mb-4">
            {/* bKash */}
            <div className="rounded-2xl border border-bkash/30 bg-bkash/5 p-4">
              <p className="text-xs text-muted-foreground mb-1">bKash (Personal)</p>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-foreground">01633005730</span>
                <button
                  type="button"
                  onClick={() => copyNumber("01633005730", "bkash")}
                  className="flex items-center gap-1 text-xs text-bkash hover:text-bkash/80 transition-colors"
                >
                  {copied === "bkash" ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === "bkash" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Nagad */}
            <div className="rounded-2xl border border-nagad/30 bg-nagad/5 p-4">
              <p className="text-xs text-muted-foreground mb-1">Nagad (Personal)</p>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-foreground">01711950646</span>
                <button
                  type="button"
                  onClick={() => copyNumber("01711950646", "nagad")}
                  className="flex items-center gap-1 text-xs text-nagad hover:text-nagad/80 transition-colors"
                >
                  {copied === "nagad" ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === "nagad" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-foreground/80 text-sm">Full Name</Label>
          <Input
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="Your full name"
            className="bg-secondary/50 border-border/50"
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground/80 text-sm">Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@email.com"
            className="bg-secondary/50 border-border/50"
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground/80 text-sm">Phone Number</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+880..."
            className="bg-secondary/50 border-border/50"
            required
          />
        </div>

        {tab === "local" ? (
          <div className="space-y-2">
            <Label className="text-foreground/80 text-sm">Transaction ID (TrxID)</Label>
            <Input
              value={form.transactionId}
              onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
              placeholder="e.g. ABC12345"
              className="bg-secondary/50 border-border/50"
              required
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-foreground/80 text-sm">Country</Label>
            <Input
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              placeholder="Your country"
              className="bg-secondary/50 border-border/50"
              required
            />
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground glow-sm font-semibold py-5 rounded-2xl"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          {tab === "local" ? "Verify & Enroll Now" : "Confirm Order & Get Link"}
        </Button>
      </form>
    </div>
  );
};

export default PaymentForm;
