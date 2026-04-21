import { useState, useRef } from "react";
import {
  ArrowLeft, Search, Plus, Trash2, Send, AlertCircle, Loader2,
  FileText, QrCode, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useNavigate, useLocation } from "react-router-dom";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Medicine {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  type: string;
}

export function PrescriptionScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const session  = location.state?.session;
  const request  = location.state?.request;
  const doctorId = localStorage.getItem("doctor_uid") ?? "";

  const [diagnosis, setDiagnosis]   = useState("");
  const [advice, setAdvice]         = useState("");
  const [followUp, setFollowUp]     = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending]       = useState(false);
  const [generated, setGenerated]   = useState(false);
  const [rxId, setRxId]             = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [docInfo, setDocInfo]       = useState<{ full_name: string; specialization: string; hospital_name: string; clinic_address: string } | null>(null);
  const [medicines, setMedicines]   = useState<Medicine[]>([{
    id: 1, name: "", dosage: "1 tablet", frequency: "Twice daily",
    duration: "5 days", instructions: "After food", type: "generic",
  }]);

  const addMedicine = () => setMedicines([...medicines, {
    id: Date.now(), name: "", dosage: "1 tablet", frequency: "Twice daily",
    duration: "5 days", instructions: "After food", type: "generic",
  }]);
  const removeMedicine = (id: number) => setMedicines(medicines.filter((m) => m.id !== id));
  const updateMedicine = (id: number, field: keyof Medicine, value: string) =>
    setMedicines(medicines.map((m) => m.id === id ? { ...m, [field]: value } : m));

  const commonMedicines = [
    "Paracetamol 500mg", "Paracetamol 650mg", "Azithromycin 500mg",
    "Amoxicillin 500mg", "Cetirizine 10mg", "Omeprazole 20mg",
    "Vitamin C 500mg", "Vitamin D3 60000 IU", "Ibuprofen 400mg",
  ];

  // ── Step 1: Generate prescription (save to DB, show template) ─────────────
  const handleGenerate = async () => {
    if (!diagnosis.trim()) { toast.error("Please enter a diagnosis"); return; }
    if (!session?.id) { toast.error("No active session"); return; }
    setGenerating(true);

    const { data: doc } = await supabase
      .from("doctors")
      .select("full_name, specialization, hospital_name, clinic_address")
      .eq("firebase_uid", doctorId).maybeSingle();

    setDocInfo(doc);
    const adviceLines = advice.split("\n").filter((l) => l.trim());

    const { data: rx, error } = await supabase.from("chat_prescriptions").insert({
      session_id:       session.id,
      doctor_id:        doctorId,
      patient_id:       session.patient_id ?? request?.patient_id,
      doctor_name:      doc?.full_name ?? "Doctor",
      doctor_specialty: doc?.specialization ?? "",
      diagnosis,
      advice:           adviceLines,
      medicines:        medicines.map(({ id, ...m }) => m),
      follow_up:        followUp,
    }).select().single();

    if (error) { toast.error("Failed to generate prescription"); setGenerating(false); return; }

    setRxId(rx.id);
    setGenerated(true);
    setShowPreview(true);
    setGenerating(false);
    toast.success("Prescription generated!");
  };

  // ── Step 2: Send to patient (NO session end here) ─────────────────────────
  const handleSend = async () => {
    if (!rxId || !session?.id) return;
    setSending(true);

    // Send prescription message in chat — session stays ACTIVE
    await supabase.from("instant_chat_messages").insert({
      session_id:  session.id,
      sender_id:   doctorId,
      sender_role: "doctor",
      type:        "prescription",
      content:     `__prescription__:${rxId}`,
    });

    // Notify user side to show "Prescription Updated" and resume timer
    await supabase.from("instant_chat_messages").insert({
      session_id:  session.id,
      sender_id:   doctorId,
      sender_role: "doctor",
      type:        "system",
      content:     "__prescription_updated__",
    });

    await supabase.from("instant_chat_messages").insert({
      session_id:  session.id,
      sender_id:   doctorId,
      sender_role: "doctor",
      type:        "system",
      content:     "__timer_resume__",
    });

    toast.success("Prescription sent to patient!");
    setSending(false);
    navigate(-1); // go back to chat — session still active, timer resumes
  };

  const patientName = session?.patient_name ?? request?.patient_name ?? "Patient";
  const rxUrl       = rxId ? `${window.location.origin}/rx/${rxId}` : "";
  const today       = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <MobileContainer>
      <div className="h-screen bg-background flex flex-col">

        {/* Header */}
        <header className="sticky top-0 z-10 bg-card border-b border-border shrink-0">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-semibold text-foreground">Write Prescription</h1>
                <p className="text-xs text-muted-foreground">{patientName}</p>
              </div>
            </div>
            {generated && (
              <button onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 text-xs text-primary font-medium">
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreview ? "Edit" : "Preview"}
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-5 pb-4 scrollbar-light"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#D1D5DB #F9FAFB' }}>

          {/* ── TEMPLATE PREVIEW ── */}
          {showPreview && generated && rxId ? (
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              {/* Clinic header */}
              <div className="bg-primary px-5 py-4 text-primary-foreground">
                <p className="font-bold text-lg">{docInfo?.full_name ?? "Doctor"}</p>
                <p className="text-sm text-primary-foreground/80">{docInfo?.specialization}</p>
                {docInfo?.hospital_name && (
                  <p className="text-xs text-primary-foreground/70 mt-0.5">{docInfo.hospital_name}</p>
                )}
                {docInfo?.clinic_address && (
                  <p className="text-xs text-primary-foreground/60">{docInfo.clinic_address}</p>
                )}
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Patient + date */}
                <div className="flex justify-between items-start border-b border-border pb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Patient</p>
                    <p className="font-semibold text-foreground">{patientName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm font-medium text-foreground">{today}</p>
                  </div>
                </div>

                {/* Diagnosis */}
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Diagnosis</p>
                  <p className="text-sm text-foreground font-medium">{diagnosis}</p>
                </div>

                {/* Medicines */}
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">💊 Medicines</p>
                  <div className="space-y-2">
                    {medicines.filter((m) => m.name).map((m, i) => (
                      <div key={i} className="bg-muted/50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-sm text-foreground">{m.name}</p>
                          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {m.type} · {m.duration}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{m.dosage} · {m.instructions}</p>
                        <p className="text-xs text-primary mt-0.5">⏰ {m.frequency}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Advice */}
                {advice.trim() && (
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Advice</p>
                    <div className="space-y-1">
                      {advice.split("\n").filter((l) => l.trim()).map((line, i) => (
                        <p key={i} className="text-xs text-foreground flex items-start gap-1.5">
                          <span className="text-green-600 mt-0.5">✓</span> {line}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-up */}
                {followUp && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-3">
                    Follow-up: {followUp}
                  </p>
                )}

                {/* QR Code — actual scannable QR using Google Charts API */}
                <div className="border-t border-border pt-4 flex items-center gap-4">
                  <div className="flex flex-col items-center shrink-0">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(rxUrl)}`}
                      alt="QR Code"
                      className="w-20 h-20 rounded-lg border border-border"
                    />
                    <p className="text-[9px] text-muted-foreground mt-1 text-center">Scan to verify</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground">Prescription ID</p>
                    <p className="text-xs font-mono text-foreground break-all">{rxId.slice(0, 16)}…</p>
                    <p className="text-[9px] text-muted-foreground mt-1">
                      Scan QR to view this prescription online and verify authenticity
                    </p>
                  </div>
                </div>

                <p className="text-[9px] text-muted-foreground text-center border-t border-border pt-2">
                  This is a digitally generated prescription. Valid only with doctor's digital signature.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* ── FORM ── */}
              <div className="space-y-2">
                <Label className="font-medium">Diagnosis *</Label>
                <Input placeholder="e.g., Viral Fever with mild upper respiratory infection"
                  className="h-12" value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Medicines</Label>
                  <Button variant="ghost" size="sm" onClick={addMedicine}>
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>

                {medicines.map((med, idx) => (
                  <div key={med.id} className="medical-card space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">Medicine {idx + 1}</span>
                      {medicines.length > 1 && (
                        <button onClick={() => removeMedicine(med.id)}
                          className="p-1 text-destructive hover:bg-destructive/10 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Medicine name…" className="pl-10 h-11"
                        value={med.name} list={`med-list-${med.id}`}
                        onChange={(e) => updateMedicine(med.id, "name", e.target.value)} />
                      <datalist id={`med-list-${med.id}`}>
                        {commonMedicines.map((m) => <option key={m} value={m} />)}
                      </datalist>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Type</Label>
                        <Select value={med.type} onValueChange={(v) => updateMedicine(med.id, "type", v)}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-card">
                            <SelectItem value="generic">Generic</SelectItem>
                            <SelectItem value="branded">Branded</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Dosage</Label>
                        <Select value={med.dosage} onValueChange={(v) => updateMedicine(med.id, "dosage", v)}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-card">
                            {["1 tablet","2 tablets","1/2 tablet","1 capsule","5ml","10ml"].map((d) =>
                              <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Frequency</Label>
                        <Select value={med.frequency} onValueChange={(v) => updateMedicine(med.id, "frequency", v)}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-card">
                            {["Once daily","Twice daily","Thrice daily","Every 6 hours","At bedtime","As needed"].map((f) =>
                              <SelectItem key={f} value={f}>{f}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Duration</Label>
                        <Select value={med.duration} onValueChange={(v) => updateMedicine(med.id, "duration", v)}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-card">
                            {["3 days","5 days","7 days","10 days","14 days","1 month"].map((d) =>
                              <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Instructions</Label>
                      <Select value={med.instructions} onValueChange={(v) => updateMedicine(med.id, "instructions", v)}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-card">
                          {["Before food","After food","With food","Empty stomach","After breakfast","At bedtime"].map((i) =>
                            <SelectItem key={i} value={i}>{i}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Advice (one per line)</Label>
                <Textarea placeholder={"Take plenty of rest\nDrink plenty of fluids\nAvoid cold foods"}
                  className="min-h-[90px]" value={advice}
                  onChange={(e) => setAdvice(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Follow-up</Label>
                <Select value={followUp} onValueChange={setFollowUp}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Select follow-up" /></SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="3 days">Review after 3 days</SelectItem>
                    <SelectItem value="1 week">Review after 1 week</SelectItem>
                    <SelectItem value="2 weeks">Review after 2 weeks</SelectItem>
                    <SelectItem value="1 month">Review after 1 month</SelectItem>
                    <SelectItem value="if needed">If symptoms persist</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-warning/10 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  All prescriptions are your professional responsibility. Ensure accuracy before sending.
                </p>
              </div>
            </>
          )}
        </main>

        {/* Bottom actions */}
        <div className="shrink-0 p-4 bg-card border-t border-border space-y-2">
          {!generated ? (
            <Button variant="outline" size="lg" className="w-full"
              onClick={handleGenerate} disabled={generating || !diagnosis.trim()}>
              {generating
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating…</>
                : <><FileText className="w-5 h-5 mr-2" /> Generate Prescription</>}
            </Button>
          ) : (
            <Button variant="medical" size="lg" className="w-full"
              onClick={handleSend} disabled={sending}>
              {sending
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending…</>
                : <><Send className="w-5 h-5 mr-2" /> Send to Patient</>}
            </Button>
          )}
        </div>

      </div>
    </MobileContainer>
  );
}
