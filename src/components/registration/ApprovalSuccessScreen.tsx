import { Button } from "@/components/ui/button";
import { Check, ArrowRight, LayoutDashboard, User, Stethoscope, PartyPopper } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MobileContainer } from "@/components/layout/MobileContainer";

export function ApprovalSuccessScreen() {
  const navigate = useNavigate();

  return (
    <MobileContainer>
      <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center justify-center border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold text-foreground">MediConnect</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-md w-full text-center animate-slide-up">
          {/* Success Animation */}
          <div className="relative w-28 h-28 mx-auto mb-6">
            <div className="w-28 h-28 rounded-full gradient-success flex items-center justify-center shadow-elevated animate-pulse-ring">
              <Check className="w-14 h-14 text-success-foreground" />
            </div>
            <div className="absolute -right-2 -top-2">
              <PartyPopper className="w-10 h-10 text-warning" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome, Dr. John Doe!
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Your profile is verified. You're ready to start consultations.
          </p>

          {/* Verification Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 rounded-full mb-8">
            <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center">
              <Check className="w-3 h-3 text-success-foreground" />
            </div>
            <span className="text-sm font-medium text-success">Verified Medical Professional</span>
          </div>

          {/* Stats Preview */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Consultations", value: "0" },
              { label: "Rating", value: "N/A" },
              { label: "Earnings", value: "₹0" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card rounded-xl border border-border p-4">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              variant="medical"
              size="xl"
              className="w-full"
              onClick={() => navigate("/dashboard")}
            >
              <LayoutDashboard className="w-5 h-5 mr-2" />
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => navigate("/profile")}
            >
              <User className="w-4 h-4 mr-2" />
              Complete Profile
            </Button>
          </div>
        </div>
      </main>
      </div>
    </MobileContainer>
  );
}
