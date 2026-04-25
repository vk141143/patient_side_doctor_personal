import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Clock, FileSearch, Shield, Edit, MessageCircle, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileContainer } from "@/components/layout/MobileContainer";

interface VerificationStatusScreenProps {
  onApproved: () => void;
  onLogin?: () => void;
}

export function VerificationStatusScreen({ onApproved, onLogin }: VerificationStatusScreenProps) {
  const steps = [
    { id: 1, label: "Documents submitted", status: "completed", icon: FileSearch },
    { id: 2, label: "Identity verified", status: "pending", icon: Shield },
    { id: 3, label: "Medical credentials verified", status: "pending", icon: Stethoscope },
    { id: 4, label: "Admin approval", status: "pending", icon: Check },
  ];

  return (
    <MobileContainer>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        {/* Header */}
        <header className="shrink-0 p-6 flex items-center justify-center border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">MediConnect</span>
          </div>
        </header>

        {/* Scrollable content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="max-w-md mx-auto px-6 py-10 flex flex-col items-center text-center animate-slide-up">

            {/* Status Icon */}
            <div className="relative w-24 h-24 mb-6">
              <div className="w-24 h-24 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="w-12 h-12 text-warning" />
              </div>
              <div className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full bg-success flex items-center justify-center">
                <Check className="w-5 h-5 text-success-foreground" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-2">Your profile is under review</h1>
            <p className="text-muted-foreground mb-8">
              Estimated verification time:{" "}
              <span className="font-semibold text-foreground">24–48 hours</span>
            </p>

            {/* Progress Tracker */}
            <div className="w-full bg-card rounded-xl border border-border p-6 mb-8 text-left">
              <h3 className="font-semibold text-foreground mb-4">Verification Progress</h3>
              <div className="space-y-4">
                {steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        step.status === "completed"
                          ? "bg-success text-success-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {step.status === "completed" ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <step.icon className="w-5 h-5" />
                      )}
                    </div>
                    <p className={cn("flex-1 font-medium", step.status === "completed" ? "text-success" : "text-foreground")}>
                      {step.label}
                    </p>
                    {step.status === "completed" ? (
                      <span className="text-sm text-success">✓ Done</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">⏳ Pending</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="w-full space-y-3">
              <Button variant="outline" size="lg" className="w-full">
                <Edit className="w-4 h-4 mr-2" />
                Edit Submitted Details
              </Button>
            </div>

            {/* Already have account */}
            <p className="mt-6 text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                onClick={onLogin}
                className="text-primary font-medium hover:underline"
              >
                Login
              </button>
            </p>
          </div>
        </ScrollArea>
      </div>
    </MobileContainer>
  );
}
