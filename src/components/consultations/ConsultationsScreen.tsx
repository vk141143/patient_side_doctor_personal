import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/navigation/BottomNav";
import { Building2, Clock, Check, X, Loader2, Phone, CalendarX, CheckCircle2, FileText, Image } from "lucide-react";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SubTab = "today" | "upcoming" | "completed";

interface Appointment {
  id: string;
  patient_name: string;
  patient_phone: string | null;
  time_slot: string;
  appointment_date: string;
  fee: number;
  status: string;
  payment_method: string;
  payment_status: string;
  symptoms: string[] | null;
  description: string | null;
  report_url: string | null;
}

const todayStr = new Date().toISOString().split("T")[0];

// ── Badge helpers ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    attended:  "bg-green-100 text-green-700 border-green-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
    pending:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  };
  return (
    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize", map[status] ?? map.pending)}>
      {status}
    </span>
  );
};

const PaymentBadge = ({ paymentStatus }: { paymentStatus: string }) => (
  <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border",
    paymentStatus === "paid"
      ? "bg-green-100 text-green-700 border-green-200"
      : "bg-orange-100 text-orange-700 border-orange-200"
  )}>
    {paymentStatus === "paid" ? "Paid Online" : "Pay at Hospital"}
  </span>
);

// ── Main component ────────────────────────────────────────────────────────────
export const ConsultationsScreen = () => {
  const [subTab, setSubTab] = useState<SubTab>("today");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendedPatient, setAttendedPatient] = useState<string | null>(null);
  const [detailsApt, setDetailsApt] = useState<Appointment | null>(null);
  const uid = localStorage.getItem("doctor_uid") ?? "";

  // ── fetch based on active tab ──────────────────────────────────────────────
  const fetchAppointments = useCallback(async () => {
    if (!uid) return;
    let query = supabase
      .from("opd_appointments")
      .select("*")
      .eq("doctor_id", uid)
      .order("appointment_date", { ascending: true })
      .order("time_slot", { ascending: true });

    if (subTab === "today") {
      query = query.eq("appointment_date", todayStr).neq("status", "cancelled");
    } else if (subTab === "upcoming") {
      query = query.gt("appointment_date", todayStr).neq("status", "cancelled");
    } else {
      query = query.in("status", ["attended", "cancelled"]);
    }

    const { data } = await query;
    setAppointments((data as Appointment[]) ?? []);
    setLoading(false);
  }, [uid, subTab]);

  // ── real-time subscription ─────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetchAppointments();

    const channel = supabase
      .channel(`opd_realtime_${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "opd_appointments", filter: `doctor_id=eq.${uid}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newApt = payload.new as Appointment;
            // only prepend to today tab if it's today's appointment
            if (subTab === "today" && newApt.appointment_date === todayStr) {
              setAppointments((prev) => [newApt, ...prev]);
              toast.info(`New booking: ${newApt.patient_name} at ${newApt.time_slot}`);
            } else if (subTab === "upcoming" && newApt.appointment_date > todayStr) {
              setAppointments((prev) => [...prev, newApt]);
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Appointment;
            setAppointments((prev) =>
              prev.map((a) => (a.id === updated.id ? updated : a))
                  .filter((a) => {
                    // remove from today/upcoming if cancelled or attended
                    if (subTab === "today") return a.appointment_date === todayStr && a.status !== "cancelled";
                    if (subTab === "upcoming") return a.appointment_date > todayStr && a.status !== "cancelled";
                    return ["attended", "cancelled"].includes(a.status);
                  })
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [uid, subTab, fetchAppointments]);

  // ── actions ────────────────────────────────────────────────────────────────
  const markAttended = async (id: string, patientName: string) => {
    const { error } = await supabase
      .from("opd_appointments")
      .update({ status: "attended", payment_status: "paid" })
      .eq("id", id);
    if (error) toast.error("Failed to update.");
    else setAttendedPatient(patientName);
  };

  const cancelAppointment = async (id: string) => {
    const { error } = await supabase
      .from("opd_appointments")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) toast.error("Failed to cancel.");
    else toast.success("Appointment cancelled.");
  };

  // ── empty state messages ───────────────────────────────────────────────────
  const emptyMsg: Record<SubTab, string> = {
    today:     "No appointments for today",
    upcoming:  "No upcoming appointments",
    completed: "No completed appointments yet",
  };

  return (
    <MobileContainer>
      <div className="min-h-screen bg-background flex flex-col">

        {/* Header */}
        <div className="bg-primary text-primary-foreground px-4 pt-12 pb-4 shrink-0">
          <h1 className="text-xl font-semibold">Consultations</h1>
          <p className="text-white/70 text-sm mt-1">Manage your appointments</p>
        </div>

        {/* OPD label */}
        <div className="px-4 py-3 bg-card border-b border-border sticky top-0 z-10 shrink-0">
          <div className="flex bg-muted rounded-xl p-1">
            <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-primary bg-card shadow-sm">
              <Building2 className="w-4 h-4" /> Hospital OPD
            </div>
          </div>
        </div>

        {/* Sub tabs */}
        <div className="px-4 py-2 flex gap-2 bg-card border-b border-border shrink-0">
          {(["today", "upcoming", "completed"] as SubTab[]).map((tab) => (
            <button key={tab} onClick={() => setSubTab(tab)}
              className={cn("px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                subTab === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              )}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto pb-24 scrollbar-dark"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#4B5563 #1F2937' }}>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CalendarX className="w-12 h-12 mb-3 opacity-25" />
              <p className="text-sm font-medium">{emptyMsg[subTab]}</p>
            </div>
          ) : (
            appointments.map((apt) => (
              <Card key={apt.id} className="overflow-hidden">
                <CardContent className="p-4">

                  {/* Top row: avatar + name + status */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {apt.patient_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-foreground truncate">{apt.patient_name}</p>
                        <StatusBadge status={apt.status} />
                      </div>
                      {apt.patient_phone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{apt.patient_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date + time */}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{apt.time_slot}</span>
                    </div>
                    <span>·</span>
                    <span>
                      {new Date(apt.appointment_date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "short", day: "numeric", month: "short",
                      })}
                    </span>
                  </div>

                  {/* Badges row */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <PaymentBadge paymentStatus={apt.payment_status} />
                  </div>

                  {/* Footer: fee + actions */}
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-primary text-base">₹{apt.fee}</span>
                      {apt.status === "pending" && (
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" onClick={() => setDetailsApt(apt)}>
                            <FileText className="w-3 h-3 mr-1" /> Details
                          </Button>
                          <Button size="sm" variant="outline"
                            className="h-7 text-xs px-2.5 text-destructive border-destructive hover:bg-destructive/10"
                            onClick={() => cancelAppointment(apt.id)}>
                            <X className="w-3 h-3 mr-1" /> Cancel
                          </Button>
                        </div>
                      )}
                      {apt.status !== "pending" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" onClick={() => setDetailsApt(apt)}>
                          <FileText className="w-3 h-3 mr-1" /> Details
                        </Button>
                      )}
                    </div>
                    {apt.status === "pending" && (
                      <Button className="w-full h-9" variant="medical" onClick={() => markAttended(apt.id, apt.patient_name)}>
                        <Check className="w-3.5 h-3.5 mr-1.5" /> Mark Attended
                      </Button>
                    )}
                  </div>

                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Details popup */}
        <Dialog open={!!detailsApt} onOpenChange={() => setDetailsApt(null)}>
          <DialogContent className="max-w-[340px] rounded-2xl p-5">
            <h2 className="text-base font-bold text-foreground mb-4">Patient Details — {detailsApt?.patient_name}</h2>

            {/* Symptoms */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Symptoms</p>
              {detailsApt?.symptoms?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {detailsApt.symptoms.map((s) => (
                    <span key={s} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">{s}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No symptoms provided</p>
              )}
            </div>

            {/* Description */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Description</p>
              {detailsApt?.description ? (
                <p className="text-sm text-foreground bg-muted rounded-lg px-3 py-2">{detailsApt.description}</p>
              ) : (
                <p className="text-xs text-muted-foreground italic">No description provided</p>
              )}
            </div>

            {/* Report / Image */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Report / Image</p>
              {detailsApt?.report_url ? (
                <a href={detailsApt.report_url} target="_blank" rel="noopener noreferrer">
                  <img src={detailsApt.report_url} alt="Report"
                    className="w-full rounded-xl border border-border object-cover max-h-52"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <p className="text-xs text-primary mt-1.5 flex items-center gap-1">
                    <Image className="w-3 h-3" /> Tap to open full image
                  </p>
                </a>
              ) : (
                <p className="text-xs text-muted-foreground italic">No report uploaded</p>
              )}
            </div>

            <Button className="w-full" onClick={() => setDetailsApt(null)}>Close</Button>
          </DialogContent>
        </Dialog>

        {/* Attended success popup */}
        <Dialog open={!!attendedPatient} onOpenChange={() => setAttendedPatient(null)}>
          <DialogContent className="max-w-[300px] rounded-2xl p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">Consultation Done!</h2>
            <p className="text-sm text-muted-foreground mb-5">
              <span className="font-semibold text-foreground">{attendedPatient}</span> has been marked as attended.
            </p>
            <Button className="w-full" onClick={() => setAttendedPatient(null)}>Done</Button>
          </DialogContent>
        </Dialog>

        <BottomNav />
      </div>
    </MobileContainer>
  );
};
