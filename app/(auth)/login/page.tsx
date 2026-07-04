import { LogoMark } from "@/components/domain/logo";

import { BrandPanel } from "../_components/brand-panel";
import { LoginForm } from "../_components/login-form";

const copy = {
  brand: "Denarius",
};

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <span className="flex items-center gap-2 font-medium">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LogoMark className="size-3.5" />
            </span>
            {copy.brand}
          </span>
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
