import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { getDoctorByFirebaseUid } from "@/lib/supabase";
import { onAuthStateChanged } from "firebase/auth";

export interface Doctor {
  id: string;
  firebase_uid: string;
  full_name: string;
  email: string;
  city: string;
  state: string;
  gender: string;
  specialization: string;
  experience_years: number;
  practice_type: string;
  hospital_name: string;
  clinic_address: string;
  clinic_license: string;
  languages: string[];
  service_chat: boolean;
  service_opd: boolean;
  consult_duration: number;
  account_holder: string;
  account_number: string;
  ifsc_code: string;
  status: string;
  created_at: string;
}

const CACHE_KEY = "doctor_profile";
const UID_KEY = "doctor_uid";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function readCache(): Doctor | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data as Doctor;
  } catch {
    return null;
  }
}

function writeCache(doctor: Doctor) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: doctor, ts: Date.now() }));
  } catch {}
}

export function clearDoctorCache() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(UID_KEY);
}

async function fetchAndCache(uid: string): Promise<Doctor | null> {
  const { data, error } = await getDoctorByFirebaseUid(uid);
  if (error || !data) return null;
  const doctor = data as Doctor;
  writeCache(doctor);
  localStorage.setItem(UID_KEY, uid);
  return doctor;
}

export function useDoctor() {
  // Option 1: seed state from cache immediately — zero loading time on return visits
  const [doctor, setDoctor] = useState<Doctor | null>(() => readCache());
  // If we have cached data, don't show spinner at all
  const [loading, setLoading] = useState(() => readCache() === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Option 2: if UID is already in localStorage, start Supabase fetch immediately
    // without waiting for Firebase onAuthStateChanged (~500ms saved)
    const cachedUid = localStorage.getItem(UID_KEY);
    const cachedDoctor = readCache();

    if (cachedUid && !cachedDoctor) {
      // Cache expired but UID known — fetch in background, show loading
      fetchAndCache(cachedUid)
        .then((d) => { if (d) setDoctor(d); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }

    // Always subscribe to Firebase auth to stay in sync
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setDoctor(null);
        setLoading(false);
        clearDoctorCache();
        return;
      }

      // If we already have fresh cached data for this user, skip the fetch
      const cached = readCache();
      if (cached && cached.firebase_uid === user.uid) {
        setDoctor(cached);
        setLoading(false);
        // Refresh cache silently in background — user sees data instantly
        fetchAndCache(user.uid).then((d) => { if (d) setDoctor(d); }).catch(() => {});
        return;
      }

      // No cache — fetch and show
      try {
        const d = await fetchAndCache(user.uid);
        if (!d) throw new Error("Doctor not found");
        setDoctor(d);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return { doctor, loading, error };
}
