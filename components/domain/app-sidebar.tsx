"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RiExpandUpDownLine,
  RiLineChartLine,
  RiSettings3Line,
  RiHome5Line,
  RiLogoutBoxRLine,
  RiUserLine,
} from "@remixicon/react";

import { LogoMark, LogoWordmark } from "@/components/domain/logo";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { logout } from "@/lib/auth/actions";

const copy = {
  brand: "Denarius",
  groupCockpit: "Cockpit",
  home: "Início",
  explore: "Explorar",
  settings: "Ajustes",
  profileMenu: "Perfil",
  profileSettings: "Configurações",
  logout: "Sair",
};

const mainItems = [
  { title: copy.home, href: "/", icon: RiHome5Line },
  { title: copy.explore, href: "/explorar", icon: RiLineChartLine },
];

const secondaryItems = [
  { title: copy.settings, href: "/ajustes", icon: RiSettings3Line },
];

type NavItem = (typeof mainItems)[number];

// "/" only matches exactly; sections stay lit on their subroutes
// (/explorar/time/[id] keeps Explorar active).
function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavSection({
  label,
  items,
  pathname,
  className,
}: {
  label?: string;
  items: NavItem[];
  pathname: string;
  className?: string;
}) {
  return (
    <SidebarGroup className={className}>
      {label ? (
        // The collapsed label overlaps the first item unless pointer events
        // are disabled while it fades out.
        <SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">
          {label}
        </SidebarGroupLabel>
      ) : null}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActivePath(pathname, item.href)}
                tooltip={item.title}
                className="h-9 gap-2.5 px-2.5 data-active:font-medium [&_svg]:size-4.5"
              >
                <Link href={item.href} aria-label={item.title}>
                  <item.icon />
                  <span className="group-data-[collapsible=icon]:hidden">
                    {item.title}
                  </span>
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
}: {
  userEmail: string;
  userInitials: string;
  userLabel: string;
}) {
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild tooltip={copy.brand}>
                <Link href="/" aria-label={copy.brand}>
                  <LogoWordmark className="h-7 w-auto text-foreground group-data-[collapsible=icon]:hidden" />
                  <LogoMark className="hidden size-7 shrink-0 text-chart-2 group-data-[collapsible=icon]:block" />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <NavSection
            label={copy.groupCockpit}
            items={mainItems}
            pathname={pathname}
          />
          <NavSection
            className="mt-auto"
            items={secondaryItems}
            pathname={pathname}
          />
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                {/* Plain trigger, not asChild: composing Base UI's Menu.Trigger
                    through SidebarMenuButton's render chain swallowed the
                    open/close handlers — the menu never opened. Styled to match
                    SidebarMenuButton. */}
                <DropdownMenuTrigger
                  aria-label={copy.profileMenu}
                  className="flex h-12 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!"
                >
                  <Avatar className="size-8 shrink-0 group-data-[collapsible=icon]:size-7">
                    <AvatarFallback className="bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-medium">{userLabel}</span>
                    {userLabel !== userEmail && (
                      <span className="truncate text-xs text-sidebar-foreground/60">
                        {userEmail}
                      </span>
                    )}
                  </span>
                  <RiExpandUpDownLine className="ml-auto size-4 shrink-0 text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side={isMobile ? "bottom" : "right"}
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
