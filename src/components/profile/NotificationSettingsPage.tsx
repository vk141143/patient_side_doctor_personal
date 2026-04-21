import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, MessageSquare, Wallet, Calendar, AlertCircle, Megaphone } from "lucide-react";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";

const notifGroups = [
  {
    title: "Consultations",
    items: [
      { key: "new_consultation", icon: MessageSquare, label: "New Consultation Request", desc: "When a patient requests an instant consultation" },
      { key: "consultation_complete", icon: MessageSquare, label: "Consultation Completed", desc: "When a session is marked as complete" },
    ],
  },
  {
    title: "Appointments",
    items: [
      { key: "appointment_reminder", icon: Calendar, label: "Appointment Reminders", desc: "Reminders before scheduled OPD appointments" },
      { key: "appointment_cancel", icon: Calendar, label: "Appointment Cancellations", desc: "When a patient cancels an appointment" },
    ],
  },
  {
    title: "Payments",
    items: [
      { key: "payment_received", icon: Wallet, label: "Payment Received", desc: "When a consultation payment is credited" },
      { key: "weekly_payout", icon: Wallet, label: "Weekly Payout", desc: "Weekly earnings settlement notifications" },
    ],
  },
  {
    title: "Platform & Admin",
    items: [
      { key: "admin_alerts", icon: AlertCircle, label: "Admin Alerts", desc: "Important alerts from the admin team" },
      { key: "platform_updates", icon: Megaphone, label: "Platform Updates", desc: "New features and announcements" },
    ],
  },
];

export function NotificationSettingsPage() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    new_consultation: true,
    consultation_complete: true,
    appointment_reminder: true,
    appointment_cancel: true,
    payment_received: true,
    weekly_payout: true,
    admin_alerts: true,
    platform_updates: true,
  });
  const [masterEnabled, setMasterEnabled] = useState(true);

  const toggle = (key: string) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const toggleMaster = (val: boolean) => {
    setMasterEnabled(val);
    if (!val) setPrefs(Object.fromEntries(Object.keys(prefs).map((k) => [k, false])));
    else setPrefs(Object.fromEntries(Object.keys(prefs).map((k) => [k, true])));
  };

  return (
    <MobileContainer>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <header className="bg-primary text-primary-foreground px-4 pt-12 pb-4 shrink-0 flex items-center gap-3">
          <button onClick={() => navigate("/profile")} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Notification Settings</h1>
            <p className="text-primary-foreground/70 text-xs mt-0.5">Manage what you get notified about</p>
          </div>
        </header>

        <div className="scrollable-content flex-1 min-h-0 px-4 py-5 space-y-5">

          {/* Master toggle */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">All Notifications</p>
                    <p className="text-xs text-muted-foreground">Enable or disable all at once</p>
                  </div>
                </div>
                <Switch checked={masterEnabled} onCheckedChange={toggleMaster} />
              </div>
            </CardContent>
          </Card>

          {/* Per-category toggles */}
          {notifGroups.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                {group.title}
              </p>
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  {group.items.map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3 flex-1 pr-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <item.icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                      <Switch
                        checked={prefs[item.key] ?? true}
                        onCheckedChange={() => toggle(item.key)}
                        disabled={!masterEnabled}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}

          <p className="text-xs text-muted-foreground text-center pb-4">
            Admin-sent notifications will always be delivered regardless of these settings.
          </p>
        </div>
      </div>
    </MobileContainer>
  );
}
