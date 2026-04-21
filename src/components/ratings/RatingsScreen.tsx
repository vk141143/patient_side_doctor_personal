import { useState, useEffect } from "react";
import { ArrowLeft, Star, Building2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { BottomNav } from "@/components/navigation/BottomNav";
import { supabase } from "@/lib/supabase";

interface Rating {
  id: string;
  patient_name: string | null;
  rating: number;
  review: string | null;
  created_at: string;
}

export function RatingsScreen() {
  const navigate = useNavigate();
  const uid = localStorage.getItem("doctor_uid") ?? "";

  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    supabase
      .from("doctor_ratings")
      .select("id, patient_name, rating, review, created_at")
      .eq("doctor_id", uid)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRatings((data as Rating[]) ?? []);
        setLoading(false);
      });
  }, [uid]);

  // ── derived stats ──────────────────────────────────────────────────────────
  const total = ratings.length;
  const average = total
    ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10
    : 0;

  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = ratings.filter((r) => r.rating === star).length;
    return { star, count, pct: total ? Math.round((count / total) * 100) : 0 };
  });

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86400000);
    if (d === 0) return "Today";
    if (d === 1) return "Yesterday";
    if (d < 7) return `${d} days ago`;
    if (d < 30) return `${Math.floor(d / 7)} week${Math.floor(d / 7) > 1 ? "s" : ""} ago`;
    return `${Math.floor(d / 30)} month${Math.floor(d / 30) > 1 ? "s" : ""} ago`;
  };

  return (
    <MobileContainer>
      <div className="h-screen bg-background flex flex-col">

        {/* Header */}
        <header className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="flex items-center gap-3 p-4">
            <button onClick={() => navigate("/profile")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-semibold text-foreground">Ratings & Reviews</h1>
              <p className="text-xs text-muted-foreground">{total} review{total !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-20">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="p-4 space-y-4">

              {/* Overall rating card */}
              <div className="medical-card">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-muted-foreground">Hospital OPD Ratings</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-foreground">{total ? average.toFixed(1) : "—"}</p>
                    <div className="flex items-center gap-0.5 mt-1 justify-center">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-4 h-4 ${s <= Math.round(average) ? "text-yellow-500 fill-yellow-500" : "text-muted"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{total} review{total !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {distribution.map(({ star, count, pct }) => (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-xs w-3">{star}</span>
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-6 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reviews list */}
              {total === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Star className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No reviews yet</p>
                  <p className="text-xs mt-1">Reviews from OPD patients will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ratings.map((r) => (
                    <div key={r.id} className="medical-card">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {(r.patient_name ?? "P").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{r.patient_name ?? "Patient"}</p>
                            <div className="flex items-center gap-0.5 mt-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={`w-3 h-3 ${s <= r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted"}`} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(r.created_at)}</span>
                      </div>
                      {r.review && (
                        <p className="text-sm text-muted-foreground mt-3">{r.review}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </MobileContainer>
  );
}
