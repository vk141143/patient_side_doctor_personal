import { useState } from "react";
import { Stethoscope, ArrowLeft } from "lucide-react";
import { ProgressIndicator } from "./ProgressIndicator";
import { BasicDetailsStep } from "./BasicDetailsStep";
import { IdentityVerificationStep } from "./IdentityVerificationStep";
import { MedicalCredentialsStep } from "./MedicalCredentialsStep";
import { ProfessionalProfileStep } from "./ProfessionalProfileStep";
import { PaymentDetailsStep } from "./PaymentDetailsStep";
import { LegalConsentStep } from "./LegalConsentStep";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { supabase, uploadFile } from "@/lib/supabase";
import { toast } from "sonner";

interface RegistrationWizardProps {
  onComplete: () => void;
  onBack: () => void;
}

const steps = [
  { id: 1, label: "Basic Info" },
  { id: 2, label: "Identity" },
  { id: 3, label: "Credentials" },
  { id: 4, label: "Profile" },
  { id: 5, label: "Payment" },
  { id: 6, label: "Consent" },
];

// ── shared data types ─────────────────────────────────────────────────────────
export interface BasicData {
  fullName: string; email: string; phone: string; city: string; state: string;
  gender: string; firebaseUid: string; password: string;
}
export interface IdentityData {
  idType: string; idProofFile: File | null; selfieFile: File | null; photoFile: File | null;
}
export interface CredentialsData {
  mbbsNumber: string; mbbsYearOfPassing: string;
  postgradType: string; postgradNumber: string; postgradYearOfPassing: string;
  registrationNumber: string; councilName: string; yearOfRegistration: string;
}
export interface ProfileData {
  specialization: string; experience: string; hospital: string; languages: string[];
  serviceChat: boolean; serviceOpd: boolean; consultDuration: string;
  practiceType: "clinic" | "individual"; clinicAddress: string; clinicLicense: string;
}
export interface PaymentData {
  accountHolder: string; accountNumber: string; ifscCode: string;
  panNumber: string; gstNumber: string; bankDocFile: File | null;
}
export interface ConsentData {
  registered: boolean; guidelines: boolean; terms: boolean;
  prescriptions: boolean; dataProcessing: boolean;
}

export function RegistrationWizard({ onComplete, onBack }: RegistrationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [basicData, setBasicData] = useState<BasicData | null>(null);
  const [identityData, setIdentityData] = useState<IdentityData | null>(null);
  const [credentialsData, setCredentialsData] = useState<CredentialsData | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
    else onBack();
  };

  const handleFinalSubmit = async (consentData: ConsentData) => {
    if (!basicData) return;
    setSubmitting(true);
    try {
      const uid = basicData.firebaseUid;

      // upload files to storage
      const upload = async (
        file: File | null | undefined,
        bucket: "doctor-documents" | "doctor-images",
        name: string
      ) => {
        if (!file) return null;
        return uploadFile(bucket, `${uid}/${name}`, file);
      };

      const [idProofUrl, selfieUrl, photoUrl, bankDocUrl] = await Promise.all([
        upload(identityData?.idProofFile, "doctor-documents", "id_proof"),
        upload(identityData?.selfieFile, "doctor-images", "selfie"),
        upload(identityData?.photoFile, "doctor-images", "passport_photo"),
        upload(paymentData?.bankDocFile, "doctor-documents", "bank_document"),
      ]);

      // Build row using ONLY columns that exist in the current DB table.
      // Credentials fields are packed into existing text columns since the
      // table still has the old certificate_url columns.
      const row = {
        firebase_uid:         uid,
        full_name:            basicData.fullName,
        email:                basicData.email,
        phone:                basicData.phone,
        city:                 basicData.city,
        state:                basicData.state,
        gender:               basicData.gender || null,

        // identity
        id_type:              identityData?.idType ?? null,
        id_proof_url:         idProofUrl,
        selfie_url:           selfieUrl,
        passport_photo_url:   photoUrl,

        // credentials
        mbbs_cert_number:         credentialsData?.mbbsNumber ?? null,
        mbbs_year_of_passing:     credentialsData?.mbbsYearOfPassing ?? null,
        postgrad_type:            credentialsData?.postgradType || null,
        postgrad_cert_number:     credentialsData?.postgradNumber || null,
        postgrad_year_of_passing: credentialsData?.postgradYearOfPassing || null,
        registration_number:      credentialsData?.registrationNumber ?? null,
        council_name:             credentialsData?.councilName ?? null,
        year_of_registration:     credentialsData?.yearOfRegistration ?? null,

        // professional profile
        specialization:    profileData?.specialization ?? null,
        experience_years:  profileData?.experience ? parseInt(profileData.experience) : null,
        practice_type:     profileData?.practiceType ?? null,
        hospital_name:     profileData?.hospital ?? null,
        clinic_address:    profileData?.clinicAddress || null,
        clinic_license:    profileData?.clinicLicense || null,
        languages:         profileData?.languages ?? [],
        service_chat:      profileData?.serviceChat ?? false,
        service_opd:       profileData?.serviceOpd ?? false,
        consult_duration:  profileData?.consultDuration ? parseInt(profileData.consultDuration) : 15,

        // payment
        account_holder:    paymentData?.accountHolder ?? null,
        account_number:    paymentData?.accountNumber ?? null,
        ifsc_code:         paymentData?.ifscCode ?? null,
        pan_number:        paymentData?.panNumber ?? null,
        gst_number:        paymentData?.gstNumber ?? null,
        bank_document_url: bankDocUrl,

        // consent
        consent_registered:       consentData.registered,
        consent_guidelines:       consentData.guidelines,
        consent_terms:            consentData.terms,
        consent_prescriptions:    consentData.prescriptions,
        consent_data_processing:  consentData.dataProcessing,

        status: "pending",
      };

      const { error } = await supabase.from("doctors").insert(row);
      if (error) throw new Error(error.message);

      toast.success("Registration submitted successfully!");
      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <BasicDetailsStep onNext={(d) => { setBasicData(d); setCurrentStep(2); }} onBack={handleBack} />;
      case 2: return <IdentityVerificationStep onNext={(d) => { setIdentityData(d); setCurrentStep(3); }} onBack={handleBack} />;
      case 3: return <MedicalCredentialsStep onNext={(d) => { setCredentialsData(d); setCurrentStep(4); }} onBack={handleBack} />;
      case 4: return <ProfessionalProfileStep onNext={(d) => { setProfileData(d); setCurrentStep(5); }} onBack={handleBack} />;
      case 5: return <PaymentDetailsStep onNext={(d) => { setPaymentData(d); setCurrentStep(6); }} onBack={handleBack} />;
      case 6: return <LegalConsentStep onNext={handleFinalSubmit} onBack={handleBack} submitting={submitting} />;
      default: return null;
    }
  };

  return (
    <MobileContainer>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <header className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="flex items-center justify-between p-4">
            <button onClick={handleBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">MediConnect</span>
            </div>
            <div className="w-16" />
          </div>
          <ProgressIndicator steps={steps} currentStep={currentStep} />
        </header>

        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="max-w-lg mx-auto px-6 py-6 h-full flex flex-col">
            {renderStep()}
          </div>
        </main>

        <footer className="p-4 border-t border-border bg-card text-center">
          <button className="text-sm text-primary hover:underline font-medium">
            Save & Continue Later
          </button>
        </footer>
      </div>
    </MobileContainer>
  );
}
