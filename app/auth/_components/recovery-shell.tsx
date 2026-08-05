import type { ReactNode } from "react";

import { LogoWordmark } from "@/components/domain/logo";

import { CoverPanel } from "../../(auth)/_components/cover-panel";

/** Same two-column chrome as /login — recovery is a login-adjacent flow, and
 *  landing on a differently-shaped page mid-recovery reads as a phishing site. */
export function RecoveryShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center gap-2 lg:hidden">
          <LogoWordmark className="h-6 w-auto" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
      <CoverPanel />
    </div>
  );
}
