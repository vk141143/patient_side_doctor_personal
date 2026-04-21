import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, MapPin, GraduationCap, Stethoscope, Calendar } from "lucide-react";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { useDoctor } from "@/hooks/useDoctor";
import { Card, CardContent } from "@/components/ui/card";
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

export function DoctorProfilePage() {
  const navigate = useNavigate();
  const { doctor, loading } = useDoctor();

  return (
    <MobileContainer>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <header className="bg-primary text-primary-foreground px-4 pt-12 pb-4 shrink-0 flex items-center gap-3">
          <button onClick={() => navigate("/profile")} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Doctor Profile</h1>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : (
          <div className="scrollable-content flex-1 min-h-0 px-4 py-5 space-y-4">
            {/* Avatar */}
            <div className="flex flex-col items-center py-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <span className="text-2xl font-bold text-primary">
                  {doctor?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "DR"}
                </span>
              </div>
              <p className="font-semibold text-lg text-foreground">{doctor?.full_name ?? "—"}</p>
              <p className="text-sm text-muted-foreground">{doctor?.specialization ?? "—"}</p>
            </div>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Personal Info</p>
                <Row icon={Mail} label="Email" value={doctor?.email} />
                <Row icon={User} label="Gender" value={doctor?.gender} />
                <Row icon={MapPin} label="City" value={doctor?.city} />
                <Row icon={MapPin} label="State" value={doctor?.state} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Professional Info</p>
                <Row icon={Stethoscope} label="Specialization" value={doctor?.specialization} />
                <Row icon={Calendar} label="Experience" value={doctor?.experience_years ? `${doctor.experience_years} years` : null} />
                <Row icon={GraduationCap} label="Languages" value={doctor?.languages?.join(", ")} />
                <Row icon={Calendar} label="Consult Duration" value={doctor?.consult_duration ? `${doctor.consult_duration} minutes` : null} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account</p>
                <Row icon={User} label="Account Status" value={doctor?.status?.toUpperCase()} />
                <Row icon={Calendar} label="Registered On" value={doctor?.created_at ? new Date(doctor.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MobileContainer>
  );
}
