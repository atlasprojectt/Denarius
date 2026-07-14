import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/domain/app-sidebar";
import { NextActionsButton } from "@/components/domain/next-actions-button";
import { RevealController } from "@/components/domain/reveal-controller";
import { AppToastProvider } from "@/components/domain/toast-provider";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { profileInitials, profileLabel } from "@/lib/settings/account";
import { createClient } from "@/lib/supabase/server";

type AppUserRow = {
  email: string;
  display_name: string | null;
  tenant: { name: string } | null;
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("app_user")
    .select("email, display_name, tenant:tenant_id(name)")
    .eq("id", user.id)
    .maybeSingle();
  const appUser = data as AppUserRow | null;

  // Signed in but no tenant yet (e.g. first Google login) → bootstrap.
  if (!appUser) redirect("/onboarding");

  return (
    <AppToastProvider>
      <SidebarProvider>
        <AppSidebar
          userEmail={appUser.email}
          userInitials={profileInitials({
            displayName: appUser.display_name,
            email: appUser.email,
          })}
          userLabel={profileLabel({
            displayName: appUser.display_name,
            email: appUser.email,
          })}
        />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2.5 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:rounded-t-xl">
            <SidebarTrigger className="-ml-1.5 size-10" />
            <Separator
              orientation="vertical"
              className="mr-2 self-center! data-[orientation=vertical]:h-4"
            />
            <span className="truncate text-sm font-medium">
              {appUser.tenant?.name}
            </span>
            <div className="ml-auto">
              <NextActionsButton />
            </div>
          </header>
          {/* SidebarInset already renders the page's <main> landmark — a
              nested second <main> broke the single-landmark contract.
              data-reveal-root scopes the app-wide chart open-animations; the
              RevealController persists across navigations and replays them. */}
          <div data-reveal-root className="flex-1 px-4 py-8 md:px-8">
            {children}
          </div>
          <RevealController />
        </SidebarInset>
      </SidebarProvider>
    </AppToastProvider>
  );
}
