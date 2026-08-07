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
import {
  freshness,
  type ConnectionStatus,
} from "@/lib/engine/freshness";
import { getCockpitData } from "@/lib/home/queries";
import { profileInitials, profileLabel } from "@/lib/settings/account";
import { createClient } from "@/lib/supabase/server";

type AppUserRow = {
  email: string;
  display_name: string | null;
  tenant: { name: string } | null;
};

type ConnectionRow = {
  provider: string;
  status: string;
  last_sync_at: string | null;
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

  const [{ data }, { data: connectionData }] = await Promise.all([
    supabase
      .from("app_user")
      .select("email, display_name, tenant:tenant_id(name)")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("provider_connection")
      .select("provider, status, last_sync_at"),
  ]);
  const appUser = data as AppUserRow | null;

  // Signed in but no tenant yet (e.g. first Google login) → bootstrap.
  if (!appUser) redirect("/onboarding");

  const connections = ((connectionData ?? []) as ConnectionRow[]).map(
    (connection): ConnectionStatus => ({
      provider: connection.provider as ConnectionStatus["provider"],
      status: connection.status,
      lastSyncAt: connection.last_sync_at,
    }),
  );
  const staleConnections = freshness(connections).needsAttention;

  // The all-clear is chrome, not cockpit: it rides the sidebar on every screen,
  // so the verdict's affirmative state is read here rather than on Home. The
  // assembly is per-request memoized, so Home still pays for exactly one.
  const { cockpit } = await getCockpitData();
  const allClear = cockpit.state === "ready" && cockpit.allClear;

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
          staleConnections={staleConnections}
          allClear={allClear}
        />
        <SidebarInset className="md:border md:border-border/60">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2.5 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:rounded-t-xl">
            <SidebarTrigger className="-ml-1.5 size-11 md:size-10" />
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
              RevealController persists across navigations and replays them.
              flex column so a page can opt into filling the viewport height
              (Home's cockpit grid) with flex-1. */}
          <div data-reveal-root className="flex flex-1 flex-col px-4 py-8 md:px-8">
            {children}
          </div>
          <RevealController />
        </SidebarInset>
      </SidebarProvider>
    </AppToastProvider>
  );
}
