"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconSelector,
  IconChartLine,
  IconSettings,
  IconHome,
  IconLogout,
  IconUserCircle,
} from "@tabler/icons-react";

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
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { logout } from "@/lib/auth/actions";

const copy = {
  brand: "Denarius",
  groupCockpit: "Cockpit",
  groupAccount: "Conta",
  home: "Início",
  explore: "Explorar",
  settings: "Ajustes",
  profileMenu: "Perfil",
  profileSettings: "Configurações",
  logout: "Sair",
};

const cockpitItems = [
  { title: copy.home, href: "/", icon: IconHome },
  { title: copy.explore, href: "/explorar", icon: IconChartLine },
];

const accountItems = [
  { title: copy.settings, href: "/ajustes", icon: IconSettings },
];

type NavItem = (typeof cockpitItems)[number];

// "/" only matches exactly; sections stay lit on their subroutes
// (/explorar/time/[id] keeps Explorar active).
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
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActivePath(pathname, item.href)}
                tooltip={item.title}
                className="h-9 gap-2.5 px-2.5 [&_svg]:size-4.5"
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.title}</span>
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

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-3 pt-3">
          <Link
            href="/"
            aria-label={copy.brand}
            className="flex h-11 items-center rounded-md px-1.5 transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          >
            <LogoWordmark className="h-7 w-auto group-data-[collapsible=icon]:hidden" />
            <LogoMark className="hidden size-7 shrink-0 text-[#FF5100] group-data-[collapsible=icon]:block" />
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
                  <IconSelector className="ml-auto size-4 shrink-0 text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden" />
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
                        <span className="truncate text-xs font-normal text-muted-foreground">
                          {userEmail}
                        </span>
                      )}
                    </span>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="h-9">
                    <Link href="/configuracoes">
                      <IconUserCircle />
                      <span>{copy.profileSettings}</span>
                    </Link>
                  </DropdownMenuItem>
                  <form action={logout}>
                    <DropdownMenuItem
                      asChild
                      variant="destructive"
                      className="h-9"
                    >
                      <button type="submit" className="w-full">
                        <IconLogout />
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
