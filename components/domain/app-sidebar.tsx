"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RiExpandUpDownLine,
  RiFileChartLine,
  RiLineChartLine,
  RiSettings3Line,
  RiHome5Line,
  RiLogoutBoxRLine,
  RiTeamLine,
  RiUserLine,
} from "@remixicon/react";

import { AllClear } from "@/components/domain/all-clear";
import { LogoMark, LogoWordmark } from "@/components/domain/logo";
import {
  NavGroup,
  type SidebarNavGroup,
} from "@/components/domain/nav-group";
import { StaleBanner } from "@/components/domain/stale-banner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { logout } from "@/lib/auth/actions";
import type { ConnectionFreshness } from "@/lib/engine/freshness";

// Shell rebuilt on the shadcn block @efferd/app-shell-3 (2026-08-02,
// founder-directed): header logo row → labelled NavGroups → footer. The
// collapse choreography is the primitive's own (200ms ease-linear) — the app
// no longer overrides it, so what you see is the block's native motion.

const copy = {
  brand: "Denarius",
  groupCockpit: "Cockpit",
  groupAccount: "Conta",
  home: "Início",
  teams: "Times",
  explore: "Explorar",
  reports: "Relatórios",
  settings: "Ajustes",
  profileMenu: "Perfil",
  profileSettings: "Configurações",
  logout: "Sair",
};

const navigation: { label: string; items: { title: string; path: string; icon: React.ReactNode }[] }[] = [
  {
    label: copy.groupCockpit,
    items: [
      { title: copy.home, path: "/", icon: <RiHome5Line /> },
      { title: copy.teams, path: "/times", icon: <RiTeamLine /> },
      { title: copy.explore, path: "/explorar", icon: <RiLineChartLine /> },
      { title: copy.reports, path: "/relatorios", icon: <RiFileChartLine /> },
    ],
  },
  {
    label: copy.groupAccount,
    items: [{ title: copy.settings, path: "/ajustes", icon: <RiSettings3Line /> }],
  },
];

// The wordmark rides the collapse: a fast fade-out as the rail closes, a
// delayed fade-in on expand so the letters appear once the space is there.
const fadeWordmark =
  "transition-[opacity,transform] duration-200 delay-100 ease-(--motion-ease-expressive) group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:-translate-x-1 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:delay-0 group-data-[collapsible=icon]:duration-150";

// "/" only matches exactly; sections stay lit on their subroutes and query
// variants (/times/<id> keeps Times active through the pathname prefix).
function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({
  userEmail,
  userInitials,
  userLabel,
  staleConnections,
  allClear,
}: {
  userEmail: string;
  userInitials: string;
  userLabel: string;
  staleConnections: ConnectionFreshness[];
  allClear: boolean;
}) {
  const pathname = usePathname();

  const navGroups: SidebarNavGroup[] = navigation.map((group) => ({
    label: group.label,
    items: group.items.map((item) => ({
      ...item,
      isActive: isActivePath(pathname, item.path),
    })),
  }));

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="h-14 justify-center">
          {/* Wordmark ↔ coin crossfade: both stay mounted (the Link's
              overflow-hidden clips the wordmark as the rail closes) so the swap
              fades instead of jump-cutting, on the same clock as the collapse.
              The size classes carry `!` because sidebarMenuButtonVariants'
              `[&_svg]:size-4` is a descendant variant and out-specifies a plain
              utility — without it the lockup renders at 16px. */}
          <SidebarMenuButton
            asChild
            className="h-10 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!"
          >
            <Link
              href="/"
              aria-label={copy.brand}
              className="relative overflow-hidden"
            >
              <LogoWordmark className={`h-6! w-auto! shrink-0 ${fadeWordmark}`} />
              <LogoMark className="absolute top-1/2 left-1/2 size-7! -translate-x-1/2 -translate-y-1/2 scale-90 text-brand-accent opacity-0 transition-[opacity,scale] duration-[320ms] ease-(--motion-ease-expressive) group-data-[collapsible=icon]:scale-100 group-data-[collapsible=icon]:opacity-100 group-data-[collapsible=icon]:delay-100" />
            </Link>
          </SidebarMenuButton>
        </SidebarHeader>

        <SidebarContent>
          {navGroups.map((group) => (
            <NavGroup key={group.label} {...group} />
          ))}
        </SidebarContent>

        <SidebarFooter>
          {/* The notices sit together above the profile, in one shared card
              shape (SidebarNotice): the caveat about the data first, then the
              affirmative state of the budget. Both are silent when they have
              nothing to say. */}
          <StaleBanner items={staleConnections} />
          {allClear && <AllClear />}
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                {/* No `tooltip` on the rendered button: composing Base UI's
                    Menu.Trigger through SidebarMenuButton's TooltipTrigger
                    swallows the open/close handlers and the menu never opens. */}
                <DropdownMenuTrigger
                  aria-label={copy.profileMenu}
                  render={<SidebarMenuButton size="lg" />}
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="grid min-w-0 flex-1 text-left leading-tight">
                    <span className="truncate font-medium">{userLabel}</span>
                    {userLabel !== userEmail && (
                      <span className="truncate text-xs text-sidebar-foreground/60">
                        {userEmail}
                      </span>
                    )}
                  </span>
                  <RiExpandUpDownLine className="ml-auto text-sidebar-foreground/60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="right"
                  align="end"
                  sideOffset={10}
                  className="w-64 rounded-xl"
                >
                  {/* Identity header as a plain div: Base UI's GroupLabel
                      (DropdownMenuLabel) throws outside <Menu.Group>, which
                      crashed this menu the moment it opened. */}
                  <div className="flex items-center gap-3 px-2 py-2">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="grid min-w-0 leading-tight">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {userLabel}
                      </span>
                      {userLabel !== userEmail && (
                        <span className="break-all text-xs font-normal text-muted-foreground">
                          {userEmail}
                        </span>
                      )}
                    </span>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="h-9">
                    <Link href="/configuracoes">
                      <RiUserLine />
                      <span>{copy.profileSettings}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <form action={logout}>
                    <DropdownMenuItem
                      asChild
                      variant="destructive"
                      className="h-9"
                    >
                      <button type="submit" className="w-full">
                        <RiLogoutBoxRLine />
                        <span>{copy.logout}</span>
                      </button>
                    </DropdownMenuItem>
                  </form>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
    </TooltipProvider>
  );
}
