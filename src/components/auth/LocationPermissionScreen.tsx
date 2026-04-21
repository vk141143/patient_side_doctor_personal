import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MapPin, Navigation, Stethoscope, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { supabase } from "@/lib/supabase";

interface LocationState {
  firebase_uid: string;
  email: string;
  doctor_name: string;
}

export const LocationPermissionScreen = () => {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: LocationState };
  const [loading, setLoading] = useState(false);

  const logLogin = async (latitude: number | null, longitude: number | null, location_name: string | null) => {
    const { error } = await supabase.from("login_logs").insert({
      email: state?.email ?? null,
      firebase_uid: state?.firebase_uid ?? null,
      latitude,
      longitude,
      location_name,
      device_info: navigator.userAgent,
      status: "success",
    });
    if (error) console.error("[login_logs] insert error:", error.message, error.details, error.hint);
  };

  const handleAllow = async () => {
    setLoading(true);
    let latitude: number | null = null;
    let longitude: number | null = null;
    let location_name: string | null = null;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          { headers: { "Accept-Language": "en" } }
        );
        const geo = await res.json();
        const a = geo.address ?? {};
        const city = a.city ?? a.town ?? a.village ?? a.county ?? null;
        const state_name = a.state ?? null;
        location_name = [city, state_name].filter(Boolean).join(", ") || null;
      } catch { /* ignore geocode errors */ }
    } catch (err) {
      console.warn("[location] permission denied or error:", err);
    }

    await logLogin(latitude, longitude, location_name);
    setLoading(false);
    navigate("/dashboard");
  };

  const handleSkip = async () => {
    await logLogin(null, null, null);
    navigate("/dashboard");
  };

  return (
    <MobileContainer>
      <div className="h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col items-center justify-center px-6">

        {/* Icon */}
        <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center shadow-lg mb-6">
          <MapPin className="w-10 h-10 text-primary-foreground" />
        </div>

        <h1 className="text-2xl font-bold text-foreground text-center mb-2">
          Allow Location Access
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-8 leading-relaxed">
          MediConnect uses your location to connect you with nearby patients and provide better healthcare services in your area.
        </p>

        {/* Benefits */}
        <div className="w-full bg-card border border-border rounded-2xl p-5 space-y-4 mb-8">
          {[
            { icon: Navigation, text: "Find patients near you" },
            { icon: Stethoscope, text: "Faster home visit matching" },
            { icon: Users, text: "Connect with local clinics" },
            { icon: BarChart3, text: "Region-specific health insights" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{text}</span>
            </div>
          ))}
        </div>

        <Button
          onClick={handleAllow}
          disabled={loading}
          className="w-full h-12 font-semibold mb-3"
        >
          {loading ? "Getting location…" : "Allow Location Access"}
        </Button>

        <button
          onClick={handleSkip}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Skip for now
        </button>
      </div>
    </MobileContainer>
  );
};
