import { LogoWordmark } from "@/components/domain/logo";

import { BrandPanel } from "../_components/brand-panel";
import { LoginForm } from "../_components/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center gap-2">
          <LogoWordmark className="h-6 w-auto" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <BrandPanel imageSrc="/login-bitcoin.webp" />
    </div>
  );
}
