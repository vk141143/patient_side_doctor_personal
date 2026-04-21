import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Info } from "lucide-react";
import type { CredentialsData } from "./RegistrationWizard";

interface MedicalCredentialsStepProps {
  onNext: (data: CredentialsData) => void;
  onBack: () => void;
}

export function MedicalCredentialsStep({ onNext, onBack }: MedicalCredentialsStepProps) {
  const [formData, setFormData] = useState({
    mbbsNumber: "",
    mbbsYearOfPassing: "",
    postgradType: "",
    postgradNumber: "",
    postgradYearOfPassing: "",
    registrationNumber: "",
    councilName: "",
    yearOfRegistration: "",
  });

  const postgradTypes = ["MD", "MS", "DNB", "Diploma"];
  const councils = [
    "Maharashtra Medical Council", "Karnataka Medical Council",
    "Tamil Nadu Medical Council", "Delhi Medical Council", "Medical Council of India",
  ];
  const years = Array.from({ length: 50 }, (_, i) => (new Date().getFullYear() - i).toString());

  const set = (key: string, val: string) => setFormData((p) => ({ ...p, [key]: val }));

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Medical Credentials</h2>
        <p className="text-muted-foreground mt-2">Enter your medical qualification details</p>
      </div>

      <ScrollArea className="flex-1 min-h-0 pr-2">
        <div className="space-y-6 pb-4">

          {/* MBBS */}
          <div className="space-y-4 p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">MBBS Degree</h3>
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Required</span>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground font-medium">MBBS Certificate Number</Label>
              <Input placeholder="e.g., MH/MBBS/2015/12345" className="h-12"
                value={formData.mbbsNumber} onChange={(e) => set("mbbsNumber", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground font-medium">Year of Passing</Label>
              <Select value={formData.mbbsYearOfPassing} onValueChange={(v) => set("mbbsYearOfPassing", v)}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent className="bg-card max-h-60">
                  {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Post-graduation */}
          <div className="space-y-4 p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">Post-Graduation Degree</h3>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">If applicable</span>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground font-medium">Degree Type</Label>
              <div className="flex gap-2 flex-wrap">
                {postgradTypes.map((type) => (
                  <button key={type} type="button"
                    onClick={() => set("postgradType", formData.postgradType === type ? "" : type)}
                    className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
                      formData.postgradType === type
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                    }`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {formData.postgradType && (
              <>
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">{formData.postgradType} Certificate Number</Label>
                  <Input placeholder={`e.g., MH/${formData.postgradType}/2018/67890`} className="h-12"
                    value={formData.postgradNumber} onChange={(e) => set("postgradNumber", e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Year of Passing</Label>
                  <Select value={formData.postgradYearOfPassing} onValueChange={(v) => set("postgradYearOfPassing", v)}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="Select year" /></SelectTrigger>
                    <SelectContent className="bg-card max-h-60">
                      {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* Medical Council Registration */}
          <div className="space-y-4 p-4 rounded-xl border border-border bg-card">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              Medical Council Registration
              <div className="group relative">
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                <div className="hidden group-hover:block absolute left-0 top-full mt-2 w-64 p-3 bg-card border border-border rounded-lg shadow-lg text-sm text-muted-foreground z-10">
                  Your registration number is on the certificate issued by your state medical council.
                </div>
              </div>
            </h3>

            <div className="space-y-2">
              <Label className="text-foreground font-medium">Medical Registration Number</Label>
              <Input placeholder="e.g., 12345/MH/2020" className="h-12"
                value={formData.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground font-medium">State Medical Council</Label>
              <Select value={formData.councilName} onValueChange={(v) => set("councilName", v)}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Select your council" /></SelectTrigger>
                <SelectContent className="bg-card">
                  {councils.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground font-medium">Year of Registration</Label>
              <Select value={formData.yearOfRegistration} onValueChange={(v) => set("yearOfRegistration", v)}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent className="bg-card max-h-60">
                  {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

        </div>
      </ScrollArea>

      <div className="flex gap-4 pt-4 border-t border-border mt-4">
        <Button variant="outline" size="lg" className="flex-1" onClick={onBack}>Back</Button>
        <Button variant="medical" size="lg" className="flex-1" onClick={() => onNext({
          mbbsNumber: formData.mbbsNumber,
          mbbsYearOfPassing: formData.mbbsYearOfPassing,
          postgradType: formData.postgradType,
          postgradNumber: formData.postgradNumber,
          postgradYearOfPassing: formData.postgradYearOfPassing,
          registrationNumber: formData.registrationNumber,
          councilName: formData.councilName,
          yearOfRegistration: formData.yearOfRegistration,
        })}>
          Continue <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
