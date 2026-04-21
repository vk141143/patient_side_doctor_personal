import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, MapPin, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const ALL_SLOTS = [
  { time: "9:00 AM",  period: "morning" },
  { time: "9:30 AM",  period: "morning" },
  { time: "10:00 AM", period: "morning" },
  { time: "10:30 AM", period: "morning" },
  { time: "11:00 AM", period: "morning" },
  { time: "11:30 AM", period: "morning" },
  { time: "12:00 PM", period: "afternoon" },
  { time: "12:30 PM", period: "afternoon" },
  { time: "2:00 PM",  period: "afternoon" },
  { time: "2:30 PM",  period: "afternoon" },
  { time: "3:00 PM",  period: "afternoon" },
  { time: "3:30 PM",  period: "afternoon" },
  { time: "4:00 PM",  period: "evening" },
  { time: "4:30 PM",  period: "evening" },
  { time: "5:00 PM",  period: "evening" },
  { time: "5:30 PM",  period: "evening" },
  { time: "6:00 PM",  period: "evening" },
  { time: "6:30 PM",  period: "evening" },
];

const PERIODS = [
  { id: "morning",   label: "🌅 Morning" },
  { id: "afternoon", label: "☀️ Afternoon" },
  { id: "evening",   label: "🌆 Evening" },
];

// generate next 7 dates
const getDates = () => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
};

const fmt = (d: Date) => d.toISOString().split("T")[0];
const dayLabel = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short" });
const dateNum = (d: Date) => d.getDate();
const monthLabel = (d: Date) => d.toLocaleDateString("en-US", { month: "short" });

export const OpdBookingPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const doctorId = params.get("doctor_id") ?? "";

  const [doctor, setDoctor] = useState<any>(null);
  const [dates] = useState(getDates());
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [payMethod, setPayMethod] = useState<"online" | "hospital">("online");
  const [booking, setBooking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");

  useEffect(() => {
    if (!doctorId) return;
    supabase.from("doctors").select("full_name,specialization,hospital_name,clinic_address,city").eq("firebase_uid", doctorId).single()
      .then(({ data }) => setDoctor(data));
  }, [doctorId]);

  // fetch booked slots for selected date in real-time
  useEffect(() => {
    if (!doctorId) return;
    const dateStr = fmt(selectedDate);

    const fetch = async () => {
      const { data } = await supabase
        .from("opd_appointments")
        .select("time_slot")
        .eq("doctor_id", doctorId)
        .eq("appointment_date", dateStr)
        .neq("status", "cancelled");
      setBookedSlots((data ?? []).map((r: any) => r.time_slot));
    };
    fetch();

    // real-time subscription
    const channel = supabase
      .channel(`opd_${doctorId}_${dateStr}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "opd_appointments",
        filter: `doctor_id=eq.${doctorId}`,
      }, fetch)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [doctorId, selectedDate]);

  const handleConfirmBooking = async () => {
    if (!patientName.trim()) return;
    setBooking(true);
    const { error } = await supabase.from("opd_appointments").insert({
      doctor_id: doctorId,
      patient_name: patientName,
      patient_phone: patientPhone,
      appointment_date: fmt(selectedDate),
      time_slot: selectedSlot,
      fee: 300,
      payment_method: payMethod,
      status: "pending",
      payment_status: payMethod === "hospital" ? "pending" : "pending",
    });
    setBooking(false);
    if (!error) { setShowReview(false); setShowSuccess(true); }
  };

  return (
    <MobileContainer>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-primary-foreground px-4 pt-10 pb-5 shrink-0">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary-foreground/80 mb-3 text-sm">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-lg font-bold">Select Time Slot</h1>
          {doctor && (
            <p className="text-primary-foreground/70 text-sm mt-0.5">
              Choose a convenient time with Dr. {doctor.full_name}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pb-24 px-4 py-4 space-y-4">
          {/* Doctor info */}
          {doctor && (
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="font-bold text-primary text-lg">
                  {doctor.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </span>
              </div>
              <div>
                <p className="font-semibold text-foreground">Dr. {doctor.full_name}</p>
                <p className="text-xs text-muted-foreground">{doctor.specialization}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="w-3 h-3" />
                  <span>{doctor.hospital_name} · {doctor.city}</span>
                </div>
              </div>
            </div>
          )}

          {/* Date selector */}
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-2">Select Date</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {dates.map((d, i) => {
                const active = fmt(d) === fmt(selectedDate);
                return (
                  <button key={i} onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                    className={cn("flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border-2 min-w-[56px] transition-all",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
                    )}>
                    <span className="text-[10px] font-medium">{i === 0 ? "Today" : dayLabel(d)}</span>
                    <span className="text-lg font-bold leading-tight">{dateNum(d)}</span>
                    <span className="text-[10px]">{monthLabel(d)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slots by period */}
          {PERIODS.map((period) => {
            const slots = ALL_SLOTS.filter((s) => s.period === period.id);
            return (
              <div key={period.id}>
                <p className="text-sm font-semibold text-foreground mb-2">{period.label}</p>
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((s) => {
                    const booked = bookedSlots.includes(s.time);
                    const active = selectedSlot === s.time;
                    return (
                      <button key={s.time} disabled={booked}
                        onClick={() => setSelectedSlot(s.time)}
                        className={cn("py-2.5 rounded-lg text-sm font-medium border transition-all",
                          booked
                            ? "bg-muted/30 text-muted-foreground border-border line-through cursor-not-allowed opacity-50"
                            : active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:border-primary/50"
                        )}>
                        {s.time}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="px-4 pb-6 pt-3 border-t border-border bg-card shrink-0">
          <Button className="w-full h-12 font-semibold" disabled={!selectedSlot}
            onClick={() => setShowReview(true)}>
            Confirm Appointment
          </Button>
        </div>

        {/* Review & Confirm dialog */}
        <Dialog open={showReview} onOpenChange={setShowReview}>
          <DialogContent className="max-w-[360px] rounded-2xl p-0 overflow-hidden">
            <div className="bg-primary text-primary-foreground px-5 py-4">
              <p className="text-xs text-primary-foreground/70">Review and confirm your booking</p>
              {doctor && <p className="font-bold text-lg">Dr. {doctor.full_name}</p>}
              {doctor && <p className="text-sm text-primary-foreground/80">{doctor.specialization}</p>}
            </div>
            <div className="px-5 py-4 space-y-4">
              {doctor && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{doctor.hospital_name}, {doctor.clinic_address}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-semibold text-sm text-foreground">
                    {selectedDate.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="font-semibold text-sm text-foreground">{selectedSlot}</p>
                </div>
              </div>

              {/* Patient details */}
              <div className="space-y-2">
                <input placeholder="Your name *" value={patientName} onChange={(e) => setPatientName(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground outline-none focus:border-primary" />
                <input placeholder="Phone number" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground outline-none focus:border-primary" />
              </div>

              {/* Fee */}
              <div className="bg-muted/50 rounded-xl p-3 space-y-1.5 text-sm">
                <p className="font-semibold text-foreground mb-2">Fee Details</p>
                <div className="flex justify-between text-muted-foreground"><span>Consultation Fee</span><span>₹300</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Booking Fee</span><span>₹0</span></div>
                <div className="flex justify-between font-bold text-foreground border-t border-border pt-1.5 mt-1"><span>Total</span><span>₹300</span></div>
              </div>

              {/* Payment */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">Payment Options</p>
                <div className="space-y-2">
                  {[
                    { id: "online", label: "Pay Online", sub: "UPI, Card, Net Banking" },
                    { id: "hospital", label: "Pay at Hospital", sub: "Cash or card at reception" },
                  ].map((opt) => (
                    <button key={opt.id} onClick={() => setPayMethod(opt.id as any)}
                      className={cn("w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all",
                        payMethod === opt.id ? "border-primary bg-primary/5" : "border-border bg-card"
                      )}>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.sub}</p>
                      </div>
                      <div className={cn("w-4 h-4 rounded-full border-2", payMethod === opt.id ? "border-primary bg-primary" : "border-muted-foreground")} />
                    </button>
                  ))}
                </div>
              </div>

              <Button className="w-full h-12 font-semibold" disabled={booking || !patientName.trim()} onClick={handleConfirmBooking}>
                {booking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {booking ? "Booking…" : `Confirm Booking • ₹300`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Success dialog */}
        <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
          <DialogContent className="max-w-[320px] rounded-2xl p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">Booking Confirmed!</h2>
            <p className="text-sm text-muted-foreground mb-1">
              {selectedDate.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <p className="text-primary font-semibold mb-4">{selectedSlot}</p>
            <p className="text-xs text-muted-foreground mb-5">
              {payMethod === "hospital" ? "Pay at the hospital reception." : "Complete payment online to confirm."}
            </p>
            <Button className="w-full" onClick={() => { setShowSuccess(false); navigate(-1); }}>Done</Button>
          </DialogContent>
        </Dialog>
      </div>
    </MobileContainer>
  );
};
