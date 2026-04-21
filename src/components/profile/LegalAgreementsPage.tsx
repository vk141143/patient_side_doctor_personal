import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, FileText } from "lucide-react";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { useDoctor } from "@/hooks/useDoctor";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function LegalAgreementsPage() {
  const navigate = useNavigate();
  const { doctor, loading } = useDoctor();

  const agreements = [
    { label: "Registered Medical Practitioner Declaration", key: "consent_registered" },
    { label: "Telemedicine Practice Guidelines Agreement", key: "consent_guidelines" },
    { label: "Platform Terms & Conditions", key: "consent_terms" },
    { label: "Prescription Responsibility Declaration", key: "consent_prescriptions" },
    { label: "Data Processing Consent", key: "consent_data_processing" },
  ];

  return (
    <MobileContainer>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <header className="bg-primary text-primary-foreground px-4 pt-12 pb-4 shrink-0 flex items-center gap-3">
          <button onClick={() => navigate("/profile")} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Legal Agreements</h1>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : (
          <div className="scrollable-content flex-1 min-h-0 px-4 py-5 space-y-4">

            <div className="p-3 bg-success/10 rounded-xl border border-success/20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <p className="text-xs text-success font-medium">
                All agreements were accepted on{" "}
                {doctor?.created_at ? new Date(doctor.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "registration"}
              </p>
            </div>

            <Card>
              <CardContent className="p-4 divide-y divide-border">
                {agreements.map((a) => {
                  const accepted = doctor?.[a.key as keyof typeof doctor] as boolean | undefined;
                  return (
                    <div key={a.key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="flex-1 text-sm font-medium text-foreground">{a.label}</p>
                      {accepted ? (
                        <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive shrink-0" />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-center px-4">
              These agreements were accepted during registration. To review or update, contact support.
            </p>
          </div>
        )}
      </div>
    </MobileContainer>
  );
}
