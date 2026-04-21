import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stethoscope, Mail, Lock, Eye, EyeOff, Shield, ArrowLeft, CheckCircle, Loader2, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MobileContainer } from "@/components/layout/MobileContainer";
import {
  auth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "@/lib/firebase";
import { getDoctorByFirebaseUid } from "@/lib/supabase";
import { clearDoctorCache } from "@/hooks/useDoctor";
import { toast } from "sonner";

// ── view states ───────────────────────────────────────────────────────────────
type View = "login" | "forgot_email" | "forgot_sent" | "forgot_reset" | "forgot_done";

export const DoctorLogin = () => {
  const navigate = useNavigate();

  const [view, setView] = useState<View>("login");
  const [animating, setAnimating] = useState(false);

  // login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // forgot password
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState("");

  // animated transition between views
  const goTo = (next: View) => {
    setAnimating(true);
    setTimeout(() => {
      setView(next);
      setFpError("");
      setAnimating(false);
    }, 220);
  };

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email || !password) { setLoginError("Please enter email and password."); return; }
    setLoginError("");
    setLoginLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // save UID immediately so next app load skips Firebase boot delay (Option 2)
      localStorage.setItem("doctor_uid", cred.user.uid);
      // check admin approval in Supabase
      const { data, error } = await getDoctorByFirebaseUid(cred.user.uid);
      if (error || !data) {
        await auth.signOut();
        setLoginError("No doctor account found for this email.");
        return;
      }
      if (data.status === "pending") {
        await auth.signOut();
        clearDoctorCache();
        setLoginError("Your account is pending admin approval. Please wait for verification.");
        return;
      }
      if (data.status === "rejected") {
        await auth.signOut();
        clearDoctorCache();
        setLoginError(`Your account was rejected. Reason: ${data.rejection_reason || "Contact support."}`);
        return;
      }
      toast.success(`Welcome back, ${data.full_name}!`);
      navigate("/location-permission", {
        state: {
          firebase_uid: cred.user.uid,
          email: data.email,
          doctor_name: data.full_name,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (msg.includes("invalid-credential") || msg.includes("wrong-password") || msg.includes("user-not-found")) {
        setLoginError("Invalid email or password.");
      } else {
        setLoginError(msg.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "").trim());
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // ── FORGOT — send reset email ──────────────────────────────────────────────
  const handleSendReset = async () => {
    if (!resetEmail) { setFpError("Please enter your email."); return; }
    setFpError("");
    setFpLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      goTo("forgot_sent");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send email";
      setFpError(msg.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "").trim());
    } finally {
      setFpLoading(false);
    }
  };

  // ── FORGOT — verify code & set new password ────────────────────────────────
  const handleVerifyAndReset = async () => {
    if (!resetCode) { setFpError("Please enter the reset code from your email."); return; }
    if (newPassword.length < 8) { setFpError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setFpError("Passwords do not match."); return; }
    setFpError("");
    setFpLoading(true);
    try {
      await verifyPasswordResetCode(auth, resetCode);
      await confirmPasswordReset(auth, resetCode, newPassword);
      goTo("forgot_done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Reset failed";
      if (msg.includes("invalid-action-code") || msg.includes("expired-action-code")) {
        setFpError("The reset code is invalid or expired. Please request a new one.");
      } else {
        setFpError(msg.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "").trim());
      }
    } finally {
      setFpLoading(false);
    }
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  const slideClass = `transition-all duration-200 ${animating ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}`;

  return (
    <MobileContainer>
      <div className="h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col overflow-hidden">

        {/* Header */}
        <div className="pt-10 pb-6 px-6 text-center shrink-0">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Stethoscope className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Doctor Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">Secure access for verified doctors</p>
        </div>

        {/* Card */}
        <div className="flex-1 px-4 pb-6 overflow-y-auto">
          <div className="bg-card rounded-2xl shadow-xl border border-border p-6">

            {/* ── LOGIN VIEW ── */}
            {view === "login" && (
              <div className={slideClass}>
                <h2 className="text-lg font-semibold text-foreground mb-5">Sign In</h2>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input type="email" placeholder="doctor@example.com"
                        value={email} onChange={(e) => { setEmail(e.target.value); setLoginError(""); }}
                        className="pl-10 h-12" onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input type={showPassword ? "text" : "password"} placeholder="Enter your password"
                        value={password} onChange={(e) => { setPassword(e.target.value); setLoginError(""); }}
                        className="pl-10 pr-10 h-12" onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{loginError}</p>
                  )}

                  <button type="button" onClick={() => { setResetEmail(email); goTo("forgot_email"); }}
                    className="text-sm text-primary font-medium hover:underline">
                    Forgot Password?
                  </button>

                  <Button onClick={handleLogin} disabled={loginLoading}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                    {loginLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {loginLoading ? "Signing in…" : "Sign In"}
                  </Button>
                </div>

                <div className="mt-5 pt-5 border-t border-border flex items-center gap-2 text-muted-foreground">
                  <Shield className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="text-xs">256-bit SSL encrypted · Admin-verified access only</span>
                </div>
              </div>
            )}

            {/* ── FORGOT: ENTER EMAIL ── */}
            {view === "forgot_email" && (
              <div className={slideClass}>
                <button onClick={() => goTo("login")}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5">
                  <ArrowLeft className="w-4 h-4" /> Back to login
                </button>

                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Forgot Password</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter your registered email. We'll send a reset link.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input type="email" placeholder="doctor@example.com"
                        value={resetEmail} onChange={(e) => { setResetEmail(e.target.value); setFpError(""); }}
                        className="pl-10 h-12" />
                    </div>
                  </div>

                  {fpError && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{fpError}</p>}

                  <Button onClick={handleSendReset} disabled={fpLoading} className="w-full h-12 font-semibold">
                    {fpLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {fpLoading ? "Sending…" : "Send Reset Link"}
                  </Button>
                </div>
              </div>
            )}

            {/* ── FORGOT: EMAIL SENT ── */}
            {view === "forgot_sent" && (
              <div className={slideClass}>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-7 h-7 text-green-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Check Your Email</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    A password reset link was sent to <span className="font-medium text-foreground">{resetEmail}</span>.
                    Open the email, click the link — it will give you a reset code.
                  </p>
                </div>

                <Button onClick={() => goTo("forgot_reset")} className="w-full h-12 font-semibold">
                  I have the reset code →
                </Button>

                <button onClick={() => handleSendReset()}
                  className="w-full text-center text-sm text-muted-foreground hover:text-primary mt-3">
                  Resend email
                </button>
              </div>
            )}

            {/* ── FORGOT: ENTER CODE + NEW PASSWORD ── */}
            {view === "forgot_reset" && (
              <div className={slideClass}>
                <button onClick={() => goTo("forgot_sent")}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <KeyRound className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Set New Password</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Paste the reset code from your email and choose a new password.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Reset Code (from email)</label>
                    <Input placeholder="Paste the code from the email link"
                      value={resetCode} onChange={(e) => { setResetCode(e.target.value.trim()); setFpError(""); }}
                      className="h-12 font-mono text-sm" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input type={showNew ? "text" : "password"} placeholder="Min. 8 characters"
                        value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setFpError(""); }}
                        className="pl-10 pr-10 h-12" />
                      <button type="button" onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input type={showConfirm ? "text" : "password"} placeholder="Re-enter new password"
                        value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setFpError(""); }}
                        className="pl-10 pr-10 h-12" />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-destructive">Passwords do not match.</p>
                    )}
                  </div>

                  {fpError && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{fpError}</p>}

                  <Button onClick={handleVerifyAndReset} disabled={fpLoading} className="w-full h-12 font-semibold">
                    {fpLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {fpLoading ? "Resetting…" : "Reset Password"}
                  </Button>
                </div>
              </div>
            )}

            {/* ── FORGOT: DONE ── */}
            {view === "forgot_done" && (
              <div className={`${slideClass} text-center`}>
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-2">Password Reset!</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Your password has been updated successfully. You can now sign in with your new password.
                </p>
                <Button className="w-full h-12 font-semibold" onClick={() => {
                  setPassword("");
                  setResetCode("");
                  setNewPassword("");
                  setConfirmPassword("");
                  goTo("login");
                }}>
                  Back to Sign In
                </Button>
              </div>
            )}

          </div>

          {/* Register link */}
          <p className="text-center text-sm text-muted-foreground mt-5">
            Not registered yet?{" "}
            <button onClick={() => navigate("/")} className="text-primary font-medium hover:underline">
              Join as Doctor
            </button>
          </p>
        </div>
      </div>
    </MobileContainer>
  );
};
