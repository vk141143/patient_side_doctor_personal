import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { Card, CardContent } from "@/components/ui/card";

const sections = [
  {
    title: "Who Can Practice Telemedicine",
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/10",
    points: [
      "Registered medical practitioners with valid MCI/State Council registration",
      "Doctors must be licensed to practice in India",
      "Specialists can only consult within their area of expertise",
    ],
  },
  {
    title: "Patient Consent",
    icon: Info,
    color: "text-primary",
    bg: "bg-primary/10",
    points: [
      "Explicit consent must be obtained before every teleconsultation",
      "Patients must be informed about the limitations of telemedicine",
      "Consent can be verbal, written, or digital",
    ],
  },
  {
    title: "Prescription Guidelines",
    icon: AlertCircle,
    color: "text-warning",
    bg: "bg-warning/10",
    points: [
      "Only Schedule H & H1 drugs can be prescribed via telemedicine",
      "Schedule X drugs cannot be prescribed via telemedicine",
      "Prescriptions must include doctor's registration number",
      "First-time patients require extra caution before prescribing",
    ],
  },
  {
    title: "Documentation",
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/10",
    points: [
      "Maintain records of all teleconsultations for minimum 3 years",
      "Document patient history, symptoms, and advice given",
      "Store consultation records securely and confidentially",
    ],
  },
];

export function TelemedicineGuidelinesPage() {
  const navigate = useNavigate();

  return (
    <MobileContainer>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <header className="bg-primary text-primary-foreground px-4 pt-12 pb-4 shrink-0 flex items-center gap-3">
          <button onClick={() => navigate("/profile")} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Telemedicine Guidelines</h1>
            <p className="text-primary-foreground/70 text-xs mt-0.5">MoHFW Guidelines 2020</p>
          </div>
        </header>

        <div className="scrollable-content flex-1 min-h-0 px-4 py-5 space-y-4">
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
            <p className="text-sm text-foreground font-medium">Ministry of Health & Family Welfare</p>
            <p className="text-xs text-muted-foreground mt-1">
              These guidelines govern the practice of telemedicine in India. As a registered doctor on this platform, you are required to follow these guidelines at all times.
            </p>
          </div>

          {sections.map((section) => (
            <Card key={section.title}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg ${section.bg} flex items-center justify-center`}>
                    <section.icon className={`w-4 h-4 ${section.color}`} />
                  </div>
                  <p className="font-semibold text-foreground text-sm">{section.title}</p>
                </div>
                <ul className="space-y-2">
                  {section.points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}

          <p className="text-xs text-muted-foreground text-center pb-4">
            For full guidelines visit{" "}
            <a href="https://www.mohfw.gov.in" target="_blank" rel="noreferrer" className="text-primary underline">
              mohfw.gov.in
            </a>
          </p>
        </div>
      </div>
    </MobileContainer>
  );
}
