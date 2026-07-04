import { LogoWordmark } from "@/components/domain/logo";
import { ThemeToggle } from "@/components/domain/theme-toggle";

import { BrandPanel } from "../_components/brand-panel";
import { LoginForm } from "../_components/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-between gap-2">
          <LogoWordmark className="h-6 w-auto" />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <BrandPanel />
    </div>
  );
}
