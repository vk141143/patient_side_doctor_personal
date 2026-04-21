import { useState, useEffect } from "react";
import {
  Bell, MessageSquare, Building2, Clock, IndianRupee,
  Star, Users, ChevronRight, Moon, Sun,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/navigation/BottomNav";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { ConsultationRequestPopup, ConsultationRequest } from "@/components/consultation/ConsultationRequestPopup";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useDoctor } from "@/hooks/useDoctor";
import { updateDoctorOnlineStatus, updateDoctorAvailability, supabase } from "@/lib/supabase";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function DoctorDashboard() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { doctor, loading } = useDoctor();

  const [isOnline, setIsOnline] = useState(() => localStorage.getItem("doctor_online") === "true");
  const [activeRequest, setActiveRequest] = useState<ConsultationRequest | null>(null);
  const [availability, setAvailability] = useState({ chat: true, opd: true });
  const [showOpdOfflinePopup, setShowOpdOfflinePopup] = useState(false);

  // ── real-time dashboard data ───────────────────────────────────────────────
  const [clinicPatients, setClinicPatients] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [opdRating, setOpdRating] = useState<string>("—");
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatEarningRate, setChatEarningRate]   = useState<number | null>(null);
  const [videoEarningRate, setVideoEarningRate] = useState<number | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<{
    id: string; patient_name: string; time_slot: string; symptoms: string[] | null;
  }[]>([]);

  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const uid = localStorage.getItem("doctor_uid");
    if (!uid) return;

    // today's attended OPD count
    const fetchClinic = () =>
      supabase.from("opd_appointments").select("id", { count: "exact", head: true })
        .eq("doctor_id", uid).eq("appointment_date", todayStr).eq("status", "attended")
        .then(({ count }) => setClinicPatients(count ?? 0));

    // today's earnings sum
    const fetchEarnings = () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      supabase.from("doctor_earnings").select("fee")
        .eq("doctor_id", uid)
        .gte("earned_at", todayStart.toISOString())
        .lte("earned_at", todayEnd.toISOString())
        .then(({ data }) => setTodayEarnings((data ?? []).reduce((s: number, e: { fee: number }) => s + e.fee, 0)));
    };

    // OPD average rating
    const fetchRating = () =>
      supabase.from("doctor_ratings").select("rating").eq("doctor_id", uid)
        .then(({ data }) => {
          if (data?.length) {
            const avg = data.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / data.length;
            setOpdRating((Math.round(avg * 10) / 10).toFixed(1));
          }
        });

    // upcoming OPD appointments (today, pending)
    const fetchUpcoming = () =>
      supabase.from("opd_appointments")
        .select("id, patient_name, time_slot, symptoms")
        .eq("doctor_id", uid).eq("appointment_date", todayStr).eq("status", "pending")
        .order("time_slot", { ascending: true }).limit(3)
        .then(({ data }) => setUpcomingAppointments((data as any[]) ?? []));

    fetchClinic(); fetchEarnings(); fetchRating(); fetchUpcoming();

    // realtime — re-fetch on any opd_appointments or doctor_earnings change
    const channel = supabase.channel("dashboard_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "opd_appointments", filter: `doctor_id=eq.${uid}` },
        () => { fetchClinic(); fetchUpcoming(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "doctor_earnings", filter: `doctor_id=eq.${uid}` },
        () => fetchEarnings())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "doctor_ratings", filter: `doctor_id=eq.${uid}` },
        () => fetchRating())
      .subscribe();

    // unread admin notifications count
    const fetchUnread = () => {
      const stored = localStorage.getItem(`notif_read_${uid}`);
      const readIds: string[] = stored ? JSON.parse(stored) : [];
      supabase
        .from("admin_notifications")
        .select("id")
        .or(`target_id.eq.${uid},target_type.eq.all`)
        .then(({ data }) => {
          const all = (data ?? []).map((r: { id: string }) => r.id);
          setUnreadCount(all.filter((id) => !readIds.includes(id)).length);
        });
    };
    fetchUnread();

    const notifChannel = supabase.channel("dashboard_notif_badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_notifications" },
        () => fetchUnread())
      .subscribe();

    return () => { supabase.removeChannel(channel); supabase.removeChannel(notifChannel); };
  }, []);

  // ── Realtime pricing ───────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("admin_pricing").select("key, value");
      (data ?? []).forEach((row: { key: string; value: number }) => {
        if (row.key === "available_chat_price")  setChatEarningRate(row.value);
        if (row.key === "available_video_price") setVideoEarningRate(row.value);
      });
    };
    load();
    const ch = supabase.channel("pricing_doctor_dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_pricing" },
        (payload) => {
          const row = payload.new as { key: string; value: number };
          if (row.key === "available_chat_price")  setChatEarningRate(row.value);
          if (row.key === "available_video_price") setVideoEarningRate(row.value);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Sync availability + restore online status when doctor loads
  useEffect(() => {
    if (!doctor) return;
    setAvailability({
      chat: (doctor as any).chat_enabled ?? doctor.service_chat,
      opd: (doctor as any).opd_enabled ?? doctor.service_opd,
    });
    if (localStorage.getItem("doctor_online") === "true") {
      const uid = doctor.firebase_uid ?? localStorage.getItem("doctor_uid");
      if (uid) updateDoctorOnlineStatus(uid, true);
    }
  }, [doctor]);

  const handleAvailabilityChange = async (key: "chat" | "opd", checked: boolean) => {
    if (key === "opd" && !checked) {
      // show warning popup before turning off OPD
      setShowOpdOfflinePopup(true);
      return;
    }
    const next = { ...availability, [key]: checked };
    setAvailability(next);
    const uid = doctor?.firebase_uid ?? localStorage.getItem("doctor_uid");
    if (uid) await updateDoctorAvailability(uid, next.chat, next.opd);
  };

  const confirmOpdOffline = async () => {
    const next = { ...availability, opd: false };
    setAvailability(next);
    setShowOpdOfflinePopup(false);
    const uid = doctor?.firebase_uid ?? localStorage.getItem("doctor_uid");
    if (uid) await updateDoctorAvailability(uid, next.chat, false);
  };

  // ── Realtime: listen for new consultation_requests matching doctor's specialization
  useEffect(() => {
    if (!isOnline || !doctor?.specialization) return;
    const uid = doctor.firebase_uid;
    const spec = doctor.specialization.toLowerCase().trim();

    // Poll every 1s for any 'searching' request matching specialty
    const poll = async () => {
      const { data } = await supabase
        .from("consultation_requests")
        .select("id, patient_id, patient_name, specialty, description, duration, severity, report_url, status, call_type, consult_mode, fee")
        .eq("status", "searching")
        .ilike("specialty", spec)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const req = { ...data[0] } as ConsultationRequest;
        // Always fetch real name from users table — patient_name in requests can be stale
        const { data: user } = await supabase
          .from("users").select("name").eq("id", req.patient_id).maybeSingle();
        if (user?.name) req.patient_name = user.name;
        setActiveRequest((prev) => prev?.id === req.id ? prev : req);
      }
    };

    poll(); // run immediately on go online
    const pollInterval = setInterval(poll, 5000); // reduced to 5s — realtime handles instant delivery

    // Also subscribe realtime for instant delivery
    const channel = supabase.channel(`consult_req_${uid}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "consultation_requests" },
        (payload) => {
          const req = { ...payload.new } as ConsultationRequest;
          if (req.specialty?.toLowerCase().trim() === spec && req.status === "searching") {
            // Always resolve real name from users table
            supabase.from("users").select("name").eq("id", req.patient_id).maybeSingle()
              .then(({ data: user }) => {
                if (user?.name) req.patient_name = user.name;
                setActiveRequest(req);
              });
          }
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "consultation_requests" },
        (payload) => {
          const updated = payload.new as ConsultationRequest;
          setActiveRequest((prev) => {
            if (prev?.id === updated.id && updated.status !== "searching" && updated.doctor_id !== uid) {
              return null;
            }
            return prev;
          });
        })
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [isOnline, doctor]);

  const stats = [
    { label: "Today's Consults", value: String(clinicPatients), icon: Users, color: "text-primary" },
    { label: "Today's Earnings", value: `₹${todayEarnings.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-success" },
    { label: "OPD Rating", value: opdRating, icon: Star, color: "text-yellow-500" },
  ];

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };


  const initials = doctor?.full_name
    ? doctor.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "DR";
  const displayName = doctor?.full_name ?? "Doctor";
  const specialization = doctor?.specialization ?? "";
  const location = doctor?.city ? `${doctor.city}${doctor.state ? `, ${doctor.state}` : ""}` : "";

  if (loading) {
    return (
      <MobileContainer>
        <div className="h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
          </div>
        </div>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      <div className="h-screen bg-background flex flex-col relative">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                <span className="text-xl font-bold text-primary-foreground">{initials}</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{getGreeting()}</p>
                <h1 className="font-semibold text-foreground">{displayName}</h1>
                {(specialization || location) && (
                  <p className="text-xs text-muted-foreground">
                    {[specialization, location].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="p-2 rounded-full hover:bg-muted transition-colors">
                {theme === "light" ? <Moon className="w-5 h-5 text-muted-foreground" /> : <Sun className="w-5 h-5 text-muted-foreground" />}
              </button>
              <button onClick={() => navigate("/notifications")}
                className="relative p-2 rounded-full hover:bg-muted transition-colors">
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20 scrollbar-dark"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#4B5563 #1F2937' }}>
          <div className="p-4 space-y-4">

            {/* Clinic Status */}
            {/* <div className="medical-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Clinic Status</h3>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-success/10 text-success">
                  <CheckCircle2 className="w-3 h-3" /> Open
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className={cn("rounded-lg p-2.5 text-center", isOnline ? "bg-success/10" : "bg-muted")}>
                  <Wifi className={cn("w-4 h-4 mx-auto mb-1", isOnline ? "text-success" : "text-muted-foreground")} />
                  <p className="text-[10px] text-muted-foreground">Online</p>
                  <p className={cn("text-xs font-semibold", isOnline ? "text-success" : "text-muted-foreground")}>
                    {isOnline ? "Active" : "Off"}
                  </p>
                </div>
                <div className="rounded-lg p-2.5 text-center bg-primary/10">
                  <Building2 className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="text-[10px] text-muted-foreground">OPD</p>
                  <p className="text-xs font-semibold text-primary">Open</p>
                </div>
              </div>
            </div> */}

            {/* Today's Summary */}
            <div className="medical-card">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Today's Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-lg font-bold text-foreground">{clinicPatients}</p>
                  <p className="text-[10px] text-muted-foreground">Clinic</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-1">
                    <IndianRupee className="w-5 h-5 text-success" />
                  </div>
                  <p className="text-lg font-bold text-foreground">₹{todayEarnings.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-muted-foreground">Earned</p>
                </div>
              </div>
            </div>

            {/* Staff Status */}
            {/* <div className="medical-card cursor-pointer" onClick={() => navigate("/staff")}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Staff Status</h3>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between">
                {[
                  { label: "On Duty", value: staffStatus.onDuty, icon: Users, color: "text-success", bg: "bg-success/10" },
                  { label: "On Visits", value: staffStatus.onVisits, icon: MapPin, color: "text-warning", bg: "bg-warning/10" },
                  { label: "Idle", value: staffStatus.idle, icon: Clock, color: "text-muted-foreground", bg: "bg-muted" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", s.bg)}>
                      <s.icon className={cn("w-4 h-4", s.color)} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="font-semibold text-foreground">{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div> */}

            {/* Online Status Toggle */}
            <div className={cn(
              "flex items-center justify-between p-4 rounded-xl border transition-colors",
              isOnline ? "bg-success/10 border-success/20" : "bg-muted border-border"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn("w-3 h-3 rounded-full", isOnline ? "bg-success animate-pulse" : "bg-muted-foreground")} />
                <span className="font-medium text-foreground">{isOnline ? "You're Online" : "You're Offline"}</span>
              </div>
              <Button variant={isOnline ? "outline" : "medical"} size="sm"
                onClick={async () => {
                  const next = !isOnline;
                  setIsOnline(next);
                  localStorage.setItem("doctor_online", String(next));
                  if (next) {
                    const enabled = { chat: true, opd: true };
                    setAvailability(enabled);
                    const uid = doctor?.firebase_uid ?? localStorage.getItem("doctor_uid");
                    if (uid) {
                      await updateDoctorOnlineStatus(uid, true);
                      await updateDoctorAvailability(uid, true, true);
                    }
                  } else {
                    setActiveRequest(null);
                    const uid = doctor?.firebase_uid ?? localStorage.getItem("doctor_uid");
                    if (uid) await updateDoctorOnlineStatus(uid, false);
                  }
                }}>
                {isOnline ? "Go Offline" : "Go Online"}
              </Button>
            </div>

            {/* Availability Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Availability Controls</h2>
                {(chatEarningRate || videoEarningRate) && (
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {chatEarningRate && <span className="text-primary font-semibold">₹{Math.floor(chatEarningRate * 0.71)} chat</span>}
                    {videoEarningRate && <span className="text-blue-600 font-semibold">₹{Math.floor(videoEarningRate * 0.71)} video</span>}
                  </div>
                )}
              </div>
              {[
                { key: "chat", icon: MessageSquare, label: "Instant Chat", sub: availability.chat ? "Accepting requests" : "Not accepting" },
                { key: "opd", icon: Building2, label: "Hospital OPD", sub: availability.opd ? "3 slots today" : "Not available today" },
              ].map((item) => (
                <div key={item.key} className={cn("toggle-control", !isOnline && "opacity-50 pointer-events-none")}>
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center",
                      availability[item.key as keyof typeof availability] ? "bg-primary/10" : "bg-muted")}>
                      <item.icon className={cn("w-5 h-5",
                        availability[item.key as keyof typeof availability] ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.sub}</p>
                    </div>
                  </div>
                  <Switch
                    checked={availability[item.key as keyof typeof availability]}
                    onCheckedChange={(checked) => handleAvailabilityChange(item.key as "chat" | "opd", checked)}
                    disabled={!isOnline}
                  />
                </div>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={cn("w-4 h-4", stat.color)} />
                  </div>
                  <p className="stat-value">{stat.value}</p>
                  <p className="stat-label">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Upcoming Appointments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Today's Pending</h2>
                <button className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
                  onClick={() => navigate("/consultations")}>
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {upcomingAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No pending appointments today</p>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.map((apt) => (
                    <div key={apt.id} className="medical-card">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary">
                            {apt.patient_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{apt.patient_name}</p>
                          {apt.symptoms?.length ? (
                            <p className="text-xs text-muted-foreground truncate">{apt.symptoms.join(", ")}</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{apt.time_slot}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </main>

        <BottomNav />

        <ConsultationRequestPopup
          isOpen={!!activeRequest}
          request={activeRequest}
          doctorId={doctor?.firebase_uid ?? ""}
          onAccept={(req) => {
            setActiveRequest(null);
            if (req.call_type === "video") {
              navigate("/video-call", { state: { request: req } });
            } else {
              navigate("/consultation", { state: { request: req } });
            }
          }}
          onDecline={() => setActiveRequest(null)}
        />

        {/* OPD offline confirmation popup */}
        <Dialog open={showOpdOfflinePopup} onOpenChange={setShowOpdOfflinePopup}>
          <DialogContent className="max-w-[320px] rounded-2xl p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-7 h-7 text-warning" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">Turn Off Hospital OPD?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Patients will not be able to book OPD appointments with you today. Existing bookings will remain unaffected.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowOpdOfflinePopup(false)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={confirmOpdOffline}>Turn Off</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MobileContainer>
  );
}
