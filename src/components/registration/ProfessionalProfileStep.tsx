import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, MessageSquare, Building2, Clock, MapPin, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileData } from "./RegistrationWizard";

interface ProfessionalProfileStepProps {
  onNext: (data: ProfileData) => void;
  onBack: () => void;
}

export function ProfessionalProfileStep({ onNext, onBack }: ProfessionalProfileStepProps) {
  const [formData, setFormData] = useState({
    specialization: "",
    experience: "",
    hospital: "",
    languages: [] as string[],
    services: { chat: true, opd: false },
    consultDuration: "15",
    practiceType: "" as "clinic" | "individual" | "",
    clinicAddress: "",
    clinicLicense: "",
  });

  const specializations = [
    "General Physician", "Cardiologist", "Dermatologist", "Pediatrician",
    "Orthopedic", "Gynecologist", "ENT Specialist", "Ophthalmologist",
    "Neurologist", "Psychiatrist",
  ];

  const languages = ["English", "Hindi", "Marathi", "Tamil", "Telugu", "Kannada", "Bengali", "Gujarati"];
  const durations = ["5", "10", "15", "20", "30"];

  const toggleLanguage = (lang: string) =>
    setFormData((p) => ({
      ...p,
      languages: p.languages.includes(lang) ? p.languages.filter((l) => l !== lang) : [...p.languages, lang],
    }));

  const serviceOptions = [
    { id: "chat", icon: MessageSquare, label: "Online Chat Consultation", description: "Provide consultations via chat" },
    { id: "opd",  icon: Building2,    label: "Hospital / Clinic OPD",     description: "Accept in-clinic appointments" },
  ];

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Professional Information</h2>
        <p className="text-muted-foreground mt-2">Set up your consultation preferences</p>
      </div>

      <ScrollArea className="flex-1 min-h-0 pr-2">
        <div className="space-y-6 pb-4">

          {/* Specialization */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Specialization</Label>
            <Select value={formData.specialization} onValueChange={(v) => setFormData({ ...formData, specialization: v })}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Select your specialization" /></SelectTrigger>
              <SelectContent className="bg-card">
                {specializations.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Experience */}
          <div className="space-y-2">
            <Label htmlFor="experience" className="text-foreground font-medium">Years of Experience</Label>
            <Input id="experience" type="number" placeholder="e.g., 5" className="h-12"
              value={formData.experience} onChange={(e) => setFormData({ ...formData, experience: e.target.value })} />
          </div>

          {/* Practice Type */}
          <div className="space-y-3">
            <Label className="text-foreground font-medium">Practice Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "clinic", icon: Building2, label: "I run a Clinic", sub: "Have a registered clinic" },
                { value: "individual", icon: User, label: "Individual Practice", sub: "No clinic, practice independently" },
              ].map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setFormData({ ...formData, practiceType: opt.value as "clinic" | "individual", clinicAddress: "", clinicLicense: "" })}
                  className={cn(
                    "flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left",
                    formData.practiceType === opt.value ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"
                  )}>
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center",
                    formData.practiceType === opt.value ? "bg-primary/10" : "bg-muted")}>
                    <opt.icon className={cn("w-5 h-5", formData.practiceType === opt.value ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <p className={cn("font-medium text-sm", formData.practiceType === opt.value ? "text-primary" : "text-foreground")}>{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Clinic Name — always shown */}
          <div className="space-y-2">
            <Label htmlFor="hospital" className="text-foreground font-medium">
              {formData.practiceType === "clinic" ? "Clinic / Hospital Name" : "Hospital / Clinic Name (if any)"}
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input id="hospital" placeholder="e.g., City Medical Centre" className="pl-10 h-12"
                value={formData.hospital} onChange={(e) => setFormData({ ...formData, hospital: e.target.value })} />
            </div>
          </div>

          {/* Clinic-specific fields — only when clinic selected AND name entered */}
          {formData.practiceType === "clinic" && formData.hospital.trim() && (
            <div className="space-y-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
              <p className="text-sm font-semibold text-primary">Clinic Details</p>

              <div className="space-y-2">
                <Label className="text-foreground font-medium">Clinic Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <textarea
                    placeholder="Full clinic address"
                    className="w-full pl-10 pt-2.5 pb-2.5 pr-3 min-h-[80px] rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.clinicAddress}
                    onChange={(e) => setFormData({ ...formData, clinicAddress: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground font-medium">Clinic License / GST Number</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input placeholder="e.g., GST/License number" className="pl-10 h-12"
                    value={formData.clinicLicense}
                    onChange={(e) => setFormData({ ...formData, clinicLicense: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {/* Languages */}
          <div className="space-y-3">
            <Label className="text-foreground font-medium">Languages Spoken</Label>
            <div className="flex flex-wrap gap-2">
              {languages.map((lang) => (
                <button key={lang} type="button" onClick={() => toggleLanguage(lang)}
                  className={cn("px-4 py-2 rounded-full text-sm font-medium border-2 transition-all",
                    formData.languages.includes(lang)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50")}>
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Service Preferences — no Home Visit */}
          <div className="space-y-3">
            <Label className="text-foreground font-medium">Service Preferences</Label>
            <div className="space-y-3">
              {serviceOptions.map((service) => (
                <label key={service.id}
                  className={cn("flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    formData.services[service.id as keyof typeof formData.services]
                      ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50")}>
                  <Checkbox
                    checked={formData.services[service.id as keyof typeof formData.services]}
                    onCheckedChange={(checked) =>
                      setFormData((p) => ({ ...p, services: { ...p.services, [service.id]: !!checked } }))}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center",
                    formData.services[service.id as keyof typeof formData.services] ? "bg-primary/10" : "bg-muted")}>
                    <service.icon className={cn("w-5 h-5",
                      formData.services[service.id as keyof typeof formData.services] ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{service.label}</p>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Consultation Duration */}
          <div className="space-y-3">
            <Label className="text-foreground font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" /> Preferred Consultation Duration
            </Label>
            <div className="flex gap-2">
              {durations.map((dur) => (
                <button key={dur} type="button"
                  onClick={() => setFormData({ ...formData, consultDuration: dur })}
                  className={cn("flex-1 py-3 rounded-lg font-medium text-sm transition-all border-2",
                    formData.consultDuration === dur
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:border-primary/50")}>
                  {dur} min
                </button>
              ))}
            </div>
          </div>

        </div>
      </ScrollArea>

      <div className="flex gap-4 pt-4 border-t border-border mt-4">
        <Button variant="outline" size="lg" className="flex-1" onClick={onBack}>Back</Button>
        <Button variant="medical" size="lg" className="flex-1" onClick={() => onNext({
          specialization: formData.specialization,
          experience: formData.experience,
          hospital: formData.hospital,
          languages: formData.languages,
          serviceChat: formData.services.chat,
          serviceOpd: formData.services.opd,
          consultDuration: formData.consultDuration,
          practiceType: formData.practiceType as "clinic" | "individual",
          clinicAddress: formData.clinicAddress,
          clinicLicense: formData.clinicLicense,
        })}>
          Next <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
