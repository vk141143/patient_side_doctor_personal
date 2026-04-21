import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ChevronDown, ChevronUp, Mail, Star,
  MessageSquare, X, Send, Loader2,
} from "lucide-react";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { submitFeedback } from "@/lib/supabase";
import { getLocation } from "@/lib/location";
import { auth } from "@/lib/firebase";
import { useDoctor } from "@/hooks/useDoctor";

// ── FAQ data ──────────────────────────────────────────────────────────────────
const faqSections = [
  {
    section: "Registration & Verification",
    faqs: [
      {
        q: "How long does the verification process take?",
        a: "Admin verification typically takes 24–48 hours after you submit all required documents. You will be notified via email once approved.",
      },
      {
        q: "What documents are required for registration?",
        a: "You need your MBBS certificate number, post-graduation details (if applicable), medical council registration number, and bank account details for payouts.",
      },
      {
        q: "Can I edit my details after submission?",
        a: "You can contact support to update your details. Some fields like email and registration number require admin re-verification.",
      },
    ],
  },
  {
    section: "Consultations",
    faqs: [
      {
        q: "How do I receive consultation requests?",
        a: "When you are online and availability is turned on, patients can send you consultation requests. You will receive a popup notification in the app.",
      },
      {
        q: "What happens if I miss a consultation request?",
        a: "Missed requests are automatically declined after the timeout period. The patient is notified and can request another doctor.",
      },
      {
        q: "Can I set a limit on daily consultations?",
        a: "Yes. Go to Schedule & Availability and use the Daily Consultation Limits section to set your preferred limit for chat and OPD.",
      },
    ],
  },
  {
    section: "Payments & Earnings",
    faqs: [
      {
        q: "When do I receive my earnings?",
        a: "Earnings are settled weekly every Monday directly to your registered bank account. You can track all transactions in the Earnings section.",
      },
      {
        q: "What is the platform fee?",
        a: "The platform charges a small percentage per consultation. This is deducted automatically before payout. Check the Earnings section for a breakdown.",
      },
      {
        q: "How do I update my bank details?",
        a: "Bank detail changes require admin verification for security. Please contact support with your request and valid proof.",
      },
    ],
  },
  {
    section: "Technical Issues",
    faqs: [
      {
        q: "The app is loading slowly. What should I do?",
        a: "Try refreshing the page or clearing your browser cache. Ensure you have a stable internet connection. If the issue persists, contact support.",
      },
      {
        q: "I forgot my password. How do I reset it?",
        a: "On the login screen, tap 'Forgot Password', enter your registered email, and follow the reset link sent to your inbox.",
      },
      {
        q: "My profile data is not showing correctly.",
        a: "Try logging out and logging back in to refresh your session. If data is still incorrect, contact support with the specific field that needs correction.",
      },
    ],
  },
];

// ── Feedback bottom sheet ─────────────────────────────────────────────────────
function FeedbackSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { doctor } = useDoctor();
  const [type, setType] = useState<"feedback" | "complaint">("feedback");
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) { toast.error("Please write your message."); return; }
    setSubmitting(true);
    try {
      const loc = await getLocation();
      const uid = auth.currentUser?.uid ?? "";
      const { error } = await submitFeedback({
        firebase_uid: uid,
        doctor_name: doctor?.full_name ?? null,
        doctor_email: doctor?.email ?? null,
        type,
        rating: type === "feedback" ? (rating || null) : null,
        message: message.trim(),
        ...loc,
      });
      if (error) throw new Error(error.message);
      toast.success(
        type === "feedback"
          ? "Thank you for your feedback!"
          : "Complaint submitted. We'll respond within 24 hours."
      );
      setMessage("");
      setRating(0);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 z-40 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card rounded-t-2xl z-50 transition-transform duration-300 ease-out shadow-2xl",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="px-5 pb-8 pt-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-foreground">
              {type === "feedback" ? "Give Feedback" : "Submit Complaint"}
            </h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Type toggle */}
          <div className="flex bg-muted rounded-xl p-1 mb-5">
            {(["feedback", "complaint"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                  type === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                {t === "feedback" ? "💬 Feedback" : "⚠️ Complaint"}
              </button>
            ))}
          </div>

          {/* Star rating — only for feedback */}
          {type === "feedback" && (
            <div className="mb-4">
              <p className="text-sm font-medium text-foreground mb-2">Rate your experience</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onMouseEnter={() => setHovered(s)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(s)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "w-8 h-8 transition-colors",
                        s <= (hovered || rating)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-muted-foreground"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message */}
          <div className="mb-5">
            <p className="text-sm font-medium text-foreground mb-2">
              {type === "feedback" ? "Tell us more (optional)" : "Describe your issue"}
            </p>
            <Textarea
              placeholder={
                type === "feedback"
                  ? "What went well? What can we improve?"
                  : "Please describe the issue in detail..."
              }
              className="min-h-[100px] resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <Button className="w-full h-12 font-semibold" onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting…</>
              : <><Send className="w-4 h-4 mr-2" />Submit</>
            }
          </Button>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function HelpSupportPage() {
  const navigate = useNavigate();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const toggle = (key: string) => setOpenKey(openKey === key ? null : key);

  return (
    <MobileContainer>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-primary text-primary-foreground px-4 pt-12 pb-4 shrink-0 flex items-center gap-3">
          <button onClick={() => navigate("/profile")} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Help & Support</h1>
            <p className="text-primary-foreground/70 text-xs mt-0.5">FAQs & contact support</p>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="scrollable-content flex-1 min-h-0 px-4 py-5 space-y-6">

          {/* ── FAQ sections ── */}
          {faqSections.map((section) => (
            <div key={section.section}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {section.section}
              </p>
              <div className="space-y-2">
                {section.faqs.map((faq, i) => {
                  const key = `${section.section}-${i}`;
                  const isOpen = openKey === key;
                  return (
                    <div
                      key={key}
                      className={cn(
                        "rounded-xl border transition-all overflow-hidden",
                        isOpen ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                      )}
                    >
                      <button
                        className="w-full flex items-center justify-between p-4 text-left"
                        onClick={() => toggle(key)}
                      >
                        <div className="flex items-start gap-3 flex-1 pr-2">
                          <MessageSquare className={cn("w-4 h-4 mt-0.5 shrink-0", isOpen ? "text-primary" : "text-muted-foreground")} />
                          <span className={cn("text-sm font-medium", isOpen ? "text-primary" : "text-foreground")}>
                            {faq.q}
                          </span>
                        </div>
                        {isOpen
                          ? <ChevronUp className="w-4 h-4 text-primary shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        }
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4">
                          <p className="ml-7 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* ── Still need help card ── */}
          <div className="rounded-2xl border-2 border-primary/50 bg-primary/5 p-5 space-y-4">
            <div>
              <h3 className="font-semibold text-foreground text-base">Still need help?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Our support team is available Mon–Sat, 9 AM – 6 PM.
              </p>
            </div>

            {/* <Button
              variant="outline"
              className="w-full h-11 border-border font-medium"
              onClick={() => window.open("mailto:support@mediconnect.in")}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email us
            </Button> */}

            <Button
              variant="outline"
              className="w-full h-11 border-primary text-primary hover:bg-primary/10 font-medium"
              onClick={() => setSheetOpen(true)}
            >
              <Star className="w-4 h-4 mr-2" />
              Give Feedback / Complaint
            </Button>
          </div>

          <div className="h-4" />
        </div>
      </div>

      <FeedbackSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </MobileContainer>
  );
}
