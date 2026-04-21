import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Building, CreditCard } from "lucide-react";
import type { PaymentData } from "./RegistrationWizard";

interface PaymentDetailsStepProps {
  onNext: (data: PaymentData) => void;
  onBack: () => void;
}

export function PaymentDetailsStep({ onNext, onBack }: PaymentDetailsStepProps) {
  const [formData, setFormData] = useState({
    accountHolder: "",
    accountNumber: "",
    ifscCode: "",
  });

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Payment Information</h2>
        <p className="text-muted-foreground mt-2">Where should we send your earnings?</p>
      </div>

      <ScrollArea className="flex-1 min-h-0 pr-2">
        <div className="space-y-6 pb-4">

          {/* Bank Details */}
          <div className="medical-card space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Bank Account Details</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountHolder" className="text-foreground font-medium">Account Holder Name</Label>
              <Input id="accountHolder" placeholder="As per bank records" className="h-12"
                value={formData.accountHolder}
                onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber" className="text-foreground font-medium">Account Number</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input id="accountNumber" placeholder="Enter account number" className="h-12 pl-10"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ifscCode" className="text-foreground font-medium">IFSC Code</Label>
              <Input id="ifscCode" placeholder="e.g., SBIN0001234" className="h-12"
                value={formData.ifscCode}
                onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })} />
            </div>
          </div>

          {/* Security Note */}
          <div className="bg-muted/50 rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Your data is secure</p>
              <p className="text-xs text-muted-foreground">All payment information is encrypted and stored securely</p>
            </div>
          </div>

        </div>
      </ScrollArea>

      <div className="flex gap-4 pt-4 border-t border-border mt-4">
        <Button variant="outline" size="lg" className="flex-1" onClick={onBack}>Back</Button>
        <Button variant="medical" size="lg" className="flex-1" onClick={() => onNext({
          accountHolder: formData.accountHolder,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode,
          panNumber: "",
          gstNumber: "",
          bankDocFile: null,
        })}>
          Continue <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
