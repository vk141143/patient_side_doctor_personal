import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Shield, FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

import type { ConsentData } from "./RegistrationWizard";

interface LegalConsentStepProps {
  onNext: (data: ConsentData) => void;
  onBack: () => void;
  submitting?: boolean;
}

export function LegalConsentStep({ onNext, onBack, submitting = false }: LegalConsentStepProps) {
  const [consents, setConsents] = useState({
    registered: false,
    guidelines: false,
    terms: false,
    prescriptions: false,
    dataProcessing: false,
  });

  const allChecked = Object.values(consents).every(Boolean);

  const consentItems = [
    {
      id: "registered",
      title: "I confirm that I am a registered medical practitioner",
      description: "I hold a valid medical license from a recognized medical council",
    },
    {
      id: "guidelines",
      title: "I agree to follow Telemedicine Practice Guidelines",
      description: "I will adhere to all telemedicine regulations and best practices",
      link: "View Telemedicine Guidelines",
    },
    {
      id: "terms",
      title: "I accept the platform Terms & Conditions",
      description: "I have read and understood the platform's terms of service",
      link: "View Terms & Privacy Policy",
    },
    {
      id: "prescriptions",
      title: "I understand that I am responsible for prescriptions",
      description: "All medical advice and prescriptions are my professional responsibility",
    },
    {
      id: "dataProcessing",
      title: "I consent to data processing for verification",
      description: "My documents will be processed to verify my credentials",
    },
  ];

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Agreements & Declarations</h2>
        <p className="text-muted-foreground mt-2">Please review and accept the following</p>
      </div>
      <ScrollArea className="flex-1 min-h-0 pr-2">
      <div className="space-y-6 pb-4">

      {/* Header Card */}
      <div className="medical-card flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Legal Compliance</h3>
          <p className="text-sm text-muted-foreground">
            These agreements ensure patient safety and regulatory compliance
          </p>
        </div>
      </div>

      {/* Consent Items */}
      <div className="space-y-3">
        {consentItems.map((item) => (
          <label
            key={item.id}
            className={cn(
              "flex gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
              consents[item.id as keyof typeof consents]
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            <Checkbox
              checked={consents[item.id as keyof typeof consents]}
              onCheckedChange={(checked) =>
                setConsents((prev) => ({ ...prev, [item.id]: checked }))
              }
              className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <div className="flex-1">
              <p className="font-medium text-foreground">{item.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
              {item.link && (
                <a
                  href="#"
                  className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FileText className="w-4 h-4" />
                  {item.link}
                  <ChevronRight className="w-3 h-3" />
                </a>
              )}
            </div>
          </label>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-muted/50 rounded-xl p-4">
        <p className="text-sm text-muted-foreground">
          By submitting, you confirm that all information provided is accurate and you agree to 
          the platform's terms of service and privacy policy.
        </p>
      </div>

      </div>
      </ScrollArea>
      {/* Actions */}
      <div className="flex gap-4 pt-4 border-t border-border mt-4">
        <Button variant="outline" size="lg" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="medical"
          size="lg"
          className="flex-1"
          onClick={() => onNext(consents)}
          disabled={!allChecked || submitting}
        >
          {submitting ? "Submitting…" : "Submit for Verification"}
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
