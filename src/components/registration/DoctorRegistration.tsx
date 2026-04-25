import { useState } from "react";
import { WelcomeScreen } from "./WelcomeScreen";
import { RegistrationWizard } from "./RegistrationWizard";
import { VerificationStatusScreen } from "./VerificationStatusScreen";
import { ApprovalSuccessScreen } from "./ApprovalSuccessScreen";

import { useNavigate } from "react-router-dom";

type RegistrationState = "welcome" | "wizard" | "verification" | "approved";

export function DoctorRegistration() {
  const [state, setState] = useState<RegistrationState>("welcome");
  const navigate = useNavigate();

  switch (state) {
    case "welcome":
      return <WelcomeScreen onStart={() => setState("wizard")} />;
    case "wizard":
      return (
        <RegistrationWizard
          onComplete={() => setState("verification")}
          onBack={() => setState("welcome")}
        />
      );
    case "verification":
      return <VerificationStatusScreen onApproved={() => setState("approved")} onLogin={() => navigate("/login")} />;
    case "approved":
      return <ApprovalSuccessScreen />;
    default:
      return null;
  }
}
