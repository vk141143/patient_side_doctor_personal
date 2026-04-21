import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, MapPin, FileText, MessageSquare, Clock } from "lucide-react";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { useDoctor } from "@/hooks/useDoctor";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground">{value || "—"}</p>
      </div>
    </div>
  );
}

export function ClinicProfilePage() {
  const navigate = useNavigate();
  const { doctor, loading } = useDoctor();

  return (
    <MobileContainer>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <header className="bg-primary text-primary-foreground px-4 pt-12 pb-4 shrink-0 flex items-center gap-3">
          <button onClick={() => navigate("/profile")} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Clinic Profile</h1>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : (
          <div className="scrollable-content flex-1 min-h-0 px-4 py-5 space-y-4">

            {/* Practice type badge */}
            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{doctor?.hospital_name || "No clinic registered"}</p>
                <Badge variant="secondary" className="mt-1 text-xs bg-primary/10 text-primary">
                  {doctor?.practice_type === "clinic" ? "Clinic Practice" : "Individual Practice"}
                </Badge>
              </div>
            </div>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Clinic Details</p>
                <Row icon={Building2} label="Clinic / Hospital Name" value={doctor?.hospital_name} />
                <Row icon={MapPin} label="Clinic Address" value={doctor?.clinic_address} />
                <Row icon={FileText} label="License / GST Number" value={doctor?.clinic_license} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Services Offered</p>
                <div className="space-y-3 pt-1">
                  {[
                    { icon: MessageSquare, label: "Online Chat Consultation", active: doctor?.service_chat },
                    { icon: Building2, label: "Hospital / Clinic OPD", active: doctor?.service_opd },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                          <s.icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">{s.label}</p>
                      </div>
                      <Badge className={s.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"} variant="secondary">
                        {s.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Consultation Settings</p>
                <Row icon={Clock} label="Preferred Duration" value={doctor?.consult_duration ? `${doctor.consult_duration} minutes per session` : null} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MobileContainer>
  );
}
