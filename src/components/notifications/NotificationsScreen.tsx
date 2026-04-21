import { useEffect, useState } from "react";
import { Bell, AlertCircle, ChevronLeft, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { BottomNav } from "@/components/navigation/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  sent_by: string;
  created_at: string;
  is_read?: boolean;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function NotifPopup({ notif, onClose }: { notif: AdminNotification; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center px-4" onClick={onClose}>
        <div
          className="bg-card rounded-2xl z-50 shadow-2xl w-full max-w-[360px] max-h-[70vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{notif.title}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(notif.created_at)}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-dark"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#4B5563 #1F2937' }}>
            <p className="text-sm text-foreground leading-relaxed">{notif.message}</p>
            <p className="text-xs text-muted-foreground mt-4">Sent by: {notif.sent_by}</p>
          </div>
        </div>
      </div>
    </>
  );
}

export const NotificationsScreen = () => {
  const navigate = useNavigate();
  const uid = localStorage.getItem("doctor_uid") ?? "";

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [readIds, setReadIds]             = useState<Set<string>>(new Set());
  const [loading, setLoading]             = useState(true);
  const [selected, setSelected]           = useState<AdminNotification | null>(null);

  // ── fetch from admin_notifications ────────────────────────────────────────
  useEffect(() => {
    if (!uid) { setLoading(false); return; }

    supabase
      .from("admin_notifications")
      .select("id, title, message, type, sent_by, created_at")
      .or(`target_id.eq.${uid},target_type.eq.all`)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setNotifications((data as AdminNotification[]) ?? []);
        setLoading(false);
      });

    // load read ids from localStorage
    const stored = localStorage.getItem(`notif_read_${uid}`);
    if (stored) setReadIds(new Set(JSON.parse(stored)));

    // realtime
    const channel = supabase.channel("admin_notif_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_notifications" },
        (payload) => {
          const n = payload.new as AdminNotification;
          const isForMe = n.target_id === uid || (payload.new as any).target_type === "all";
          if (isForMe) setNotifications((prev) => [n, ...prev]);
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [uid]);

  const markRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev).add(id);
      localStorage.setItem(`notif_read_${uid}`, JSON.stringify([...next]));
      return next;
    });
  };

  const markAllRead = () => {
    const all = new Set(notifications.map((n) => n.id));
    setReadIds(all);
    localStorage.setItem(`notif_read_${uid}`, JSON.stringify([...all]));
  };

  const handleOpen = (n: AdminNotification) => {
    setSelected(n);
    markRead(n.id);
  };

  const unread = notifications.filter((n) => !readIds.has(n.id)).length;

  return (
    <MobileContainer>
      <div className="h-screen bg-background flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-primary text-primary-foreground px-4 pt-12 pb-5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-1">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl font-semibold">Notifications</h1>
                <p className="text-white/70 text-sm">
                  {loading ? "Loading…" : unread > 0 ? `${unread} unread` : "All caught up"}
                </p>
              </div>
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-sm text-white/80 hover:text-white font-medium">
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="scrollable-content flex-1 min-h-0 px-4 py-4 space-y-3 pb-24 scrollbar-dark"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#4B5563 #1F2937' }}>
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Bell className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs mt-1">Admin notifications will appear here</p>
            </div>
          ) : (
            notifications.map((n) => {
              const isUnread = !readIds.has(n.id);
              return (
                <Card key={n.id}
                  className={cn("overflow-hidden cursor-pointer transition-all",
                    isUnread ? "border-primary/30 bg-primary/5 shadow-sm" : "border-border bg-card"
                  )}
                  onClick={() => handleOpen(n)}>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("font-medium text-sm", isUnread ? "text-foreground" : "text-muted-foreground")}>
                            {n.title}
                          </p>
                          {isUnread && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <BottomNav />
      </div>

      {selected && <NotifPopup notif={selected} onClose={() => setSelected(null)} />}
    </MobileContainer>
  );
};
