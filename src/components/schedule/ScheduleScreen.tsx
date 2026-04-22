import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/navigation/BottomNav";
import { Clock, MessageSquare, Building2, CheckCircle2, Loader2 } from "lucide-react";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ALL_SLOTS = [
  "9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM",
  "12:00 PM","12:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM",
  "4:00 PM","4:30 PM","5:00 PM","5:30 PM","6:00 PM","6:30 PM",
];

const CHAT_SHIFTS = [
  { id: "7am-11am",  label: "7:00 AM – 11:00 AM",  period: "Morning",       endHour: 11 },
  { id: "11am-3pm",  label: "11:00 AM – 3:00 PM",  period: "Afternoon",     endHour: 15 },
  { id: "3pm-7pm",   label: "3:00 PM – 7:00 PM",   period: "Evening",       endHour: 19 },
  { id: "7pm-11pm",  label: "7:00 PM – 11:00 PM",  period: "Night",         endHour: 23 },
  { id: "11pm-3am",  label: "11:00 PM – 3:00 AM",  period: "Late Night",    endHour: 3  },
  { id: "3am-7am",   label: "3:00 AM – 7:00 AM",   period: "Early Morning", endHour: 7  },
];

const isShiftExpired = (id: string) => {
  const shift = CHAT_SHIFTS.find((s) => s.id === id);
  if (!shift) return false;
  const h = new Date().getHours();
  if (id === "11pm-3am") return h >= 3 && h < 23;
  return h >= shift.endHour;
};

// get date string for a weekday offset from today
const getDateForDay = (dayIndex: number): string => {
  const today = new Date().getDay(); // 0=Sun
  const weekDayMap: Record<string, number> = { Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:0 };
  const target = weekDayMap[WEEK_DAYS[dayIndex]];
  const diff = (target - today + 7) % 7;
  const d = new Date();
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
};

type ScheduleType = "online" | "opd";

export const ScheduleScreen = () => {
  const [scheduleType, setScheduleType] = useState<ScheduleType>("online");
  const [selectedDayIdx, setSelectedDayIdx] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);

  // OPD working hours
  const [opdStart, setOpdStart] = useState("09:00");
  const [opdEnd, setOpdEnd] = useState("18:00");
  const [savingHours, setSavingHours] = useState(false);

  // booked slots from DB (real-time)
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // chat shifts
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const uid = localStorage.getItem("doctor_uid") ?? "";

  // load doctor OPD hours + chat shifts on mount
  useEffect(() => {
    if (!uid) return;
    supabase.from("doctors").select("opd_start,opd_end,chat_shift").eq("firebase_uid", uid).single()
      .then(({ data }) => {
        if (!data) return;
        if (data.opd_start) setOpdStart(data.opd_start);
        if (data.opd_end)   setOpdEnd(data.opd_end);
        if (data.chat_shift) {
          const saved = data.chat_shift.split(",").filter(Boolean);
          setSelectedShifts(saved.filter((id: string) => !isShiftExpired(id)));
        }
      });
  }, [uid]);

  // real-time booked slots for selected day
  useEffect(() => {
    if (!uid) return;
    const dateStr = getDateForDay(selectedDayIdx);

    const fetch = async () => {
      const { data } = await supabase
        .from("opd_appointments")
        .select("time_slot")
        .eq("doctor_id", uid)
        .eq("appointment_date", dateStr)
        .neq("status", "cancelled");
      setBookedSlots((data ?? []).map((r: any) => r.time_slot));
    };
    fetch();

    const channel = supabase
      .channel(`schedule_${uid}_${dateStr}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "opd_appointments", filter: `doctor_id=eq.${uid}` }, fetch)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [uid, selectedDayIdx]);

  // ── OPD working hours save ─────────────────────────────────────────────────
  const handleSaveHours = async () => {
    if (!uid) return;
    setSavingHours(true);
    const { error } = await supabase.from("doctors").update({ opd_start: opdStart, opd_end: opdEnd }).eq("firebase_uid", uid);
    setSavingHours(false);
    if (error) toast.error("Failed to save hours.");
    else toast.success("Working hours saved!");
  };

  // ── Chat shifts ────────────────────────────────────────────────────────────
  const persistShifts = async (shifts: string[]): Promise<boolean> => {
    if (!uid) { toast.error("Not logged in."); return false; }
    const { error } = await supabase.from("doctors").update({ chat_shift: shifts.join(",") }).eq("firebase_uid", uid);
    if (error) { toast.error("Failed to save."); return false; }
    return true;
  };

  const handleSaveShift = async () => {
    if (!selectedShifts.length) { toast.error("Please select at least one shift."); return; }
    setSaving(true);
    const ok = await persistShifts(selectedShifts);
    setSaving(false);
    if (ok) setShowConfirm(true);
  };

  const toggleShift = async (id: string) => {
    if (selectedShifts.includes(id)) {
      const next = selectedShifts.filter((s) => s !== id);
      setSelectedShifts(next);
      const ok = await persistShifts(next);
      if (ok) toast.success("Shift removed.");
    } else {
      setSelectedShifts((prev) => [...prev, id]);
    }
  };

  return (
    <MobileContainer>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <div className="bg-primary text-primary-foreground px-4 pt-12 pb-6 shrink-0">
          <h1 className="text-xl font-semibold">Schedule & Availability</h1>
          <p className="text-primary-foreground/70 text-sm mt-1">Manage your schedules by type</p>
        </div>

        <div className="scrollable-content flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4">

          {/* Tabs */}
          <div className="flex bg-muted rounded-xl p-1">
            {(["online", "opd"] as ScheduleType[]).map((type) => {
              const Icon = type === "online" ? MessageSquare : Building2;
              return (
                <button key={type} onClick={() => setScheduleType(type)}
                  className={cn("flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5",
                    scheduleType === type ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  )}>
                  <Icon className="w-4 h-4" />
                  <span>{type === "opd" ? "OPD" : "Instant Chat"}</span>
                </button>
              );
            })}
          </div>

          {/* ── CHAT TAB ── */}
          {scheduleType === "online" && (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Select Your Chat Shifts</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Select one or more shifts. Saved shifts stay active until the shift ends — then auto-deselect. Tap a saved shift to remove it immediately.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {CHAT_SHIFTS.map((shift) => {
                      const active = selectedShifts.includes(shift.id);
                      const expired = isShiftExpired(shift.id);
                      return (
                        <button key={shift.id} onClick={() => !expired && toggleShift(shift.id)} disabled={expired}
                          className={cn("relative p-3 rounded-xl border-2 text-left transition-all",
                            expired ? "border-border bg-muted/20 opacity-40 cursor-not-allowed"
                              : active ? "border-primary bg-primary/10"
                              : "border-border bg-muted/40 hover:border-primary/40"
                          )}>
                          {active && !expired && <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-primary" />}
                          {expired && <span className="absolute top-2 right-2 text-[9px] text-muted-foreground">Ended</span>}
                          <p className="text-[10px] text-muted-foreground font-medium mb-0.5">{shift.period}</p>
                          <p className={cn("text-xs font-semibold", active && !expired ? "text-primary" : "text-foreground")}>{shift.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Button className="w-full h-12" variant="medical" onClick={handleSaveShift} disabled={saving || !selectedShifts.length}>
                {saving ? "Saving…" : "Save Shifts"}
              </Button>

              <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                <DialogContent className="max-w-[320px] rounded-2xl p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground mb-1">Shifts Saved!</h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    {selectedShifts.length} shift{selectedShifts.length > 1 ? "s" : ""} saved successfully.
                  </p>
                  <div className="flex flex-col gap-1 mb-4">
                    {selectedShifts.map((id) => {
                      const s = CHAT_SHIFTS.find((c) => c.id === id);
                      return s ? (
                        <span key={id} className="text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1">
                          {s.period} · {s.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mb-5">Shifts auto-deselect when their end time passes.</p>
                  <Button className="w-full" onClick={() => setShowConfirm(false)}>Got it</Button>
                </DialogContent>
              </Dialog>
            </>
          )}

          {/* ── OPD TAB ── */}
          {scheduleType === "opd" && (
            <>
              {/* Editable working hours */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Working Hours</span>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Start</p>
                      <input type="time" value={opdStart} onChange={(e) => setOpdStart(e.target.value)}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm font-semibold text-primary bg-muted outline-none focus:border-primary" />
                    </div>
                    <span className="text-muted-foreground mt-5">to</span>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">End</p>
                      <input type="time" value={opdEnd} onChange={(e) => setOpdEnd(e.target.value)}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm font-semibold text-primary bg-muted outline-none focus:border-primary" />
                    </div>
                  </div>
                  <Button className="w-full h-10" variant="outline" onClick={handleSaveHours} disabled={savingHours}>
                    {savingHours ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {savingHours ? "Saving…" : "Save Working Hours"}
                  </Button>
                </CardContent>
              </Card>

              {/* Day selector */}
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold text-muted-foreground mb-3">Select Day</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {WEEK_DAYS.map((day, i) => (
                      <button key={day} onClick={() => setSelectedDayIdx(i)}
                        className={cn("flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                          selectedDayIdx === i ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                        )}>
                        {day}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Time slots — real-time booked */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold">Time Slots — {WEEK_DAYS[selectedDayIdx]}</span>
                    <span className="text-xs text-muted-foreground">Striked = booked</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {ALL_SLOTS.map((time) => {
                      const booked = bookedSlots.includes(time);
                      return (
                        <div key={time}
                          className={cn("py-2.5 px-2 rounded-lg text-xs font-medium text-center border",
                            booked
                              ? "bg-destructive/10 text-destructive border-destructive/30 line-through"
                              : "bg-success/10 text-success border-success/30"
                          )}>
                          {time}
                        </div>
                      );
                    })}
                  </div>
                  {bookedSlots.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      {bookedSlots.length} slot{bookedSlots.length > 1 ? "s" : ""} booked for this day
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}

        </div>

        <BottomNav />
      </div>
    </MobileContainer>
  );
};
