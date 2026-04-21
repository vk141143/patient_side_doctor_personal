import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { DoctorDashboard } from "./components/dashboard/DoctorDashboard";
import { LiveConsultation } from "./components/consultation/LiveConsultation";
import { OpdBookingPage } from "./components/consultation/OpdBookingPage";
import { PrescriptionScreen } from "./components/prescription/PrescriptionScreen";
import { EarningsScreen } from "./components/earnings/EarningsScreen";
import { DoctorLogin } from "./components/auth/DoctorLogin";
import { LocationPermissionScreen } from "./components/auth/LocationPermissionScreen";
import { ScheduleScreen } from "./components/schedule/ScheduleScreen";
import { ConsultationsScreen } from "./components/consultations/ConsultationsScreen";
import { NotificationsScreen } from "./components/notifications/NotificationsScreen";
import { ProfileScreen } from "./components/profile/ProfileScreen";
import { DoctorProfilePage } from "./components/profile/DoctorProfilePage";
import { ClinicProfilePage } from "./components/profile/ClinicProfilePage";
import { BankDetailsPage } from "./components/profile/BankDetailsPage";
import { TelemedicineGuidelinesPage } from "./components/profile/TelemedicineGuidelinesPage";
import { LegalAgreementsPage } from "./components/profile/LegalAgreementsPage";
import { HelpSupportPage } from "./components/profile/HelpSupportPage";
import { NotificationSettingsPage } from "./components/profile/NotificationSettingsPage";
import { StaffManagementScreen } from "./components/staff/StaffManagementScreen";
import { StaffActivityScreen } from "./components/staff/StaffActivityScreen";
import { PublicProfilePreview } from "./components/profile/PublicProfilePreview";
import { RatingsScreen } from "./components/ratings/RatingsScreen";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="doctor-app-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<DoctorLogin />} />
            <Route path="/location-permission" element={<LocationPermissionScreen />} />
            <Route path="/dashboard" element={<DoctorDashboard />} />
            <Route path="/schedule" element={<ScheduleScreen />} />
            <Route path="/consultations" element={<ConsultationsScreen />} />
            <Route path="/consultation" element={<LiveConsultation />} />
            <Route path="/opd-booking" element={<OpdBookingPage />} />
            <Route path="/prescription" element={<PrescriptionScreen />} />
            <Route path="/earnings" element={<EarningsScreen />} />
            <Route path="/notifications" element={<NotificationsScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/profile/personal" element={<DoctorProfilePage />} />
            <Route path="/profile/clinic" element={<ClinicProfilePage />} />
            <Route path="/profile/bank" element={<BankDetailsPage />} />
            <Route path="/profile/guidelines" element={<TelemedicineGuidelinesPage />} />
            <Route path="/profile/legal" element={<LegalAgreementsPage />} />
            <Route path="/profile/help" element={<HelpSupportPage />} />
            <Route path="/profile/notifications" element={<NotificationSettingsPage />} />
            <Route path="/staff" element={<StaffManagementScreen />} />
            <Route path="/staff-activity" element={<StaffActivityScreen />} />
            <Route path="/public-profile" element={<PublicProfilePreview />} />
            <Route path="/ratings" element={<RatingsScreen />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
