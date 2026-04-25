import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Mail, User, MapPin, CheckCircle, Loader2, Lock, Eye, EyeOff, Phone } from "lucide-react";
import { auth, sendEmailVerification, createUserWithEmailAndPassword, updatePassword } from "@/lib/firebase";

interface BasicDetailsStepProps {
  onNext: (data: {
    fullName: string; phone: string; email: string; city: string; state: string;
    gender: string; firebaseUid: string; password: string;
  }) => void;
  onBack: () => void;
}

export function BasicDetailsStep({ onNext, onBack }: BasicDetailsStepProps) {
  const [formData, setFormData] = useState({ fullName: "", phone: "", email: "", city: "", state: "", gender: "" });
  const [phoneError, setPhoneError] = useState("");
  const [emailState, setEmailState] = useState<"idle" | "sending" | "sent" | "verified">("idle");
  const [emailError, setEmailError] = useState("");
  const [firebaseUid, setFirebaseUid] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const states = [
    "Maharashtra", "Karnataka", "Tamil Nadu", "Delhi", "Gujarat",
    "Uttar Pradesh", "West Bengal", "Rajasthan", "Kerala", "Telangana",
  ];

  const handleSendVerification = async () => {
    if (!formData.email) return;
    setEmailError("");
    setEmailState("sending");
    try {
      const tempPassword = Math.random().toString(36).slice(-10) + "A1!";
      const cred = await createUserWithEmailAndPassword(auth, formData.email, tempPassword);
      await sendEmailVerification(cred.user);
      setFirebaseUid(cred.user.uid);
      setEmailState("sent");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("email-already-in-use")) {
        setEmailError("This email is already registered. Please use a different email or login instead.");
      } else {
        setEmailError(msg.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "").trim() || "Failed to send verification email");
      }
      setEmailState("idle");
    }
  };

  const handleCheckVerified = async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) {
      setEmailState("verified");
    } else {
      setEmailError("Email not verified yet. Please check your inbox and click the link.");
    }
  };

  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword;

  const phoneValid = /^[6-9]\d{9}$/.test(formData.phone);

  const canContinue =
    formData.fullName && formData.phone && phoneValid && formData.email && formData.city && formData.state &&
    emailState === "verified" && passwordValid && passwordsMatch && password.length > 0;

  const handleContinue = async () => {
    if (!phoneValid) { setPhoneError("Enter a valid 10-digit Indian mobile number."); return; }
    if (!passwordValid) { setPasswordError("Password must be at least 8 characters."); return; }
    if (!passwordsMatch) { setPasswordError("Passwords do not match."); return; }
    setPhoneError("");
    setPasswordError("");
    // Update the Firebase user's password from the temp one to the real one
    if (auth.currentUser) {
      try {
        await updatePassword(auth.currentUser, password);
      } catch {
        // non-blocking — password update may need re-auth on some flows
      }
    }
    onNext({ ...formData, firebaseUid, password });
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Basic Information</h2>
        <p className="text-muted-foreground mt-2">Tell us about yourself</p>
      </div>

      <ScrollArea className="flex-1 min-h-0 pr-2">
        <div className="space-y-5 pb-4">

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-foreground font-medium">Full Name (as per certificate)</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input id="fullName" placeholder="Dr. John Doe" className="pl-10 h-12"
                value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
            </div>
          </div>

          {/* Mobile Number */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-foreground font-medium">Mobile Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+91</span>
              <Input id="phone" type="tel" placeholder="9876543210" className="pl-16 h-12"
                maxLength={10}
                value={formData.phone}
                onChange={(e) => { setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") }); setPhoneError(""); }} />
            </div>
            {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
            {formData.phone.length > 0 && !phoneValid && !phoneError && (
              <p className="text-xs text-muted-foreground">Enter a valid 10-digit Indian mobile number.</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground font-medium">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input id="email" type="email" placeholder="doctor@example.com"
                className="pl-10 h-12 pr-32"
                value={formData.email}
                disabled={emailState === "sent" || emailState === "verified"}
                onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setEmailState("idle"); setEmailError(""); }}
              />
              {emailState === "verified" ? (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-green-600 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" /> Verified
                </span>
              ) : emailState === "sent" ? (
                <Button variant="ghost" size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-primary text-xs"
                  onClick={handleCheckVerified}>
                  I've verified
                </Button>
              ) : (
                <Button variant="ghost" size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80 text-xs"
                  disabled={!formData.email || emailState === "sending"}
                  onClick={handleSendVerification}>
                  {emailState === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Email"}
                </Button>
              )}
            </div>
            {emailState === "sent" && (
              <p className="text-xs text-muted-foreground">
                Verification email sent! Check your inbox or spam, click the link, then press "I've verified".
              </p>
            )}
            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
          </div>

          {/* Password — only shown after email verified */}
          {emailState === "verified" && (
            <div className="space-y-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
              <p className="text-sm font-medium text-primary flex items-center gap-2">
                <Lock className="w-4 h-4" /> Set your account password
              </p>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="password" type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters" className="pl-10 h-12 pr-10"
                    value={password} onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password.length > 0 && !passwordValid && (
                  <p className="text-xs text-destructive">Password must be at least 8 characters.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground font-medium">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="confirmPassword" type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter password" className="pl-10 h-12 pr-10"
                    value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-destructive">Passwords do not match.</p>
                )}
              </div>

              {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
            </div>
          )}

          {/* City & State */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-foreground font-medium">City</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input id="city" placeholder="Mumbai" className="pl-10 h-12"
                  value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="state" className="text-foreground font-medium">State</Label>
              <Select value={formData.state} onValueChange={(v) => setFormData({ ...formData, state: v })}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent className="bg-card">
                  {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Gender (optional)</Label>
            <div className="flex gap-3">
              {["Male", "Female", "Other"].map((g) => (
                <button key={g} type="button" onClick={() => setFormData({ ...formData, gender: g })}
                  className={`flex-1 h-12 rounded-lg border-2 font-medium transition-all ${
                    formData.gender === g ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-foreground hover:border-primary/50"
                  }`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

        </div>
      </ScrollArea>

      <div className="flex gap-4 pt-4 border-t border-border mt-4">
        <Button variant="outline" size="lg" className="flex-1" onClick={onBack}>Back</Button>
        <Button variant="medical" size="lg" className="flex-1" disabled={!canContinue} onClick={handleContinue}>
          Continue <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
