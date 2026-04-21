import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  User,
  MapPin,
  Phone,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { BottomNav } from "@/components/navigation/BottomNav";

interface StaffMember {
  id: number;
  name: string;
  role: "Doctor" | "Nurse" | "Assistant";
  status: "Available" | "Busy" | "Offline";
  currentTask?: string;
  location?: string;
  phone: string;
  avatar?: string;
}

export function StaffManagementScreen() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const staffMembers: StaffMember[] = [
    {
      id: 1,
      name: "Dr. Priya Sharma",
      role: "Doctor",
      status: "Available",
      phone: "+91 98765 43210",
    },
    {
      id: 2,
      name: "Nurse Anjali",
      role: "Nurse",
      status: "Busy",
      currentTask: "Home Visit - Rahul Sharma",
      location: "Sector 15, Noida",
      phone: "+91 98765 43211",
    },
    {
      id: 3,
      name: "Ravi Kumar",
      role: "Assistant",
      status: "Available",
      phone: "+91 98765 43212",
    },
    {
      id: 4,
      name: "Dr. Amit Singh",
      role: "Doctor",
      status: "Busy",
      currentTask: "OPD Consultation",
      phone: "+91 98765 43213",
    },
    {
      id: 5,
      name: "Nurse Meera",
      role: "Nurse",
      status: "Offline",
      phone: "+91 98765 43214",
    },
  ];

  const getStatusColor = (status: StaffMember["status"]) => {
    switch (status) {
      case "Available":
        return "text-success bg-success/10";
      case "Busy":
        return "text-warning bg-warning/10";
      case "Offline":
        return "text-muted-foreground bg-muted";
    }
  };

  const getStatusIcon = (status: StaffMember["status"]) => {
    switch (status) {
      case "Available":
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "Busy":
        return <Clock className="w-3.5 h-3.5" />;
      case "Offline":
        return <WifiOff className="w-3.5 h-3.5" />;
    }
  };

  const getRoleBadge = (role: StaffMember["role"]) => {
    switch (role) {
      case "Doctor":
        return "bg-primary/10 text-primary";
      case "Nurse":
        return "bg-accent/10 text-accent";
      case "Assistant":
        return "bg-secondary text-secondary-foreground";
    }
  };

  const filteredStaff = staffMembers.filter((staff) =>
    staff.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusCounts = {
    available: staffMembers.filter((s) => s.status === "Available").length,
    busy: staffMembers.filter((s) => s.status === "Busy").length,
    offline: staffMembers.filter((s) => s.status === "Offline").length,
  };

  return (
    <MobileContainer>
      <div className="h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-semibold text-foreground">Staff Management</h1>
                <p className="text-xs text-muted-foreground">{staffMembers.length} team members</p>
              </div>
            </div>
            <Button size="sm" variant="medical">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20">
          <div className="p-4 space-y-4">
            {/* Status Summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-success/10 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-success">{statusCounts.available}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
              <div className="bg-warning/10 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-warning">{statusCounts.busy}</p>
                <p className="text-xs text-muted-foreground">On Duty</p>
              </div>
              <div className="bg-muted rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-muted-foreground">{statusCounts.offline}</p>
                <p className="text-xs text-muted-foreground">Offline</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>

            {/* Staff List */}
            <div className="space-y-3">
              {filteredStaff.map((staff) => (
                <div
                  key={staff.id}
                  className="medical-card"
                  onClick={() => navigate("/staff-activity")}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{staff.name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getRoleBadge(staff.role)}`}>
                            {staff.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${getStatusColor(staff.status)}`}>
                            {getStatusIcon(staff.status)}
                            {staff.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button className="p-1 text-muted-foreground">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {staff.currentTask && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 text-warning" />
                        <span className="text-muted-foreground">{staff.currentTask}</span>
                      </div>
                      {staff.location && (
                        <div className="flex items-center gap-2 text-sm mt-1">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">{staff.location}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-4">
                    <a href={`tel:${staff.phone}`} className="flex items-center gap-1.5 text-sm text-primary">
                      <Phone className="w-4 h-4" />
                      Call
                    </a>
                    <button className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      Assign Task
                    </button>
                    <button className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      View Activity
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        <BottomNav />
      </div>
    </MobileContainer>
  );
}
