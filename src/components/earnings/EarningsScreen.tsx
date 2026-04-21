import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Building2, MessageSquare, Loader2, CalendarDays, Wallet, History, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/navigation/BottomNav";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Period     = "today" | "week" | "month";
type SourceTab  = "opd" | "chat";
type View       = "earnings" | "history";

interface Earning {
  id: string;
  patient_name: string | null;
  fee: number;
  source: string;
  earned_at: string;
}

interface WithdrawRequest {
  id: string;
  opd_amount: number;
  chat_amount: number;
  total_amount: number;
  status: string;
  period_from: string | null;
  period_to: string | null;
  requested_at: string;
}

const periodLabel: Record<Period, string> = { today: "Today", week: "This Week", month: "This Month" };

const statusStyle: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

export function EarningsScreen() {
  const navigate = useNavigate();
  const uid = localStorage.getItem("doctor_uid") ?? "";

  const [view, setView]           = useState<View>("earnings");
  const [period, setPeriod]       = useState<Period>("today");
  const [sourceTab, setSourceTab] = useState<SourceTab>("opd");
  const [allEarnings, setAllEarnings]       = useState<Earning[]>([]);
  const [withdrawHistory, setWithdrawHistory] = useState<WithdrawRequest[]>([]);
  const [loading, setLoading]         = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawing, setWithdrawing]   = useState(false);
  const [chatEarningRate, setChatEarningRate]   = useState<number | null>(null);
  const [videoEarningRate, setVideoEarningRate] = useState<number | null>(null);
  const periodRef = useRef<Period>("today");

  // ── Realtime pricing from admin_pricing ────────────────────────────────────
  useEffect(() => {
    const loadPrices = async () => {
      const { data } = await supabase.from("admin_pricing").select("key, value");
      (data ?? []).forEach((row: { key: string; value: number }) => {
        if (row.key === "available_chat_price")  setChatEarningRate(row.value);
        if (row.key === "available_video_price") setVideoEarningRate(row.value);
      });
    };
    loadPrices();
    const channel = supabase.channel("pricing_doctor_earnings")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_pricing" },
        (payload) => {
          const row = payload.new as { key: string; value: number };
          if (row.key === "available_chat_price")  setChatEarningRate(row.value);
          if (row.key === "available_video_price") setVideoEarningRate(row.value);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── fetch earnings ─────────────────────────────────────────────────────────
  const fetchEarnings = (p: Period) => {
    if (!uid) return;
    setLoading(true);
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let fromDate: Date;
    if (p === "today") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (p === "week") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    } else {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }
    supabase
      .from("doctor_earnings")
      .select("id, patient_name, fee, source, earned_at")
      .eq("doctor_id", uid)
      .gte("earned_at", fromDate.toISOString())
      .lte("earned_at", todayEnd.toISOString())
      .order("earned_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("[earnings fetch error]", error);
        setAllEarnings((data as Earning[]) ?? []);
        setLoading(false);
      });
  };

  useEffect(() => {
    periodRef.current = period;
    fetchEarnings(period);
  }, [uid, period]);

  // ── realtime earnings subscription ────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const channel = supabase.channel(`earnings_realtime_${uid}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "doctor_earnings", filter: `doctor_id=eq.${uid}` },
        () => { fetchEarnings(periodRef.current); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [uid]);

  // ── fetch withdraw history ─────────────────────────────────────────────────
  const fetchHistory = () => {
    if (!uid) return;
    setHistoryLoading(true);
    supabase
      .from("doctor_withdraw_requests")
      .select("id, opd_amount, chat_amount, total_amount, status, period_from, period_to, requested_at")
      .eq("doctor_id", uid)
      .order("requested_at", { ascending: false })
      .then(({ data }) => { setWithdrawHistory((data as WithdrawRequest[]) ?? []); setHistoryLoading(false); });
  };

  // ── derived ────────────────────────────────────────────────────────────────
  const opdEarnings  = allEarnings.filter((e) => e.source === "opd");
  const chatEarnings = allEarnings.filter((e) => e.source === "chat");
  const opdTotal     = opdEarnings.reduce((s, e) => s + e.fee, 0);
  const chatTotal    = chatEarnings.reduce((s, e) => s + e.fee, 0);
  const grandTotal   = opdTotal + chatTotal;
  const filtered     = sourceTab === "opd" ? opdEarnings : chatEarnings;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    if (d.toDateString() === new Date().toDateString()) return `Today · ${time}`;
    if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) return `Yesterday · ${time}`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + ` · ${time}`;
  };

  const fmtDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      + " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  // ── withdraw ───────────────────────────────────────────────────────────────
  const handleWithdraw = async () => {
    if (grandTotal === 0) { toast.error("No earnings to withdraw."); return; }
    setWithdrawing(true);
    const now = new Date();
    let periodFrom: string;
    if (period === "today") {
      periodFrom = now.toISOString().split("T")[0];
    } else if (period === "week") {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      periodFrom = d.toISOString().split("T")[0];
    } else {
      periodFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    }
    const periodTo = now.toISOString().split("T")[0];
    const { data: doc } = await supabase.from("doctors").select("full_name").eq("firebase_uid", uid).single();
    const { error } = await supabase.from("doctor_withdraw_requests").insert({
      doctor_id: uid, doctor_name: doc?.full_name ?? "Doctor",
      opd_amount: opdTotal, chat_amount: chatTotal, total_amount: grandTotal,
      status: "pending", period_from: periodFrom, period_to: periodTo,
    });
    setWithdrawing(false);
    setShowWithdraw(false);
    if (error) toast.error("Failed to send request.");
    else { toast.success("Withdrawal request sent to admin!"); fetchHistory(); }
  };

  // ── header back action ─────────────────────────────────────────────────────
  const handleBack = () => view === "history" ? setView("earnings") : navigate("/dashboard");

  return (
    <MobileContainer>
      <div className="min-h-screen bg-background flex flex-col">

        {/* Header */}
        <header className="sticky top-0 z-10 bg-card border-b border-border shrink-0">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <button onClick={handleBack} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="font-semibold text-foreground">
                {view === "history" ? "Payment History" : "Earnings"}
              </h1>
            </div>
            {view === "earnings" && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                  onClick={() => { setView("history"); fetchHistory(); }}>
                  <History className="w-3.5 h-3.5" /> History
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                  onClick={() => setShowWithdraw(true)}>
                  <Wallet className="w-3.5 h-3.5" /> Withdraw
                </Button>
              </div>
            )}
          </div>
        </header>

        {/* ── PAYMENT HISTORY VIEW ── */}
        {view === "history" ? (
          <main className="flex-1 overflow-y-auto pb-20 p-4 space-y-3 scrollbar-dark"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#4B5563 #1F2937' }}>
            {historyLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : withdrawHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Wallet className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No withdrawal requests yet</p>
              </div>
            ) : (
              withdrawHistory.map((w) => (
                <div key={w.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                  {/* Date + status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{fmtDateTime(w.requested_at)}</span>
                    </div>
                    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize",
                      statusStyle[w.status] ?? "bg-muted text-muted-foreground border-border")}>
                      {w.status}
                    </span>
                  </div>
                  {/* Period */}
                  {w.period_from && (
                    <p className="text-xs text-muted-foreground">
                      Period: {new Date(w.period_from).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {w.period_to && w.period_to !== w.period_from
                        ? ` – ${new Date(w.period_to).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                        : `, ${new Date(w.period_from).getFullYear()}`}
                    </p>
                  )}
                  {/* Breakdown */}
                  <div className="bg-muted rounded-lg px-3 py-2 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> OPD
                      </span>
                      <span className="font-medium">₹{w.opd_amount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Chat
                      </span>
                      <span className="font-medium">₹{w.chat_amount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="border-t border-border pt-1.5 flex justify-between text-sm font-bold">
                      <span>Total</span>
                      <span className="text-primary">₹{w.total_amount.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </main>

        ) : (

        /* ── EARNINGS VIEW ── */
        <main className="flex-1 overflow-y-auto pb-20 p-4 space-y-4 scrollbar-dark"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#4B5563 #1F2937' }}>

          {/* Period selector */}
          <div className="flex bg-muted rounded-xl p-1">
            {(["today", "week", "month"] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                  period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                )}>
                {periodLabel[p]}
              </button>
            ))}
          </div>

          {/* Pricing info bar */}
          {(chatEarningRate || videoEarningRate) && (
            <div className="flex items-center gap-3 bg-muted rounded-xl px-4 py-2.5">
              <span className="text-xs text-muted-foreground font-medium">You earn (71%):</span>
              {chatEarningRate && (
                <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                  <MessageSquare className="w-3.5 h-3.5" /> ₹{Math.floor(chatEarningRate * 0.71)} / chat
                </span>
              )}
              {videoEarningRate && (
                <span className="flex items-center gap-1 text-xs font-semibold text-blue-600">
                  🎥 ₹{Math.floor(videoEarningRate * 0.71)} / video
                </span>
              )}
            </div>
          )}

          {/* Total earnings card */}
          <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
            <p className="text-primary-foreground/70 text-sm mb-1">Total Earnings — {periodLabel[period]}</p>
            <p className="text-4xl font-bold">₹{grandTotal.toLocaleString("en-IN")}</p>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex-1 bg-primary-foreground/10 rounded-xl px-3 py-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Building2 className="w-3.5 h-3.5 text-primary-foreground/70" />
                  <span className="text-xs text-primary-foreground/70">OPD</span>
                </div>
                <p className="font-bold text-primary-foreground">₹{opdTotal.toLocaleString("en-IN")}</p>
                <p className="text-[10px] text-primary-foreground/60">{opdEarnings.length} visit{opdEarnings.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex-1 bg-primary-foreground/10 rounded-xl px-3 py-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <MessageSquare className="w-3.5 h-3.5 text-primary-foreground/70" />
                  <span className="text-xs text-primary-foreground/70">Chat</span>
                </div>
                <p className="font-bold text-primary-foreground">₹{chatTotal.toLocaleString("en-IN")}</p>
                <p className="text-[10px] text-primary-foreground/60">{chatEarnings.length} session{chatEarnings.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>

          {/* OPD / Chat tabs */}
          <div className="flex bg-muted rounded-xl p-1">
            <button onClick={() => setSourceTab("opd")}
              className={cn("flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5",
                sourceTab === "opd" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              )}>
              <Building2 className="w-4 h-4" /> OPD
            </button>
            <button onClick={() => setSourceTab("chat")}
              className={cn("flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5",
                sourceTab === "chat" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              )}>
              <MessageSquare className="w-4 h-4" /> Chat
            </button>
          </div>

          {/* History list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {sourceTab === "opd" ? "OPD" : "Chat"} History
              </h2>
              <span className="text-sm font-bold text-primary">
                ₹{(sourceTab === "opd" ? opdTotal : chatTotal).toLocaleString("en-IN")}
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No {sourceTab === "opd" ? "OPD" : "chat"} earnings for {periodLabel[period].toLowerCase()}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((e) => (
                  <div key={e.id} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        e.source === "opd" ? "bg-primary/10" : "bg-blue-100"
                      )}>
                        {e.source === "opd"
                          ? <Building2 className="w-5 h-5 text-primary" />
                          : <MessageSquare className="w-5 h-5 text-blue-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{e.patient_name ?? "Patient"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(e.earned_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">₹{e.fee.toLocaleString("en-IN")}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{e.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </main>
        )}

        <BottomNav />

        {/* Withdraw dialog */}
        <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
          <DialogContent className="max-w-[320px] rounded-2xl p-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground text-center mb-1">Request Withdrawal</h2>
            <p className="text-xs text-muted-foreground text-center mb-5">
              A withdrawal request will be sent to the admin with your earnings breakdown.
            </p>
            <div className="bg-muted rounded-xl p-4 space-y-2 mb-5">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Period</span>
                <span className="font-medium text-foreground">
                  {periodLabel[period]} · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> OPD Earnings
                </span>
                <span className="font-semibold">₹{opdTotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Chat Earnings
                </span>
                <span className="font-semibold">₹{chatTotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
                <span>Total</span>
                <span className="text-primary">₹{grandTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowWithdraw(false)}>Cancel</Button>
              <Button variant="medical" className="flex-1" onClick={handleWithdraw} disabled={withdrawing || grandTotal === 0}>
                {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </MobileContainer>
  );
}
