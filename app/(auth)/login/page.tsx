import { LogoWordmark } from "@/components/domain/logo";

import { AuthForm } from "../_components/auth-form";
import { CoverPanel } from "../_components/cover-panel";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const oauthError =
    error === "oauth"
      ? "Não foi possível entrar com o Google. Tente novamente."
      : undefined;

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        {/* On desktop the wordmark lives on the cover; keep it here for small
            screens where the cover column is hidden. */}
        <div className="flex items-center gap-2 lg:hidden">
          <LogoWordmark className="h-6 w-auto" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <AuthForm oauthError={oauthError} />
          </div>
        </div>
      </div>
      <CoverPanel />
    </div>
  );
}
