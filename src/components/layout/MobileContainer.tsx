import { ReactNode } from "react";

interface MobileContainerProps {
  children: ReactNode;
}

export const MobileContainer = ({ children }: MobileContainerProps) => {
  return (
    <div className="min-h-screen bg-muted/30 flex items-start justify-center">
      <div className="w-full max-w-[430px] h-screen bg-background shadow-2xl relative flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
};
