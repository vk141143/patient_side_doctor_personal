import { Button } from "@/components/ui/button";
import { Shield, Clock, Users, BadgeCheck, Stethoscope } from "lucide-react";
import { MobileContainer } from "@/components/layout/MobileContainer";

interface WelcomeScreenProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const benefits = [
    {
      icon: Users,
      title: "Access to patients nationwide",
      description: "Connect with patients from across the country",
    },
    {
      icon: Clock,
      title: "Flexible working hours",
      description: "Set your own schedule and availability",
    },
    {
      icon: BadgeCheck,
      title: "Verified professional profile",
      description: "Build trust with a verified doctor badge",
    },
    {
      icon: Shield,
      title: "Secure & compliant platform",
      description: "Telemedicine guidelines compliant",
    },
  ];

  return (
    <MobileContainer>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="p-4 flex items-center justify-center border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">MediConnect</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col px-4 py-6 overflow-y-auto">
          {/* Hero Section */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl gradient-primary mx-auto mb-4 flex items-center justify-center shadow-lg">
              <Stethoscope className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Join as a Doctor
            </h1>
            <p className="text-muted-foreground text-sm">
              Complete verification to start consulting patients
            </p>
          </div>

          {/* Single Benefits Card */}
          <div className="bg-card rounded-2xl border border-border p-4 mb-6 shadow-sm">
            <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Why join us?
            </h2>
            <div className="space-y-3">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 py-2 border-b border-border last:border-b-0 last:pb-0"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground text-sm">{benefit.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <Button
            variant="medical"
            size="lg"
            className="w-full h-12 rounded-xl"
            onClick={onStart}
          >
            Start Registration
          </Button>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <a href="/login" className="text-primary hover:underline font-medium">
              Login here
            </a>
          </p>
        </main>

        {/* Footer */}
        <footer className="p-4 text-center border-t border-border bg-card">
          <p className="text-xs text-muted-foreground">
            By registering, you agree to our{" "}
            <a href="#" className="text-primary hover:underline">
              Terms
            </a>{" "}
            &{" "}
            <a href="#" className="text-primary hover:underline">
              Privacy Policy
            </a>
          </p>
        </footer>
      </div>
    </MobileContainer>
  );
}
