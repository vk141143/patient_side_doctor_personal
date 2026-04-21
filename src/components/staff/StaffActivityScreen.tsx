import { useState } from "react";
import {
  ArrowLeft,
  User,
  MapPin,
  Clock,
  CheckCircle2,
  Navigation,
  Home,
  MessageSquare,
  Phone,
  Car,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { BottomNav } from "@/components/navigation/BottomNav";

interface Activity {
  id: number;
  type: "assigned" | "on_way" | "arrived" | "completed";
  time: string;
  title: string;
  subtitle?: string;
  location?: string;
}

interface StaffWithActivity {
  id: number;
  name: string;
  role: string;
  currentPatient?: string;
  currentLocation?: string;
  status: string;
  activities: Activity[];
}

export function StaffActivityScreen() {
  const navigate = useNavigate();

  const staffActivities: StaffWithActivity[] = [
    {
      id: 1,
      name: "Nurse Anjali",
      role: "Nurse",
      currentPatient: "Rahul Sharma",
      currentLocation: "Sector 15, Noida",
      status: "At patient location",
      activities: [
        { id: 1, type: "assigned", time: "10:00 AM", title: "Assigned home visit", subtitle: "Rahul Sharma - Fever checkup" },
        { id: 2, type: "on_way", time: "10:15 AM", title: "Started journey", subtitle: "ETA: 25 mins" },
        { id: 3, type: "arrived", time: "10:42 AM", title: "Arrived at location", location: "Sector 15, Noida" },
      ],
    },
    {
      id: 2,
      name: "Ravi Kumar",
      role: "Assistant",
      status: "Available",
      activities: [
        { id: 1, type: "completed", time: "9:00 AM", title: "Completed home visit", subtitle: "Priya Patel - Follow-up" },
        { id: 2, type: "completed", time: "11:30 AM", title: "Medicine delivery", subtitle: "Amit Kumar" },
      ],
    },
    {
      id: 3,
      name: "Dr. Priya Sharma",
      role: "Doctor",
      status: "In OPD",
      activities: [
        { id: 1, type: "completed", time: "9:30 AM", title: "OPD consultation", subtitle: "4 patients" },
        { id: 2, type: "assigned", time: "2:00 PM", title: "Home visit scheduled", subtitle: "VIP patient" },
      ],
    },
  ];

  const getStatusIcon = (type: Activity["type"]) => {
    switch (type) {
      case "assigned":
        return <Clock className="w-4 h-4 text-warning" />;
      case "on_way":
        return <Car className="w-4 h-4 text-primary" />;
      case "arrived":
        return <MapPin className="w-4 h-4 text-success" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
    }
  };

  const getStatusColor = (type: Activity["type"]) => {
    switch (type) {
      case "assigned":
        return "bg-warning";
      case "on_way":
        return "bg-primary";
      case "arrived":
        return "bg-success";
      case "completed":
        return "bg-success";
    }
  };

  // Daily summary
  const summary = {
    totalVisits: 8,
    completed: 5,
    inProgress: 2,
    pending: 1,
  };

  return (
    <MobileContainer>
      <div className="h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/staff")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-semibold text-foreground">Staff Activity</h1>
                <p className="text-xs text-muted-foreground">Live tracking</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20">
          <div className="p-4 space-y-4">
            {/* Daily Summary Card */}
            <div className="medical-card">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Today's Summary</h3>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{summary.totalVisits}</p>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-success">{summary.completed}</p>
                  <p className="text-[10px] text-muted-foreground">Done</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-warning">{summary.inProgress}</p>
                  <p className="text-[10px] text-muted-foreground">Active</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-muted-foreground">{summary.pending}</p>
                  <p className="text-[10px] text-muted-foreground">Pending</p>
                </div>
              </div>
            </div>

            {/* Staff Activity List */}
            {staffActivities.map((staff) => (
              <div key={staff.id} className="medical-card">
                {/* Staff Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{staff.name}</p>
                      <p className="text-xs text-muted-foreground">{staff.role} • {staff.status}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 rounded-full bg-muted">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button className="p-2 rounded-full bg-muted">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Current Task */}
                {staff.currentPatient && (
                  <div className="bg-primary/5 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Currently with: {staff.currentPatient}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-primary" />
                          <span className="text-xs text-muted-foreground">{staff.currentLocation}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(staff.currentLocation || "")}`, "_blank")}
                        className="p-2 rounded-full bg-primary text-primary-foreground"
                      >
                        <Navigation className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Activity Timeline */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Activity Timeline</p>
                  <div className="relative">
                    {staff.activities.map((activity, index) => (
                      <div key={activity.id} className="flex gap-3 pb-4 last:pb-0">
                        {/* Timeline Line */}
                        <div className="flex flex-col items-center">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(activity.type)}`} />
                          {index < staff.activities.length - 1 && (
                            <div className="w-0.5 flex-1 bg-border mt-1" />
                          )}
                        </div>
                        {/* Content */}
                        <div className="flex-1 -mt-1">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(activity.type)}
                            <span className="text-sm font-medium text-foreground">{activity.title}</span>
                          </div>
                          {activity.subtitle && (
                            <p className="text-xs text-muted-foreground mt-0.5">{activity.subtitle}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        <BottomNav />
      </div>
    </MobileContainer>
  );
}
