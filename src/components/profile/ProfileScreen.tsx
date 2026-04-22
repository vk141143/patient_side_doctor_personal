import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { BottomNav } from "@/components/navigation/BottomNav";
import { useNavigate } from "react-router-dom";
import {
  User, GraduationCap, CreditCard, FileText, Shield, ChevronRight,
  Camera, Star, CheckCircle2, Bell, HelpCircle, LogOut,
  Building2, Mail, Eye, Users, MessageSquare, MapPin, Loader2,
} from "lucide-react";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { useDoctor, clearDoctorCache } from "@/hooks/useDoctor";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

export const ProfileScreen = () => {
  const navigate = useNavigate();
  const { doctor, loading } = useDoctor();
  const [isAvailable, setIsAvailable] = useState(true);

  const handleLogout = async () => {
    clearDoctorCache();
    await auth.signOut();
    navigate("/login");
  };

  const menuSections = [
    {
      title: "Profile",
      items: [
        { icon: User, label: "Doctor Profile", path: "/profile/personal" },
        { icon: Building2, label: "Clinic Profile", path: "/profile/clinic" },
        { icon: Eye, label: "Public Profile Preview", path: "/public-profile", highlight: true },
      ],
    },
    {
      title: "Feedback",
      items: [
        // { icon: Users, label: "Staff Management", path: "/staff", badge: "6 staff" },
        { icon: Star, label: "Ratings & Reviews", path: "/ratings", badge: "4.8" },
      ],
    },
    {
      title: "Payments",
      items: [
        { icon: CreditCard, label: "Bank Details", path: "/profile/bank" },
      ],
    },
    {
      title: "Compliance",
      items: [
        { icon: Shield, label: "Telemedicine Guidelines", path: "/profile/guidelines" },
        { icon: FileText, label: "Legal Agreements", path: "/profile/legal" },
      ],
    },
    {
      title: "Settings",
      items: [
        { icon: Bell, label: "Notification Settings", path: "/profile/notifications" },
        { icon: HelpCircle, label: "Help & Support", path: "/profile/help" },
      ],
    },
  ];

  if (loading) {
    return (
      <MobileContainer>
        <div className="h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading profile…</p>
          </div>
        </div>
      </MobileContainer>
    );
  }

  const initials = doctor?.full_name
    ? doctor.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "DR";

  return (
    <MobileContainer>
      <div className="h-screen bg-background flex flex-col">

        {/* Header */}
        <div className="bg-primary text-primary-foreground px-4 pt-12 pb-6 shrink-0">
          <h1 className="text-xl font-semibold">Profile & Settings</h1>
        </div>

        <div className="flex-1 overflow-y-auto">

        {/* Doctor Card */}
        <div className="px-4 -mt-4">
          <Card className="overflow-hidden shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">{initials}</span>
                  </div>
                  <button className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-md">
                    <Camera className="w-4 h-4 text-primary-foreground" />
                  </button>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-lg">{doctor?.full_name ?? "—"}</h2>
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                  <p className="text-sm text-muted-foreground">{doctor?.specialization ?? "—"}</p>
                  {(doctor?.city || doctor?.state) && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {[doctor.city, doctor.state].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium">4.8</span>
                    <span className="text-xs text-muted-foreground">(256 reviews)</span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
                <div className="text-center">
                  <p className="text-xl font-bold text-primary">
                    {doctor?.experience_years ? `${doctor.experience_years}+` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Years Exp</p>
                </div>
                <div className="text-center border-x border-border">
                  <p className="text-xl font-bold text-primary">2.5K</p>
                  <p className="text-xs text-muted-foreground">Patients</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-primary">
                    {doctor?.consult_duration ? `${doctor.consult_duration}m` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Consult</p>
                </div>
              </div>

              {/* Availability Toggle */}
              {/* <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <div>
                  <p className="font-medium">Online Status</p>
                  <p className="text-xs text-muted-foreground">
                    {isAvailable ? "You're accepting consultations" : "You're offline"}
                  </p>
                </div>
                <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
              </div> */}
            </CardContent>
          </Card>
        </div>

        {/* Service Toggles */}
        <div className="px-4 mt-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Services</h3>
              <div className="space-y-3">
                {[
                  { key: "service_chat", icon: MessageSquare, label: "Online Consults", color: "text-primary", bg: "bg-primary/10" },
                  { key: "service_opd", icon: Building2, label: "Clinic OPD", color: "text-success", bg: "bg-success/10" },
                ].map((s) => (
                  <div key={s.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                        <s.icon className={`w-4 h-4 ${s.color}`} />
                      </div>
                      <p className="text-sm font-medium">{s.label}</p>
                    </div>
                    <Badge variant="secondary" className={
                      doctor?.[s.key as keyof typeof doctor]
                        ? "bg-success/10 text-success text-xs"
                        : "bg-muted text-muted-foreground text-xs"
                    }>
                      {doctor?.[s.key as keyof typeof doctor] ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Info */}
        <div className="px-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{doctor?.email ?? "—"}</p>
                </div>
              </div>
              {doctor?.hospital_name && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {doctor.practice_type === "clinic" ? "Clinic" : "Hospital"}
                    </p>
                    <p className="font-medium">{doctor.hospital_name}</p>
                    {doctor.clinic_address && (
                      <p className="text-xs text-muted-foreground">{doctor.clinic_address}</p>
                    )}
                  </div>
                </div>
              )}
              {doctor?.languages && doctor.languages.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Languages</p>
                    <p className="font-medium">{doctor.languages.join(", ")}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Menu Sections */}
        <div className="px-4 py-4 space-y-4">
          {menuSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">{section.title}</h3>
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  {section.items.map((item) => (
                    <button key={item.label} onClick={() => navigate(item.path)}
                      className={`w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${item.highlight ? "bg-primary/5" : ""}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.highlight ? "bg-primary/10" : "bg-muted"}`}>
                          <item.icon className={`w-5 h-5 ${item.highlight ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <Badge variant="secondary" className="bg-success/10 text-success text-xs">{item.badge}</Badge>
                        )}
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}

          <Button variant="outline" className="w-full h-12 text-destructive border-destructive hover:bg-destructive/10"
            onClick={handleLogout}>
            <LogOut className="w-5 h-5 mr-2" />
            Logout
          </Button>

          <p className="text-center text-xs text-muted-foreground pt-2">Doctor App v1.0.0</p>
        </div>

        </div>

        <BottomNav />
      </div>
    </MobileContainer>
  );
};
