"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RiExpandUpDownLine,
  RiLineChartLine,
  RiSettings3Line,
  RiHome5Line,
  RiLogoutBoxRLine,
  RiTeamLine,
  RiUserLine,
} from "@remixicon/react";

import { LogoMark, LogoWordmark } from "@/components/domain/logo";
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
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { logout } from "@/lib/auth/actions";
import type { ConnectionFreshness } from "@/lib/engine/freshness";

const copy = {
  brand: "Denarius",
  groupCockpit: "Cockpit",
  groupAccount: "Conta",
  home: "Início",
  teams: "Times",
  explore: "Explorar",
  settings: "Ajustes",
  profileMenu: "Perfil",
  profileSettings: "Configurações",
  logout: "Sair",
};

const cockpitItems = [
  { title: copy.home, href: "/", icon: RiHome5Line },
  { title: copy.teams, href: "/times", icon: RiTeamLine },
  { title: copy.explore, href: "/explorar", icon: RiLineChartLine },
];

const accountItems = [
  { title: copy.settings, href: "/ajustes", icon: RiSettings3Line },
];

type NavItem = (typeof cockpitItems)[number];

// Collapse/expand label choreography: labels stay mounted (the buttons'
// overflow-hidden clips them) and crossfade with the width easing — fast
// fade-out on collapse, delayed fade-in on expand so text appears as the
// space opens. Pairs with the sidebar width override in globals.css.
const fadeLabel =
  "transition-opacity duration-200 delay-100 ease-out group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:delay-0 group-data-[collapsible=icon]:duration-150";

// "/" only matches exactly; sections stay lit on their subroutes
// (/times/[id] keeps Times active).
function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <SidebarGroup>
      {/* Collapsed rail: the label fades out (opacity-0 -mt-8) but the shadcn
          primitive leaves it hovering OVER the first menu item, swallowing
          clicks and tooltip hovers (2026-07-11 audit, UX-07/QA-07). Kill its
          pointer events when the rail is in icon mode. */}
      <SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="group-data-[collapsible=icon]:items-center">
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActivePath(pathname, item.href)}
                tooltip={item.title}
                className="h-9 gap-2.5 px-2.5 data-active:font-medium [&_svg]:size-4.5"
              >
                <Link href={item.href}>
                  <item.icon />
                  <span className={fadeLabel}>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar({
  userEmail,
  userInitials,
  userLabel,
  staleConnections,
}: {
  userEmail: string;
  userInitials: string;
  userLabel: string;
  staleConnections: ConnectionFreshness[];
}) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="px-3 pt-3">
          {/* Wordmark ↔ coin mark crossfade: both stay mounted (overflow-hidden
              clips the wordmark as the width eases) so the swap fades instead
              of jump-cutting; the mark scales in slightly on top. */}
          <Link
            href="/"
            aria-label={copy.brand}
            className="relative flex h-11 items-center overflow-hidden rounded-md px-1.5 transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:px-0"
          >
            <LogoWordmark className={`h-7 w-auto shrink-0 text-foreground ${fadeLabel}`} />
            <LogoMark className="absolute top-1/2 left-1/2 size-7 -translate-x-1/2 -translate-y-1/2 scale-90 text-chart-2 opacity-0 transition-[opacity,scale] duration-200 ease-out group-data-[collapsible=icon]:scale-100 group-data-[collapsible=icon]:opacity-100 group-data-[collapsible=icon]:delay-100" />
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <NavGroup
            label={copy.groupCockpit}
            items={cockpitItems}
            pathname={pathname}
          />
          <NavGroup
            label={copy.groupAccount}
            items={accountItems}
            pathname={pathname}
          />
        </SidebarContent>

        <SidebarFooter>
          <StaleBanner items={staleConnections} />
          <SidebarMenu className="group-data-[collapsible=icon]:items-center">
            <SidebarMenuItem>
              <DropdownMenu>
                {/* Plain trigger, not asChild: composing Base UI's Menu.Trigger
                    through SidebarMenuButton's render chain swallowed the
                    open/close handlers — the menu never opened. Styled to match
                    SidebarMenuButton. */}
                <DropdownMenuTrigger
                  aria-label={copy.profileMenu}
                  className="flex h-12 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-hidden ring-sidebar-ring transition-[width,height,padding] duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0.5!"
                >
                  <Avatar className="size-8 shrink-0 group-data-[collapsible=icon]:size-7">
                    <AvatarFallback className="bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={`grid min-w-0 flex-1 text-left text-sm leading-tight ${fadeLabel}`}
                  >
                    <span className="truncate font-medium">{userLabel}</span>
                    {userLabel !== userEmail && (
                      <span className="truncate text-xs text-sidebar-foreground/60">
                        {userEmail}
                      </span>
                    )}
                  </span>
                  <RiExpandUpDownLine
                    className={`ml-auto size-4 shrink-0 text-sidebar-foreground/60 ${fadeLabel}`}
                  />
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
              <span
                role="tooltip"
                className="pointer-events-none absolute top-1/2 left-[calc(100%+0.5rem)] z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-lg group-data-[collapsible=icon]:group-hover/menu-item:block"
              >
                {copy.profileMenu}
              </span>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
    </TooltipProvider>
  );
}
