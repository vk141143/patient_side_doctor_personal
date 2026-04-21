import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Upload, Camera, CreditCard, FileText, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

import type { IdentityData } from "./RegistrationWizard";

interface IdentityVerificationStepProps {
  onNext: (data: IdentityData) => void;
  onBack: () => void;
}

type IdType = "aadhaar" | "passport" | "driving" | "voter";

function FileUploadZone({
  file,
  onFile,
  accept,
  icon: Icon,
  label,
  hint,
  compact = false,
}: {
  file: File | null;
  onFile: (f: File) => void;
  accept: string;
  icon: React.ElementType;
  label: string;
  hint: string;
  compact?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFile(null as unknown as File);
    if (ref.current) ref.current.value = "";
  };

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <div
        onClick={() => ref.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl cursor-pointer transition-all",
          compact ? "p-4" : "p-6",
          file ? "border-green-500 bg-green-500/5" : "border-border hover:border-primary/50 bg-card"
        )}
      >
        {file ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-green-700 truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB · Click to replace</p>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1 rounded-full hover:bg-muted"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className={cn("flex items-center gap-3", !compact && "flex-col text-center")}>
            <div className={cn(
              "rounded-full bg-primary/10 flex items-center justify-center shrink-0",
              compact ? "w-10 h-10" : "w-12 h-12 mb-1"
            )}>
              <Icon className={cn(compact ? "w-5 h-5" : "w-6 h-6", "text-primary")} />
            </div>
            <div>
              <p className="font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function IdentityVerificationStep({ onNext, onBack }: IdentityVerificationStepProps) {
  const [selectedIdType, setSelectedIdType] = useState<IdType | null>(null);
  const [files, setFiles] = useState<{ idProof: File | null; selfie: File | null; photo: File | null }>({
    idProof: null,
    selfie: null,
    photo: null,
  });

  const idTypes = [
    { id: "aadhaar", label: "Aadhaar Card", icon: CreditCard },
    { id: "passport", label: "Passport", icon: FileText },
    { id: "driving", label: "Driving License", icon: CreditCard },
    { id: "voter", label: "Voter ID", icon: FileText },
  ];

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Verify Your Identity</h2>
        <p className="text-muted-foreground mt-2">Upload your identity documents for verification</p>
      </div>

      <ScrollArea className="flex-1 min-h-0 pr-2">
        <div className="space-y-6 pb-4">

          {/* ID Type Selection */}
          <div className="space-y-3">
            <Label className="text-foreground font-medium">Select Identity Proof (any one)</Label>
            <div className="grid grid-cols-2 gap-3">
              {idTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedIdType(type.id as IdType)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                    selectedIdType === type.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", selectedIdType === type.id ? "bg-primary/10" : "bg-muted")}>
                    <type.icon className={cn("w-5 h-5", selectedIdType === type.id ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <span className={cn("font-medium text-sm", selectedIdType === type.id ? "text-primary" : "text-foreground")}>
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Upload ID Document */}
          {selectedIdType && (
            <div className="space-y-3">
              <Label className="text-foreground font-medium">
                Upload {idTypes.find((t) => t.id === selectedIdType)?.label}
              </Label>
              <FileUploadZone
                file={files.idProof}
                onFile={(f) => setFiles((p) => ({ ...p, idProof: f }))}
                accept=".pdf,.jpg,.jpeg,.png"
                icon={Upload}
                label="Click to upload"
                hint="PDF, JPG, PNG · max 5 MB"
              />
            </div>
          )}

          {/* Selfie */}
          <div className="space-y-3">
            <Label className="text-foreground font-medium">Live Selfie / Photo</Label>
            <FileUploadZone
              file={files.selfie}
              onFile={(f) => setFiles((p) => ({ ...p, selfie: f }))}
              accept="image/*"
              icon={Camera}
              label="Upload a clear selfie"
              hint="JPG, PNG · ensure good lighting"
            />
          </div>

          {/* Passport Photo */}
          <div className="space-y-3">
            <Label className="text-foreground font-medium">Passport Size Photo (optional)</Label>
            <FileUploadZone
              file={files.photo}
              onFile={(f) => setFiles((p) => ({ ...p, photo: f }))}
              accept="image/*"
              icon={Upload}
              label="Upload passport size photo"
              hint="JPG, PNG · white background preferred"
              compact
            />
          </div>

        </div>
      </ScrollArea>

      <div className="flex gap-4 pt-4 border-t border-border mt-4">
        <Button variant="outline" size="lg" className="flex-1" onClick={onBack}>Back</Button>
        <Button variant="medical" size="lg" className="flex-1" onClick={() => onNext({
          idType: selectedIdType ?? "",
          idProofFile: files.idProof,
          selfieFile: files.selfie,
          photoFile: files.photo,
        })}>
          Next <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
