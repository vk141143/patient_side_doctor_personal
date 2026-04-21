import { 
  X, 
  Brain,
  User,
  AlertTriangle,
  Activity,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AIInsightsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  patientInfo: {
    name: string;
    age: number;
    gender: string;
    bloodType?: string;
    allergies?: string[];
  };
  symptoms: string[];
  suggestedQuestions: string[];
  possibleConditions: string[];
  riskLevel: "low" | "medium" | "high";
  onSelectQuestion: (question: string) => void;
}

export function AIInsightsPopup({ 
  isOpen, 
  onClose,
  patientInfo,
  symptoms,
  suggestedQuestions,
  possibleConditions,
  riskLevel,
  onSelectQuestion
}: AIInsightsPopupProps) {
  if (!isOpen) return null;

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low": return "bg-success/10 text-success";
      case "medium": return "bg-warning/10 text-warning";
      case "high": return "bg-urgent/10 text-urgent";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      
      {/* Popup */}
      <div className="relative w-full max-w-[400px] max-h-[80vh] bg-card rounded-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 bg-primary text-primary-foreground">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            <h2 className="font-semibold">AI Insights</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-60px)] p-4 space-y-4">
          {/* Patient Info */}
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-foreground">Patient Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium text-foreground">{patientInfo.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Age/Gender</p>
                <p className="font-medium text-foreground">{patientInfo.age} yrs, {patientInfo.gender}</p>
              </div>
              {patientInfo.bloodType && (
                <div>
                  <p className="text-muted-foreground">Blood Type</p>
                  <p className="font-medium text-foreground">{patientInfo.bloodType}</p>
                </div>
              )}
              {patientInfo.allergies && patientInfo.allergies.length > 0 && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Allergies</p>
                  <p className="font-medium text-urgent">{patientInfo.allergies.join(", ")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Risk Level */}
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl",
            getRiskColor(riskLevel)
          )}>
            <AlertTriangle className="w-5 h-5" />
            <div>
              <p className="font-medium">Risk Level: {riskLevel.toUpperCase()}</p>
              <p className="text-xs opacity-80">Based on reported symptoms</p>
            </div>
          </div>

          {/* Extracted Symptoms */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-foreground">Reported Symptoms</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {symptoms.map((symptom, index) => (
                <span 
                  key={index}
                  className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm"
                >
                  {symptom}
                </span>
              ))}
            </div>
          </div>

          {/* Possible Conditions */}
          <div>
            <h3 className="font-medium text-foreground mb-2">Possible Conditions</h3>
            <div className="space-y-2">
              {possibleConditions.map((condition, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-sm"
                >
                  <span className="w-2 h-2 rounded-full bg-warning" />
                  <span className="text-foreground">{condition}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Questions */}
          <div>
            <h3 className="font-medium text-foreground mb-2">Suggested Questions</h3>
            <div className="space-y-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onSelectQuestion(question);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 bg-primary/5 hover:bg-primary/10 rounded-xl text-sm text-foreground transition-colors text-left"
                >
                  <span>{question}</span>
                  <ChevronRight className="w-4 h-4 text-primary" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-4 bg-card border-t border-border">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
