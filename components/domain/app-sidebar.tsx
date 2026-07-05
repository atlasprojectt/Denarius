"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CaretUpDownIcon,
  ChartLineUpIcon,
  GearSixIcon,
  HouseIcon,
  SignOutIcon,
} from "@phosphor-icons/react";

import { LogoMark, LogoWordmark } from "@/components/domain/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  { title: copy.home, href: "/", icon: HouseIcon },
  { title: copy.explore, href: "/explorar", icon: ChartLineUpIcon },
];

const accountItems = [
  { title: copy.settings, href: "/ajustes", icon: GearSixIcon },
];

type NavItem = (typeof cockpitItems)[number];

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
                isActive={pathname === item.href}
                tooltip={item.title}
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
        <SidebarHeader>
          <Link
            href="/"
            aria-label={copy.brand}
            className="flex h-10 items-center rounded-md px-2 transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          >
            <LogoWordmark className="h-6 w-auto group-data-[collapsible=icon]:hidden" />
            <LogoMark className="hidden size-6 shrink-0 text-[#FF5100] group-data-[collapsible=icon]:block" />
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
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    className="h-12"
                    tooltip={copy.profileMenu}
                  >
                    <Avatar size="sm" className="size-6">
                      <AvatarFallback className="bg-sidebar-accent text-[10px] font-semibold text-sidebar-accent-foreground">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{userLabel}</span>
                      {userLabel !== userEmail && (
                        <span className="truncate text-sidebar-foreground/60">
                          {userEmail}
                        </span>
                      )}
                    </span>
                    <CaretUpDownIcon className="ml-auto text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="right"
                  align="end"
                  className="w-56 p-1"
                >
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="truncate font-medium text-foreground">
                      {userLabel}
                    </span>
                    <span className="truncate">{userEmail}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/configuracoes">
                      <GearSixIcon />
                      <span>{copy.profileSettings}</span>
                    </Link>
                  </DropdownMenuItem>
                  <form action={logout}>
                    <DropdownMenuItem asChild variant="destructive">
                      <button type="submit" className="w-full">
                        <SignOutIcon />
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
