import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MeetingProvider, useMeeting, useParticipant } from "@videosdk.live/react-sdk";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { Button } from "@/components/ui/button";
import { Loader2, VideoOff, PhoneOff, MicOff, Mic, VideoIcon, RefreshCw } from "lucide-react";
import type { ConsultationRequest } from "./ConsultationRequestPopup";
import { supabase } from "@/lib/supabase";

// ── Participant tile ──────────────────────────────────────────────────────────
function ParticipantTile({ participantId, isLocal }: { participantId: string; isLocal: boolean }) {
  const { webcamStream, micStream, webcamOn, micOn, displayName } = useParticipant(participantId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fix: depend on webcamStream AND webcamOn so it re-runs when stream arrives async
  useEffect(() => {
    if (videoRef.current && webcamOn && webcamStream?.track) {
      const ms = new MediaStream([webcamStream.track]);
      videoRef.current.srcObject = ms;
      videoRef.current.play().catch(() => {});
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [webcamStream, webcamOn]);

  useEffect(() => {
    if (audioRef.current && !isLocal && micOn && micStream?.track) {
      const ms = new MediaStream([micStream.track]);
      audioRef.current.srcObject = ms;
      audioRef.current.play().catch(() => {});
    } else if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
  }, [micStream, micOn, isLocal]);

  return (
    <div className="relative w-full h-full bg-gray-800 rounded-xl overflow-hidden">
      {webcamOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center">
            <span className="text-white text-xl font-bold">
              {displayName?.[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
        </div>
      )}
      {!isLocal && <audio ref={audioRef} autoPlay />}
      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-full">
        {!micOn && <MicOff className="w-3 h-3 text-red-400" />}
        <span className="text-white text-xs">{isLocal ? "You" : displayName}</span>
      </div>
    </div>
  );
}

// ── Meeting view ──────────────────────────────────────────────────────────────
function MeetingView({ onEnd }: { onEnd: () => void }) {
  const { join, leave, toggleMic, toggleWebcam, changeWebcam, participants, localParticipant } =
    useMeeting({ onMeetingLeft: onEnd });

  const [micOn, setMicOn]       = useState(true);
  const [webcamOn, setWebcamOn] = useState(true);
  const [flipping, setFlipping] = useState(false);
  const currentDeviceIdRef      = useRef<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => join(), 800);
    return () => clearTimeout(t);
  }, []);

  const localId   = localParticipant?.id ?? "";
  const remoteIds = [...participants.keys()].filter((id) => id !== localId);

  const handleToggleMic = () => { toggleMic(); setMicOn((p) => !p); };
  const handleToggleCam = () => { toggleWebcam(); setWebcamOn((p) => !p); };

  const handleFlipCamera = async () => {
    if (flipping) return;
    setFlipping(true);
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === "videoinput");
      if (cameras.length < 2) { setFlipping(false); return; }
      const current = currentDeviceIdRef.current;
      const next = cameras.find((c) => c.deviceId !== current) ?? cameras[0];
      currentDeviceIdRef.current = next.deviceId;
      await changeWebcam(next.deviceId);
    } catch (e) {
      console.error("[VideoCall] flip camera error:", e);
    }
    setFlipping(false);
  };

  return (
    <div className="flex-1 flex flex-col gap-2 p-3 min-h-0">
      {/* Remote participant — full area */}
      <div className="flex-1 relative min-h-0">
        {remoteIds.length === 0 ? (
          <div className="w-full h-full bg-gray-800 rounded-xl flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <p className="text-gray-400 text-sm">Waiting for patient to join…</p>
          </div>
        ) : (
          <ParticipantTile participantId={remoteIds[0]} isLocal={false} />
        )}

        {/* Local PiP — bottom right */}
        {localId && (
          <div className="absolute bottom-3 right-3 w-24 h-32 rounded-lg overflow-hidden shadow-lg border border-gray-600">
            <ParticipantTile participantId={localId} isLocal={true} />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="shrink-0 flex items-center justify-center gap-4 py-2">
        <button
            onClick={handleFlipCamera}
            disabled={flipping}
            className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-white ${flipping ? "animate-spin" : ""}`} />
          </button>

          <button
          onClick={handleToggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            micOn ? "bg-gray-700 hover:bg-gray-600" : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {micOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
        </button>

        <button
          onClick={() => { leave(); onEnd(); }}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 flex items-center justify-center shadow-xl transition-all"
        >
          <PhoneOff className="w-7 h-7 text-white" />
        </button>

        <button
          onClick={handleToggleCam}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            webcamOn ? "bg-gray-700 hover:bg-gray-600" : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {webcamOn ? <VideoIcon className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-white" />}
        </button>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function VideoCallScreen() {
  const navigate          = useNavigate();
  const location          = useLocation();
  const request           = location.state?.request as ConsultationRequest | undefined;
  const sessionId         = location.state?.sessionId as string | undefined;
  const sessionDoctorName = location.state?.doctorName as string | undefined;
  const returnPath        = location.state?.returnPath as string ?? "/consultation";

  const [roomId, setRoomId]   = useState<string | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const doctorName = localStorage.getItem("doctor_name") || sessionDoctorName || "Doctor";

  useEffect(() => {
    const sid = sessionId ?? request?.id;
    if (!sid) {
      setError("No session ID — cannot start call.");
      setLoading(false);
      return;
    }

    supabase.functions.invoke("create-video-room", { body: { session_id: sid } })
      .then(({ data, error: fnErr }) => {
        if (fnErr || !data?.roomId || !data?.token) {
          throw new Error(fnErr?.message ?? data?.error ?? "Failed to get room");
        }
        setRoomId(data.roomId);
        setToken(data.token);
        setLoading(false);
      })
      .catch((e: Error) => {
        console.error("[VideoCall] error:", e.message);
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const handleEndCall = () => {
    navigate(returnPath, { state: { request, sessionId }, replace: true });
  };

  if (loading) {
    return (
      <MobileContainer>
        <div className="h-screen flex flex-col items-center justify-center bg-gray-900 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-white" />
          <p className="text-white text-sm font-medium">Setting up video room…</p>
          <p className="text-gray-500 text-xs">This takes a few seconds</p>
        </div>
      </MobileContainer>
    );
  }

  if (error) {
    return (
      <MobileContainer>
        <div className="h-screen flex flex-col items-center justify-center bg-gray-900 gap-4 px-6 text-center">
          <VideoOff className="w-12 h-12 text-red-400" />
          <p className="text-white font-semibold text-lg">Video Call Failed</p>
          <p className="text-gray-400 text-xs font-mono bg-gray-800 px-3 py-2 rounded-lg max-w-full break-all">
            {error}
          </p>
          <Button variant="outline" onClick={handleEndCall}
            className="mt-2 border-gray-600 text-white hover:bg-gray-800">
            Go Back to Chat
          </Button>
        </div>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      <div className="h-screen bg-gray-900 flex flex-col">
        <MeetingProvider
          config={{ meetingId: roomId!, micEnabled: true, webcamEnabled: true, name: doctorName }}
          token={token!}
        >
          <MeetingView onEnd={handleEndCall} />
        </MeetingProvider>
      </div>
    </MobileContainer>
  );
}
