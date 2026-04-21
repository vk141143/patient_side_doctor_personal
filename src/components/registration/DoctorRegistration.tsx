import { useState } from "react";
import { WelcomeScreen } from "./WelcomeScreen";
import { RegistrationWizard } from "./RegistrationWizard";
import { VerificationStatusScreen } from "./VerificationStatusScreen";
import { ApprovalSuccessScreen } from "./ApprovalSuccessScreen";

type RegistrationState = "welcome" | "wizard" | "verification" | "approved";

export function DoctorRegistration() {
  const [state, setState] = useState<RegistrationState>("welcome");

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
      return <VerificationStatusScreen onApproved={() => setState("approved")} />;
    case "approved":
      return <ApprovalSuccessScreen />;
    default:
      return null;
  }
}
