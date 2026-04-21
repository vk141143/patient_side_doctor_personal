import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building, CreditCard, Hash, Shield } from "lucide-react";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { useDoctor } from "@/hooks/useDoctor";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function Row({ icon: Icon, label, value, masked }: { icon: React.ElementType; label: string; value?: string | null; masked?: boolean }) {
  const display = masked && value ? `${"•".repeat(value.length - 4)}${value.slice(-4)}` : (value || "—");
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground font-mono">{display}</p>
      </div>
    </div>
  );
}

export function BankDetailsPage() {
  const navigate = useNavigate();
  const { doctor, loading } = useDoctor();

  return (
    <MobileContainer>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <header className="bg-primary text-primary-foreground px-4 pt-12 pb-4 shrink-0 flex items-center gap-3">
          <button onClick={() => navigate("/profile")} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Bank Details</h1>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : (
          <div className="scrollable-content flex-1 min-h-0 px-4 py-5 space-y-4">

            <div className="flex items-center gap-2 p-3 bg-success/10 rounded-xl border border-success/20">
              <Shield className="w-4 h-4 text-success shrink-0" />
              <p className="text-xs text-success font-medium">Your bank details are encrypted and stored securely.</p>
            </div>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bank Account</p>
                <Row icon={Building} label="Account Holder Name" value={doctor?.account_holder} />
                <Row icon={CreditCard} label="Account Number" value={doctor?.account_number} masked />
                <Row icon={Hash} label="IFSC Code" value={doctor?.ifsc_code} />
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-center px-4">
              To update your bank details, please contact support. Changes require admin verification.
            </p>
          </div>
        )}
      </div>
    </MobileContainer>
  );
}
