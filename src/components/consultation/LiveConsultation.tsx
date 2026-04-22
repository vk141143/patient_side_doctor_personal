import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, Clock, Brain, Send, MoreVertical, AlertCircle,
  Loader2, Image as ImageIcon, FileText, X, Check, CheckCheck, Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ConsultationRequest } from "./ConsultationRequestPopup";
import {
  saveMessages, getMessages, getLastMessageTime, appendMessage, clearSession,
} from "@/lib/chatDB";

interface ChatMessage {
  id: string;
  session_id: string;
  sender_id: string;
  sender_role: string;
  type: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  is_read: boolean;
  created_at: string;
}

interface ChatSession {
  id: string;
  patient_name: string | null;
  doctor_name: string | null;
  specialty: string | null;
  status: string;
  started_at: string;
  doctor_id: string | null;
}

const severityColor: Record<string, string> = {
  mild:     "bg-green-100 text-green-700",
  moderate: "bg-yellow-100 text-yellow-700",
  urgent:   "bg-red-100 text-red-700",
};

export function LiveConsultation() {
  const navigate = useNavigate();
  const location = useLocation();
  const request  = location.state?.request as ConsultationRequest | undefined;
  const doctorId = localStorage.getItem("doctor_uid") ?? "";

  const isInstant    = request?.consult_mode === "instant";
  const SESSION_SECS = isInstant ? 300 : 600;

  const [session, setSession]             = useState<ChatSession | null>(null);
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [message, setMessage]             = useState("");
  const [loading, setLoading]             = useState(true);
  const [sending, setSending]             = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [showAISummary, setShowAISummary] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showTimerEnd, setShowTimerEnd]   = useState(false);
  const [endReason, setEndReason]         = useState("");
  const [timeRemaining, setTimeRemaining] = useState(SESSION_SECS);
  const [timerPaused, setTimerPaused]     = useState(false);
  const [previewImg, setPreviewImg]       = useState<string | null>(null);
  const [patientTyping, setPatientTyping] = useState(false);
  const [showVideoConfirm, setShowVideoConfirm] = useState(false);
  const [videoCallSessionId, setVideoCallSessionId] = useState<string | null>(null);
  const [showReopenPopup, setShowReopenPopup] = useState(false);
  const [reopenSession, setReopenSession] = useState<ChatSession | null>(null);
  const fileInputRef      = useRef<HTMLInputElement>(null);
  const imageInputRef     = useRef<HTMLInputElement>(null);
  const bottomRef         = useRef<HTMLDivElement>(null);
  const pollRef           = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef        = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sessionChanRef    = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerPausedRef    = useRef(false);
  const typingThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingHideRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Find or create session
  useEffect(() => {
    if (!request || !doctorId) { setLoading(false); return; }
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout>;

    const findOrCreateSession = async () => {
      const { data: existing } = await supabase
        .from("chat_sessions").select("*")
        .eq("consultation_id", request.id).maybeSingle();

      if (existing) {
        if (!existing.doctor_id) {
          await supabase.from("chat_sessions")
            .update({ doctor_id: doctorId }).eq("id", existing.id);
        }
        setSession(existing as ChatSession);
        subscribeMessages(existing.id); // subscribe FIRST
        await fetchMessages(existing.id); // then fetch
        setLoading(false);
        return;
      }

      if (retryCount < 5) {
        retryCount++;
        retryTimer = setTimeout(findOrCreateSession, 1000);
        return;
      }

      const { data: doc } = await supabase
        .from("doctors").select("full_name").eq("firebase_uid", doctorId).maybeSingle();

      const { data: newSession, error } = await supabase
        .from("chat_sessions").insert({
          consultation_id: request.id,
          patient_id:      request.patient_id,
          doctor_id:       doctorId,
          patient_name:    request.patient_name,
          doctor_name:     doc?.full_name ?? "Doctor",
          specialty:       request.specialty,
          status:          "active",
        }).select().single();

      if (!error && newSession) {
        setSession(newSession as ChatSession);
        subscribeMessages(newSession.id);
      }
      setLoading(false);
    };

    findOrCreateSession();
    return () => {
      clearTimeout(retryTimer);
      if (pollRef.current) clearInterval(pollRef.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [request, doctorId]);

  // IndexedDB-first fetch + delta
  const fetchMessages = async (sessionId: string) => {
    const cached = await getMessages(sessionId);
    if (cached.length > 0) setMessages(cached.filter((m) => !m.id.startsWith("temp_")));

    const lastTime = await getLastMessageTime(sessionId);
    const query = supabase.from("instant_chat_messages").select("*")
      .eq("session_id", sessionId).order("created_at", { ascending: true });

    const { data } = lastTime ? await query.gt("created_at", lastTime) : await query;

    if (data && data.length > 0) {
      await saveMessages(data);
      const all = await getMessages(sessionId);
      setMessages(all);
    }

    if (lastTime || (data && data.length > 0)) {
      await supabase.from("instant_chat_messages")
        .update({ is_read: true })
        .eq("session_id", sessionId)
        .eq("sender_role", "patient")
        .eq("is_read", false);
    }
  };

  // FIX: register ALL .on() handlers BEFORE calling .subscribe()
  const subscribeMessages = (sessionId: string) => {
    // Remove existing channel if any (prevents duplicate on remount)
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`instant_chat_${sessionId}_${Date.now()}`);
    channelRef.current = channel;

    channel
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "instant_chat_messages",
          filter: `session_id=eq.${sessionId}` },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;

          // ── time extended by user (paid or bonus) ──────────────────────────
          if (newMsg.type === "system" && newMsg.content?.startsWith("__time_extended__:") && newMsg.sender_role === "patient") {
            const secs = parseInt(newMsg.content.split(":")[1], 10);
            if (secs > 0) { setTimeRemaining((prev) => prev + secs); setShowTimerEnd(false); }
            return;
          }
          // ── patient initiated video call ───────────────────────────────────────────
          if (newMsg.type === "system" && newMsg.content?.startsWith("__video_call__:") && newMsg.sender_role === "patient") {
            const vcSessionId = newMsg.content.split(":")[1];
            setVideoCallSessionId(vcSessionId);
            setShowVideoConfirm(true);
            return;
          }
          // ── patient typing indicator ───────────────────────────────────────────────
          if (newMsg.type === "system" && newMsg.content === "__typing__" && newMsg.sender_role === "patient") {
            setPatientTyping(true);
            if (typingHideRef.current) clearTimeout(typingHideRef.current);
            typingHideRef.current = setTimeout(() => setPatientTyping(false), 3000);
            return;
          }
          await appendMessage(newMsg);
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            const tempIdx = prev.findIndex(
              (m) => m.id.startsWith("temp_") && m.content === newMsg.content
                && m.sender_id === newMsg.sender_id
            );
            if (tempIdx !== -1) {
              const next = [...prev]; next[tempIdx] = newMsg; return next;
            }
            return [...prev, newMsg];
          });
          if (newMsg.sender_role === "patient") {
            setPatientTyping(false); // hide typing when real message arrives
            await supabase.from("instant_chat_messages")
              .update({ is_read: true }).eq("id", newMsg.id);
          }
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "instant_chat_messages",
          filter: `session_id=eq.${sessionId}` },
        async (payload) => {
          const updated = payload.new as ChatMessage;
          await appendMessage(updated);
          setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
        })
      .subscribe(); // subscribe AFTER all .on() calls

    pollRef.current = setInterval(() => fetchMessages(sessionId), 5000);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Subscribe to session status changes
  const subscribeSession = (sessionId: string) => {
    if (sessionChanRef.current) supabase.removeChannel(sessionChanRef.current);
    const ch = supabase.channel(`session_status_${sessionId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const updated = payload.new as ChatSession;
          if (updated.status === "ended") {
            if (pollRef.current) clearInterval(pollRef.current);
            navigate("/dashboard");
          }
          // patient reopened the session
          if (updated.status === "active" && session?.status === "ended") {
            setReopenSession(updated);
            setShowReopenPopup(true);
          }
        })
      .subscribe();
    sessionChanRef.current = ch;
  };

  // Session timer — respects pause
  useEffect(() => {
    if (!session) return;
    subscribeSession(session.id);
    const timer = setInterval(() => {
      if (timerPausedRef.current) return;
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowTimerEnd(true); // show extend/end popup
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      clearInterval(timer);
      if (sessionChanRef.current) supabase.removeChannel(sessionChanRef.current);
    };
  }, [session]);

  // Keep ref in sync with state
  useEffect(() => { timerPausedRef.current = timerPaused; }, [timerPaused]);

  // Resume timer when returning from prescription screen
  useEffect(() => {
    if (timerPaused) {
      setTimerPaused(false);
      timerPausedRef.current = false;
    }
  }, [location.key]);

  // Throttled typing signal to patient
  const handleInputChange = (text: string) => {
    setMessage(text);
    if (!session || typingThrottleRef.current) return;
    supabase.from("instant_chat_messages").insert({
      session_id: session.id, sender_id: doctorId,
      sender_role: "doctor", type: "system", content: "__typing__", is_read: false,
    });
    typingThrottleRef.current = setTimeout(() => { typingThrottleRef.current = null; }, 2000);
  };

  // Doctor extends time — adds seconds and notifies user via system message
  const handleDoctorExtend = async (seconds: number) => {
    if (!session) return;
    setTimeRemaining((prev) => prev + seconds);
    setShowTimerEnd(false);
    await supabase.from("instant_chat_messages").insert({
      session_id:  session.id,
      sender_id:   doctorId,
      sender_role: "doctor",
      type:        "system",
      content:     `__time_extended__:${seconds}`,
      is_read:     false,
    });
  };

  // Send text (optimistic)
  const handleSend = async () => {
    if (!message.trim() || !session || sending) return;
    setSending(true);
    const content = message.trim();
    setMessage("");

    const tempId = `temp_${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId, session_id: session.id, sender_id: doctorId,
      sender_role: "doctor", type: "text", content,
      file_url: null, file_name: null, file_type: null,
      is_read: false, created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data, error } = await supabase.from("instant_chat_messages").insert({
      session_id: session.id, sender_id: doctorId,
      sender_role: "doctor", type: "text", content,
    }).select().single();

    if (!error && data) {
      await appendMessage(data);
      setMessages((prev) => prev.map((m) => m.id === tempId ? data as ChatMessage : m));
    }
    setSending(false);
  };

  // Upload file/image
  const handleFileUpload = async (file: File, type: "image" | "file") => {
    if (!session) return;
    setUploading(true);
    const ext  = file.name.split(".").pop();
    const path = `${session.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("instant-chat-files").upload(path, file);
    if (upErr) { setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("instant-chat-files").getPublicUrl(path);
    await supabase.from("instant_chat_messages").insert({
      session_id: session.id, sender_id: doctorId,
      sender_role: "doctor", type,
      content: null, file_url: urlData.publicUrl,
      file_name: file.name, file_type: file.type,
    });
    setUploading(false);
  };

  // End session — only called explicitly, NOT from Rx button
  const handleEndSession = async (reason?: string) => {
    if (!session) { navigate("/dashboard"); return; }
    if (pollRef.current) clearInterval(pollRef.current);
    await clearSession(session.id);
    const durationMins = Math.floor((SESSION_SECS - timeRemaining) / 60);
    await supabase.from("chat_sessions").update({
      status: "ended", ended_at: new Date().toISOString(), duration_minutes: durationMins,
    }).eq("id", session.id);
    await supabase.from("consultation_requests").update({
      status: "completed", updated_at: new Date().toISOString(),
    }).eq("id", request?.id);

    // Resolve fee: use request.fee if present, else fetch from admin_pricing
    let patientFee = Number(request?.fee ?? 0);
    if (!patientFee || patientFee <= 0) {
      const isVideo   = request?.call_type === "video";
      const isInstant = request?.consult_mode === "instant";
      const key = isVideo ? "available_video_price"
        : isInstant ? "instant_chat_price" : "available_chat_price";
      const { data: pricing } = await supabase
        .from("admin_pricing").select("value").eq("key", key).maybeSingle();
      patientFee = Number(pricing?.value ?? 0);
    }

    if (patientFee > 0) {
      const earned = Math.floor(patientFee * 0.71); // 71% to doctor, 29% platform
      const source = request?.call_type === "video" ? "video" : "chat";
      const { error: earnErr } = await supabase.from("doctor_earnings").insert({
        doctor_id:    doctorId,
        patient_name: session.patient_name ?? request?.patient_name ?? null,
        fee:          earned,
        source,
        earned_at:    new Date().toISOString(),
      });
      if (earnErr) console.error("[earnings insert error]", earnErr.message, earnErr.details);
      else console.log(`[earnings] inserted ₹${earned} (71% of ₹${patientFee})`);
    } else {
      console.warn("[earnings] patientFee is 0 — no earnings recorded");
    }

    navigate("/dashboard");
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const timerColor = timeRemaining <= 60 ? "text-destructive"
    : timeRemaining <= 180 ? "text-warning" : "text-primary";

  const patientName     = session?.patient_name ?? request?.patient_name ?? "Patient";
  const patientInitials = patientName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const quickReplies = [
    "Are you taking any medications?",
    "Any allergies I should know about?",
    "Have you traveled recently?",
    "Any family history of similar symptoms?",
  ];

  if (loading) {
    return (
      <MobileContainer>
        <div className="h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-2">
            <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Connecting to chat…</p>
          </div>
        </div>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      <div className="h-screen bg-background flex flex-col">

        {/* Header */}
        <header className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <button onClick={() => { setEndReason("Left chat"); setShowEndDialog(true); }}
                className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">{patientInitials}</span>
              </div>
              <div>
                <h1 className="font-semibold text-foreground">{patientName}</h1>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="capitalize">{request?.specialty}</span>
                  {request?.severity && (
                    <>
                      <span>·</span>
                      <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-semibold capitalize",
                        severityColor[request.severity] ?? "bg-muted text-muted-foreground")}>
                        {request.severity}
                      </span>
                    </>
                  )}
                  <span>·</span>
                  <span className="text-green-600 font-medium">● Live</span>
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-full hover:bg-muted">
                  <MoreVertical className="w-5 h-5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-card">
                <DropdownMenuItem onClick={() => setShowAISummary(true)}>
                  Patient Summary
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/prescription", { state: { session, request } })}>
                  Write Prescription
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-warning"
                  onClick={() => { setEndReason("Patient not responding"); setShowEndDialog(true); }}>
                  End — Patient not responding
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive"
                  onClick={() => { setEndReason("Emergency referral"); setShowEndDialog(true); }}>
                  End — Emergency referral
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Timer bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-t border-border">
            <div className="flex items-center gap-2">
              <Clock className={cn("w-4 h-4", timerColor)} />
              <span className={cn("text-sm font-medium", timerColor)}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAISummary(true)}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                <Brain className="w-3.5 h-3.5" /> Summary
              </button>
              {/* Video button */}
              <button
                onClick={() => { setVideoCallSessionId(null); setShowVideoConfirm(true); }}
                disabled={!session}
                className="p-1.5 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors disabled:opacity-40">
                <Video className="w-4 h-4 text-blue-600" />
              </button>
              {/* Rx button — pauses timer on both sides, navigates to prescription WITHOUT ending session */}
              <Button variant="outline" size="sm"
                onClick={async () => {
                  setTimerPaused(true);
                  timerPausedRef.current = true;
                  if (session) {
                    await supabase.from("instant_chat_messages").insert({
                      session_id:  session.id,
                      sender_id:   doctorId,
                      sender_role: "doctor",
                      type:        "system",
                      content:     "__timer_pause__",
                    });
                  }
                  navigate("/prescription", { state: { session, request } });
                }}>
                <FileText className="w-3.5 h-3.5 mr-1" /> Rx
              </Button>
              <Button variant="destructive" size="sm"
                onClick={() => { setEndReason("Consultation complete"); setShowEndDialog(true); }}>
                End
              </Button>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-light"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#D1D5DB #F9FAFB' }}>
          {messages.length === 0 && (
            <div className="flex justify-center py-8">
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                Chat started — say hello to {patientName}!
              </span>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isSent   = msg.sender_role === "doctor";
            const isTemp   = msg.id.startsWith("temp_");
            const isSystem = msg.type === "system";
            if (isSystem) {
              if (msg.content === "__prescription_updated__") {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <span className="text-[11px] text-green-700 bg-green-100 px-3 py-1 rounded-full flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Prescription Updated
                    </span>
                  </div>
                );
              }
              // hide all other system messages (__time_extended__, __timer_pause__, etc.)
              return null;
            }
            const time     = new Date(msg.created_at).toLocaleTimeString("en-IN",
              { hour: "2-digit", minute: "2-digit", hour12: true });
            const prevMsg  = messages[idx - 1];
            const showDate = !prevMsg ||
              new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-3">
                    <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {new Date(msg.created_at).toLocaleDateString("en-IN",
                        { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                )}

                <div className={cn("flex mb-1", isSent ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[78%] rounded-2xl px-3 py-2 shadow-sm",
                    isSent
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card text-foreground rounded-tl-sm border border-border",
                    isTemp && "opacity-70"
                  )}>
                    {msg.type === "image" && msg.file_url ? (
                      <img src={msg.file_url} alt="img"
                        className="rounded-xl max-w-full max-h-52 object-cover cursor-pointer"
                        onClick={() => setPreviewImg(msg.file_url!)} />
                    ) : msg.type === "file" && msg.file_url ? (
                      <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2">
                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                          isSent ? "bg-primary-foreground/20" : "bg-primary/10")}>
                          <FileText className={cn("w-5 h-5", isSent ? "text-primary-foreground" : "text-primary")} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate max-w-[160px]">
                            {msg.file_name ?? "Document"}
                          </p>
                          <p className={cn("text-[10px]",
                            isSent ? "text-primary-foreground/60" : "text-muted-foreground")}>
                            Tap to open
                          </p>
                        </div>
                      </a>
                    ) : msg.type === "prescription" ? (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 shrink-0" />
                        <p className="text-sm font-medium">Prescription sent ✓</p>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    )}

                    <div className={cn("flex items-center gap-1 mt-1",
                      isSent ? "justify-end" : "justify-start")}>
                      <span className={cn("text-[10px]",
                        isSent ? "text-primary-foreground/60" : "text-muted-foreground")}>
                        {time}
                      </span>
                      {isSent && !isTemp && (
                        msg.is_read
                          ? <CheckCheck className="w-3 h-3 text-blue-300" />
                          : <Check className="w-3 h-3 text-primary-foreground/60" />
                      )}
                      {isTemp && <Loader2 className="w-2.5 h-2.5 animate-spin text-primary-foreground/40" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Typing indicator — WhatsApp style, patient on the right (doctor's perspective) */}
        {patientTyping && (
          <div className="px-3 pb-1 bg-card">
            <div className="flex justify-end items-end gap-2">
              {/* Patient avatar */}
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 order-2">
                <span className="text-[10px] font-bold text-primary">{patientInitials}</span>
              </div>
              {/* Bubble */}
              <div className="bg-primary/10 px-4 py-3 rounded-2xl rounded-br-sm order-1">
                <div className="flex gap-1 items-center">
                  {[0, 200, 400].map((delay) => (
                    <span
                      key={delay}
                      className="w-2 h-2 rounded-full bg-primary animate-bounce"
                      style={{
                        animationDelay: `${delay}ms`,
                        animationDuration: "0.8s",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick replies */}
        <div className="px-3 py-2 bg-card border-t border-border">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickReplies.map((r) => (
              <button key={r} onClick={() => setMessage(r)}
                className="flex-shrink-0 px-3 py-1.5 bg-muted rounded-full text-xs text-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="px-3 py-3 bg-card border-t border-border">
          <div className="flex items-center gap-2">
            <button onClick={() => imageInputRef.current?.click()}
              className="p-2 rounded-full hover:bg-muted shrink-0" disabled={uploading}>
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "image"); e.target.value = ""; }} />

            <button onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full hover:bg-muted shrink-0" disabled={uploading}>
              <FileText className="w-5 h-5 text-muted-foreground" />
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "file"); e.target.value = ""; }} />

            <Input
              placeholder={uploading ? "Uploading…" : "Type a message…"}
              className="flex-1 h-11 rounded-full bg-muted border-0 focus-visible:ring-1"
              value={message}
              disabled={uploading}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <Button variant="medical" size="icon" className="h-11 w-11 rounded-full shrink-0"
              onClick={handleSend} disabled={!message.trim() || sending || uploading}>
              {sending || uploading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Patient Summary */}
        <Dialog open={showAISummary} onOpenChange={setShowAISummary}>
          <DialogContent className="max-w-[340px] rounded-2xl p-5">
            <DialogTitle>Patient Summary</DialogTitle>
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{patientInitials}</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{patientName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{request?.specialty}</p>
                </div>
                {request?.severity && (
                  <span className={cn("ml-auto px-2.5 py-1 rounded-full text-xs font-semibold capitalize",
                    severityColor[request.severity] ?? "bg-muted text-muted-foreground")}>
                    {request.severity}
                  </span>
                )}
              </div>
              {request?.duration && (
                <p className="text-xs text-muted-foreground">Duration: {request.duration}</p>
              )}
              {request?.description && (
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-foreground">{request.description}</p>
                </div>
              )}
              {request?.report_url && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Report</p>
                  <a href={request.report_url} target="_blank" rel="noopener noreferrer">
                    <img src={request.report_url} alt="Report"
                      className="w-full rounded-xl border border-border object-cover max-h-44"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <p className="text-xs text-primary mt-1">Tap to open full image</p>
                  </a>
                </div>
              )}
              {!request?.description && !request?.report_url && (
                <p className="text-sm text-muted-foreground italic text-center py-2">No summary provided</p>
              )}
            </div>
            <Button className="w-full mt-4" onClick={() => setShowAISummary(false)}>Close</Button>
          </DialogContent>
        </Dialog>

        {/* Image preview */}
        {previewImg && (
          <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setPreviewImg(null)}>
            <button className="absolute top-5 right-5 p-2 rounded-full bg-white/10">
              <X className="w-5 h-5 text-white" />
            </button>
            <img src={previewImg} alt="preview" className="max-w-full max-h-full rounded-xl" />
          </div>
        )}

        {/* Timer end popup — doctor can extend or end */}
        <AlertDialog open={showTimerEnd} onOpenChange={setShowTimerEnd}>
          <AlertDialogContent className="max-w-[340px] rounded-2xl p-5 mx-4">
            <AlertDialogHeader className="text-center">
              <div className="w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-7 h-7 text-warning" />
              </div>
              <AlertDialogTitle>Session Time's Up</AlertDialogTitle>
              <AlertDialogDescription>
                The consultation time has ended. Extend the session or end the chat.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-2 mt-4">
              {[{ label: "+ 5 minutes", secs: 300 }, { label: "+ 10 minutes", secs: 600 }].map((opt) => (
                <Button key={opt.secs} variant="outline" className="w-full h-11 rounded-xl"
                  onClick={() => handleDoctorExtend(opt.secs)}>
                  Extend {opt.label}
                </Button>
              ))}
              <Button variant="destructive" className="w-full h-11 rounded-xl mt-1"
                onClick={() => { setShowTimerEnd(false); handleEndSession("Session time expired"); }}>
                End Consultation
              </Button>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* End session dialog */}
        <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
          <AlertDialogContent className="max-w-[340px] rounded-2xl p-5 mx-4">
            <AlertDialogHeader className="text-center">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-7 h-7 text-destructive" />
              </div>
              <AlertDialogTitle>End Consultation?</AlertDialogTitle>
              <AlertDialogDescription>
                This will end the chat session with {patientName}.
                {endReason && (
                  <span className="block mt-2 px-3 py-1 bg-muted rounded-full text-xs font-medium text-foreground">
                    {endReason}
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-2 mt-4">
              <Button variant="destructive" className="w-full h-12 rounded-xl"
                onClick={() => handleEndSession(endReason)}>
                Yes, End Chat
              </Button>
              <Button variant="outline" className="w-full h-12 rounded-xl"
                onClick={() => setShowEndDialog(false)}>
                Continue Chat
              </Button>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Video call confirmation */}
        <AlertDialog open={showVideoConfirm} onOpenChange={setShowVideoConfirm}>
          <AlertDialogContent className="max-w-[340px] rounded-2xl p-5 mx-4">
            <AlertDialogHeader className="text-center">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <Video className="w-7 h-7 text-blue-600" />
              </div>
              <AlertDialogTitle>
                {videoCallSessionId ? "Patient Requesting Video Call" : "Start Video Call?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {videoCallSessionId
                  ? `${patientName} is requesting a video consultation.`
                  : `This will open a video call with ${patientName}. Both of you need to allow camera and microphone access.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-2 mt-4">
              <Button
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  // Prefer videoCallSessionId (patient-initiated), then live session.id
                  // Never pass undefined — guard explicitly
                  const targetSessionId = videoCallSessionId ?? session?.id ?? null;
                  if (!targetSessionId) return; // session not ready yet
                  const isPatientInitiated = !!videoCallSessionId;
                  setShowVideoConfirm(false);
                  setVideoCallSessionId(null);
                  if (!isPatientInitiated && session) {
                    supabase.from("instant_chat_messages").insert({
                      session_id:  session.id,
                      sender_id:   doctorId,
                      sender_role: "doctor",
                      type:        "system",
                      content:     `__video_call__:${session.id}`,
                      is_read:     false,
                    });
                  }
                  navigate("/video-call", {
                    state: {
                      request,
                      sessionId:  targetSessionId,
                      doctorName: session?.doctor_name ?? localStorage.getItem("doctor_name") ?? "Doctor",
                      returnPath: "/consultation",
                    },
                  });
                }}
              >
                <Video className="w-4 h-4 mr-2" />
                {videoCallSessionId ? "Join Video Call" : "Start Video Call"}
              </Button>
              <Button variant="outline" className="w-full h-11 rounded-xl"
                onClick={() => { setShowVideoConfirm(false); setVideoCallSessionId(null); }}>
                {videoCallSessionId ? "Decline" : "Cancel"}
              </Button>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Session reopen popup */}
        <AlertDialog open={showReopenPopup} onOpenChange={setShowReopenPopup}>
          <AlertDialogContent className="max-w-[340px] rounded-2xl p-5 mx-4">
            <AlertDialogHeader className="text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Brain className="w-7 h-7 text-primary" />
              </div>
              <AlertDialogTitle>Patient Wants to Continue</AlertDialogTitle>
              <AlertDialogDescription>
                {patientName} has reopened the consultation. Would you like to continue the chat?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-2 mt-4">
              <Button variant="default" className="w-full h-11 rounded-xl"
                onClick={() => {
                  if (reopenSession) {
                    setSession(reopenSession);
                    setShowReopenPopup(false);
                    subscribeMessages(reopenSession.id);
                    fetchMessages(reopenSession.id);
                  }
                }}>
                Accept &amp; Continue
              </Button>
              <Button variant="outline" className="w-full h-11 rounded-xl"
                onClick={() => setShowReopenPopup(false)}>
                Decline
              </Button>
            </div>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </MobileContainer>
  );
}
