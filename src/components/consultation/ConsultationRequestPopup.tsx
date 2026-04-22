import { useState, useEffect, useRef } from "react";
import { X, User, Loader2, MessageSquare, Video, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { showLocalNotification, vibrateDevice } from "@/lib/notifications";

export interface ConsultationRequest {
  id: string;
  patient_id: string;
  patient_name: string | null;
  specialty: string;
  description: string | null;
  duration: string | null;
  severity: string | null;
  report_url: string | null;
  status: string;
  call_type?: string | null;    // 'chat' | 'video'
  consult_mode?: string | null; // 'instant' | 'available'
  fee?: number | null;
}

interface Props {
  isOpen: boolean;
  request: ConsultationRequest | null;
  doctorId: string;
  onAccept: (request: ConsultationRequest) => void;
  onDecline: () => void;
}

const TIMEOUT_SECS = 60;

const severityColor: Record<string, string> = {
  mild:     "bg-green-100 text-green-700 border-green-200",
  moderate: "bg-yellow-100 text-yellow-700 border-yellow-200",
  urgent:   "bg-red-100 text-red-700 border-red-200",
};

export function ConsultationRequestPopup({ isOpen, request, doctorId, onAccept, onDecline }: Props) {
  const [countdown, setCountdown] = useState(TIMEOUT_SECS);
  const [accepting, setAccepting] = useState(false);
  const [taken, setTaken]         = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const buzzerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const onDeclineRef = useRef(onDecline);
  useEffect(() => { onDeclineRef.current = onDecline; }, [onDecline]);

  const isVideo    = request?.call_type === "video";
  const isInstant  = request?.call_type === "chat" && request?.consult_mode === "instant";
  const sessionMin = isInstant ? 5 : 10;
  const [resolvedFee, setResolvedFee] = useState<number | null>(request?.fee ?? null);

  // If fee is 0 or missing, fetch from admin_pricing
  useEffect(() => {
    if (!isOpen || (request?.fee && request.fee > 0)) return;
    const key = isVideo ? "available_video_price"
      : isInstant ? "instant_chat_price" : "available_chat_price";
    supabase.from("admin_pricing").select("value").eq("key", key).maybeSingle()
      .then(({ data }) => { if (data?.value) setResolvedFee(data.value); });
  }, [isOpen, request?.fee]);

  const startBuzzer = () => {
    try {
      vibrateDevice([300, 100, 300, 100, 300, 100, 300]);
      // Show local notification so doctor gets alerted even if app is in background tab
      showLocalNotification(
        isVideo ? "📹 New Video Call Request" : "⚡ New Consultation Request",
        `Patient: ${request?.patient_name ?? "Patient"} · ${request?.specialty ?? ""}`,
        "/dashboard"
      );
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const playBeep = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = isVideo ? 660 : 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
      };
      playBeep();
      buzzerRef.current = setInterval(() => {
        playBeep();
        vibrateDevice([200, 100, 200]);
      }, 1200);
    } catch {}
  };

  const stopBuzzer = () => {
    if (buzzerRef.current) { clearInterval(buzzerRef.current); buzzerRef.current = null; }
    audioCtxRef.current?.close(); audioCtxRef.current = null;
  };

  useEffect(() => {
    if (!isOpen) { setCountdown(TIMEOUT_SECS); setAccepting(false); setTaken(false); stopBuzzer(); return; }
    startBuzzer();
    return () => stopBuzzer();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => { stopBuzzer(); onDeclineRef.current(); }, 0);
          return TIMEOUT_SECS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const handleAccept = async () => {
    if (!request || accepting) return;
    setAccepting(true);
    stopBuzzer();

    // First verify request still exists and is searching (patient may have cancelled)
    const { data: check } = await supabase
      .from("consultation_requests")
      .select("status")
      .eq("id", request.id)
      .maybeSingle();

    if (!check || check.status !== "searching") {
      setAccepting(false);
      setTaken(true);
      setTimeout(() => { setTaken(false); onDecline(); }, 2000);
      return;
    }

    const { data, error } = await supabase
      .from("consultation_requests")
      .update({ status: "accepted", doctor_id: doctorId, updated_at: new Date().toISOString() })
      .eq("id", request.id)
      .eq("status", "searching")
      .select("id");

    if (error || !data || data.length === 0) {
      setAccepting(false);
      setTaken(true);
      setTimeout(() => { setTaken(false); onDecline(); }, 2000);
      return;
    }
    onAccept({ ...request, fee: Number(resolvedFee ?? request.fee ?? 0) });
  };

  const handleDecline = async () => {
    stopBuzzer();
    // Record this doctor's decline so the request can be re-queued to others
    if (request?.id && doctorId) {
      await supabase.rpc("append_doctor_decline", {
        req_id: request.id,
        doc_id: doctorId,
      }).catch(() => {
        // fallback if RPC not available: raw update
        supabase.from("consultation_requests")
          .update({ doctor_declines: supabase.rpc as any })
          .eq("id", request.id);
      });
    }
    onDecline();
  };

  if (!isOpen || !request) return null;

  if (taken) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative bg-card rounded-2xl p-8 text-center shadow-2xl w-full max-w-[300px]">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-destructive" />
          </div>
          <p className="font-bold text-foreground text-lg">Already Taken</p>
          <p className="text-sm text-muted-foreground mt-1">Another doctor accepted first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={handleDecline} />
      <div className="relative w-full max-w-[380px] bg-card rounded-2xl p-5 shadow-2xl">

        {/* Countdown ring */}
        <div className="flex justify-center mb-4">
          <div className={cn("relative w-16 h-16 rounded-full border-4 flex items-center justify-center",
            isVideo ? "bg-blue-50 border-blue-500" : "bg-primary/10 border-primary")}>
            <span className={cn("text-xl font-bold", isVideo ? "text-blue-600" : "text-primary")}>
              {countdown}
            </span>
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none"
                stroke={isVideo ? "#3b82f6" : "hsl(var(--primary))"} strokeWidth="4"
                strokeDasharray={`${(countdown / TIMEOUT_SECS) * 175.9} 175.9`}
                className="transition-all duration-1000" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            {isVideo
              ? <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                  <Video className="w-3.5 h-3.5" /> Video Call
                </span>
              : <span className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {isInstant ? "⚡ Instant Chat" : "Chat"}
                </span>
            }
            <span className="text-xs text-muted-foreground">{sessionMin} min session</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground">New Consultation Request</h2>
        </div>

        {/* Patient info */}
        <div className="bg-muted/50 rounded-xl p-4 mb-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">{request.patient_name ?? "Patient"}</p>
              <p className="text-xs text-muted-foreground capitalize">{request.specialty}</p>
            </div>
            {request.severity && (
              <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border capitalize shrink-0",
                severityColor[request.severity] ?? "bg-muted text-muted-foreground border-border")}>
                {request.severity}
              </span>
            )}
          </div>

          {request.description && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Description</p>
              <p className="text-sm text-foreground">{request.description}</p>
            </div>
          )}

          {request.duration && (
            <p className="text-xs text-muted-foreground">Duration: {request.duration}</p>
          )}

          {/* Fee earned — 71% of patient fee (29% platform cut) */}
          {(resolvedFee && resolvedFee > 0) && (
            <div className="flex items-center justify-between pt-1 border-t border-border">
              <div className="flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-green-600" />
                <span className="text-sm font-bold text-green-600">
                  ₹{Math.floor(resolvedFee * 0.71)} earned
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                (Patient pays ₹{resolvedFee} · 29% platform fee)
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 h-12" onClick={handleDecline} disabled={accepting}>
            <X className="w-4 h-4 mr-2" /> Decline
          </Button>
          <Button
            className={cn("flex-1 h-12 text-white font-semibold",
              isVideo ? "bg-blue-600 hover:bg-blue-700" : "bg-primary hover:bg-primary/90")}
            onClick={handleAccept} disabled={accepting}>
            {accepting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : isVideo ? <><Video className="w-4 h-4 mr-2" /> Accept Call</> : "Accept & Chat"}
          </Button>
        </div>
      </div>
    </div>
  );
}
