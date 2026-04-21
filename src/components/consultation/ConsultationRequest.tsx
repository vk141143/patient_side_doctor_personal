import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Clock, 
  AlertTriangle, 
  Brain,
  User,
  Calendar,
  Activity,
  CheckCircle,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { MobileContainer } from "@/components/layout/MobileContainer";

export function ConsultationRequest() {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(12);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const symptoms = [
    { name: "Headache", duration: "3 days" },
    { name: "Fever", duration: "2 days" },
    { name: "Body ache", duration: "2 days" },
    { name: "Fatigue", duration: "1 week" },
  ];

  const redFlags = [
    "High temperature (102°F)",
    "Symptoms persisting > 48 hours",
  ];

  return (
    <MobileContainer>
      <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-foreground">New Consultation Request</h1>
          <div className="w-8" />
        </div>
      </header>

      {/* Timer */}
      <div className={cn(
        "mx-4 mt-4 p-4 rounded-xl flex items-center justify-center gap-3",
        timeLeft <= 5 ? "bg-urgent/10" : "bg-warning/10"
      )}>
        <Clock className={cn(
          "w-5 h-5",
          timeLeft <= 5 ? "text-urgent" : "text-warning"
        )} />
        <span className={cn(
          "font-semibold",
          timeLeft <= 5 ? "text-urgent" : "text-warning"
        )}>
          Auto-assign expires in {timeLeft} seconds
        </span>
      </div>

      {/* Main Content */}
      <main className="p-4 space-y-4">
        {/* Patient Info Card */}
        <div className="medical-card">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-foreground">Rajesh Kumar</h2>
                <span className="status-badge status-moderate">Moderate</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Male, 35 yrs</span>
                <span>•</span>
                <span>First Visit</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Primary Complaint</p>
            <p className="font-medium text-foreground">Persistent headache and fever</p>
          </div>
        </div>

        {/* AI Symptom Summary */}
        <div className="medical-card border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">AI Symptom Summary</h3>
              <p className="text-xs text-muted-foreground">Auto-extracted from patient input</p>
            </div>
          </div>

          {/* Symptoms List */}
          <div className="space-y-2 mb-4">
            {symptoms.map((symptom, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-card rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">{symptom.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {symptom.duration}
                </span>
              </div>
            ))}
          </div>

          {/* Red Flags */}
          {redFlags.length > 0 && (
            <div className="p-3 bg-urgent/10 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-urgent" />
                <span className="font-semibold text-urgent text-sm">Red Flags Detected</span>
              </div>
              <ul className="space-y-1">
                {redFlags.map((flag, index) => (
                  <li key={index} className="text-sm text-urgent flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-urgent" />
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Possible Conditions */}
        <div className="medical-card">
          <h3 className="font-semibold text-foreground mb-3">Possible Conditions (AI)</h3>
          <div className="flex flex-wrap gap-2">
            {["Viral Fever", "Flu", "Dengue (rule out)", "Typhoid (rule out)"].map((condition, index) => (
              <span
                key={index}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium",
                  index < 2 ? "bg-muted text-foreground" : "bg-warning/10 text-warning"
                )}
              >
                {condition}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border">
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={() => navigate("/dashboard")}
          >
            <X className="w-4 h-4 mr-2" />
            Skip
          </Button>
          <Button
            variant="medical"
            size="lg"
            className="flex-[2]"
            onClick={() => navigate("/consultation")}
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Accept Consultation
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-2">
          You can skip up to 3 consultations per day
        </p>
      </div>
      </div>
    </MobileContainer>
  );
}
