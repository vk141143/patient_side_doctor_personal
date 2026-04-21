import { ArrowLeft, Star, MapPin, Clock, MessageSquare, Building2, Shield, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { useDoctor } from "@/hooks/useDoctor";

export function PublicProfilePreview() {
  const navigate = useNavigate();
  const { doctor } = useDoctor();

  const initials = doctor?.full_name
    ? doctor.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "DR";

  const recentReviews = [
    { id: 1, name: "Rahul S.", rating: 5, type: "Online", comment: "Very helpful and patient doctor.", date: "2 days ago" },
    { id: 2, name: "Priya M.", rating: 4, type: "OPD", comment: "Good consultation, clear explanation.", date: "5 days ago" },
  ];

  return (
    <MobileContainer>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <header className="sticky top-0 z-10 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-3 p-4">
            <button onClick={() => navigate("/profile")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-semibold text-foreground">Public Profile Preview</h1>
              <p className="text-xs text-muted-foreground">How patients see you</p>
            </div>
          </div>
        </header>

        <main className="scrollable-content flex-1 min-h-0 pb-8">
          {/* Doctor Header */}
          <div className="bg-gradient-to-b from-primary/10 to-background p-4">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">{initials}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">{doctor?.full_name ?? "—"}</h2>
                  <Shield className="w-4 h-4 text-success" />
                </div>
                <p className="text-sm text-primary font-medium">{doctor?.specialization ?? "—"}</p>
                {(doctor?.city || doctor?.state) && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {[doctor.city, doctor.state].filter(Boolean).join(", ")}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-semibold">4.8</span>
                    <span className="text-xs text-muted-foreground">(1,250)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Award className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">
                      {doctor?.experience_years ? `${doctor.experience_years} yrs exp` : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-card rounded-xl p-3 text-center border border-border">
                <p className="text-lg font-bold text-foreground">5000+</p>
                <p className="text-[10px] text-muted-foreground">Consultations</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center border border-border">
                <p className="text-lg font-bold text-foreground">{doctor?.experience_years ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">Years Exp</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center border border-border">
                <p className="text-lg font-bold text-foreground">98%</p>
                <p className="text-[10px] text-muted-foreground">Satisfaction</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Clinic Details */}
            {doctor?.hospital_name && (
              <div className="medical-card">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Clinic Details</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-4 h-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{doctor.hospital_name}</p>
                      {doctor.clinic_address && (
                        <p className="text-xs text-muted-foreground">{doctor.clinic_address}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-primary" />
                    <p className="text-sm text-muted-foreground">{doctor.consult_duration} min per session</p>
                  </div>
                </div>
              </div>
            )}

            {/* Services */}
            <div className="medical-card">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Services Available</h3>
              <div className="space-y-2">
                {doctor?.service_chat && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <span className="text-sm">Online Consultation</span>
                    </div>
                    <span className="text-xs text-success font-medium">Available</span>
                  </div>
                )}
                {doctor?.service_opd && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="text-sm">Clinic / OPD Visit</span>
                    </div>
                    <span className="text-xs text-success font-medium">Available</span>
                  </div>
                )}
              </div>
            </div>

            {/* Languages */}
            {doctor?.languages && doctor.languages.length > 0 && (
              <div className="medical-card">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {doctor.languages.map((lang) => (
                    <span key={lang} className="px-3 py-1 bg-muted rounded-full text-xs text-foreground">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Reviews */}
            <div className="medical-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Recent Reviews</h3>
                <button onClick={() => navigate("/ratings")} className="text-xs text-primary font-medium">
                  View All
                </button>
              </div>
              <div className="space-y-3">
                {recentReviews.map((review) => (
                  <div key={review.id} className="pb-3 border-b border-border last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{review.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {review.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-medium">{review.rating}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{review.comment}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{review.date}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </MobileContainer>
  );
}
