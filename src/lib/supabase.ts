import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://rbiskypizusqrlrkfzpc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiaXNreXBpenVzcXJscmtmenBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjAxNzMsImV4cCI6MjA5MTkzNjE3M30.VsY0hVK1TOjwd9XLmvm-3okXSKU4SkuGqA8A7f8DSWw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Doctors ──────────────────────────────────────────────────────────────────
export const getDoctors = () => supabase.from("doctors").select("*");

export const getDoctorByFirebaseUid = (uid: string) =>
  supabase.from("doctors").select("*").eq("firebase_uid", uid).single();

export const createDoctor = (data: Record<string, unknown>) =>
  supabase.from("doctors").insert(data).select().single();

export const updateDoctor = (id: string, data: Record<string, unknown>) =>
  supabase.from("doctors").update(data).eq("id", id).select().single();

// ── File uploads ──────────────────────────────────────────────────────────────
export const uploadFile = async (
  bucket: "doctor-documents" | "doctor-images",
  path: string,
  file: File
) => {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
};

// ── Feedback ──────────────────────────────────────────────────────────────────
export const submitFeedback = (data: Record<string, unknown>) =>
  supabase.from("doctor_feedback").insert(data);

// ── Login logs ────────────────────────────────────────────────────────────────
export const logLoginLog = (data: Record<string, unknown>) =>
  supabase.from("login_logs").insert(data);

export const updateDoctorOnlineStatus = async (firebase_uid: string, is_online: boolean) => {
  const { error } = await supabase
    .from("login_logs")
    .update({
      is_online,
      online_changed_at: new Date().toISOString(),
      status: is_online ? "went_online" : "went_offline",
    })
    .eq("firebase_uid", firebase_uid)
    .order("login_at", { ascending: false })
    .limit(1);
  if (error) console.error("[login_logs] online status error:", error.message, error.details, error.hint);

  // also persist on doctors table
  const { error: de } = await supabase
    .from("doctors")
    .update({ is_online })
    .eq("firebase_uid", firebase_uid);
  if (de) console.error("[doctors] online status error:", de.message);
};

export const updateDoctorAvailability = async (
  firebase_uid: string,
  chat_enabled: boolean,
  opd_enabled: boolean
) => {
  // update login_logs latest row
  const { error: le } = await supabase
    .from("login_logs")
    .update({ chat_enabled, opd_enabled })
    .eq("firebase_uid", firebase_uid)
    .order("login_at", { ascending: false })
    .limit(1);
  if (le) console.error("[login_logs] availability error:", le.message, le.hint);

  // persist on doctors table
  const { error: de } = await supabase
    .from("doctors")
    .update({ chat_enabled, opd_enabled })
    .eq("firebase_uid", firebase_uid);
  if (de) console.error("[doctors] availability error:", de.message);
};

// ── Notifications ─────────────────────────────────────────────────────────
export const getNotifications = (uid: string) =>
  supabase
    .from("notifications")
    .select("*")
    .or(`firebase_uid.is.null,firebase_uid.eq.${uid}`)
    .order("created_at", { ascending: false });

export const markNotificationRead = (id: string) =>
  supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id);

export const markAllNotificationsRead = (uid: string) =>
  supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .or(`firebase_uid.is.null,firebase_uid.eq.${uid}`)
    .eq("is_read", false);
