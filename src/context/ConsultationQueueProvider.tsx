import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { ConsultationRequestPopup, ConsultationRequest } from "@/components/consultation/ConsultationRequestPopup";

interface QueueCtx {
  isOnline: boolean;
  setOnline: (v: boolean) => void;
}

const QueueContext = createContext<QueueCtx>({ isOnline: false, setOnline: () => {} });
export const useQueue = () => useContext(QueueContext);

// Pages where popup must NOT show (doctor is mid-consultation)
const BLOCKED_PATHS = ["/consultation", "/prescription", "/video-call"];

export function ConsultationQueueProvider({ children }: { children: ReactNode }) {
  const navigate  = useNavigate();
  const location  = useLocation();

  const [isOnline, setOnlineState] = useState(() => localStorage.getItem("doctor_online") === "true");
  const [activeRequest, setActiveRequest] = useState<ConsultationRequest | null>(null);

  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isOnlineRef = useRef(isOnline);
  const specRef     = useRef<string>("");
  const uidRef      = useRef<string>(localStorage.getItem("doctor_uid") ?? "");

  const setOnline = (v: boolean) => {
    setOnlineState(v);
    isOnlineRef.current = v;
    localStorage.setItem("doctor_online", String(v));
  };

  // Load specialization once
  useEffect(() => {
    const uid = uidRef.current;
    if (!uid) return;
    supabase.from("doctors").select("specialization").eq("firebase_uid", uid).single()
      .then(({ data }) => {
        if (data?.specialization) specRef.current = data.specialization.toLowerCase().trim();
      });
  }, []);

  const isBlocked = () => BLOCKED_PATHS.some((p) => location.pathname.startsWith(p));

  const fetchNextRequest = async () => {
    const uid  = uidRef.current;
    const spec = specRef.current;
    if (!isOnlineRef.current || !uid || !spec || isBlocked()) return;

    const { data } = await supabase
      .from("consultation_requests")
      .select("id, patient_id, patient_name, specialty, description, duration, severity, report_url, status, call_type, consult_mode, fee, doctor_declines")
      .eq("status", "searching")
      .ilike("specialty", spec)
      .not("doctor_declines", "cs", `{${uid}}`)
      .order("created_at", { ascending: true })
      .limit(1);

    if (!data || data.length === 0) return;

    const req = { ...data[0] } as ConsultationRequest & { doctor_declines?: string[] };
    const { data: user } = await supabase.from("users").select("name").eq("id", req.patient_id).maybeSingle();
    if (user?.name) req.patient_name = user.name;

    setActiveRequest((prev) => (prev?.id === req.id ? prev : req));
  };

  // Start/stop queue based on online state
  useEffect(() => {
    isOnlineRef.current = isOnline;

    if (!isOnline) {
      if (pollRef.current) clearInterval(pollRef.current);
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
      setActiveRequest(null);
      return;
    }

    const uid = uidRef.current;
    if (!uid) return;

    fetchNextRequest();
    pollRef.current = setInterval(fetchNextRequest, 5000);

    const channel = supabase.channel(`queue_${uid}_${Date.now()}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "consultation_requests" },
        async (payload) => {
          const req = payload.new as ConsultationRequest & { doctor_declines?: string[] };
          if (req.specialty?.toLowerCase().trim() !== specRef.current) return;
          if (req.status !== "searching") return;
          if (req.doctor_declines?.includes(uid)) return;
          const { data: user } = await supabase.from("users").select("name").eq("id", req.patient_id).maybeSingle();
          if (user?.name) req.patient_name = user.name;
          setActiveRequest((prev) => prev ?? req);
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "consultation_requests" },
        (payload) => {
          const updated = payload.new as ConsultationRequest & { doctor_declines?: string[] };
          setActiveRequest((prev) => {
            if (!prev || prev.id !== updated.id) return prev;
            if (updated.status !== "searching") return null;
            if (updated.doctor_declines?.includes(uid)) return null;
            return prev;
          });
          setTimeout(fetchNextRequest, 400);
        })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [isOnline]);

  // Re-fetch when navigating back to a non-blocked page
  useEffect(() => {
    if (!isBlocked() && isOnlineRef.current) {
      setTimeout(fetchNextRequest, 300);
    }
  }, [location.pathname]);

  const handleAccept = (req: ConsultationRequest) => {
    setActiveRequest(null);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    navigate(req.call_type === "video" ? "/video-call" : "/consultation", { state: { request: req } });
  };

  const handleDecline = () => {
    setActiveRequest(null);
    setTimeout(fetchNextRequest, 400);
  };

  const showPopup = !!activeRequest && !isBlocked();

  return (
    <QueueContext.Provider value={{ isOnline, setOnline }}>
      {children}
      <ConsultationRequestPopup
        isOpen={showPopup}
        request={activeRequest}
        doctorId={uidRef.current}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </QueueContext.Provider>
  );
}
