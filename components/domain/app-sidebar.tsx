"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartLineUpIcon,
  GearSixIcon,
  HouseIcon,
  SignOutIcon,
} from "@phosphor-icons/react";

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
import { LogoMark, LogoWordmark } from "@/components/domain/logo";
import { logout } from "@/lib/auth/actions";

const copy = {
  brand: "Denarius",
  groupCockpit: "Cockpit",
  groupAccount: "Conta",
  home: "Início",
  explore: "Explorar",
  settings: "Ajustes",
  logout: "Sair",
};

const cockpitItems = [
  { title: copy.home, href: "/", icon: HouseIcon },
  { title: copy.explore, href: "/explorar", icon: ChartLineUpIcon },
];

const accountItems = [{ title: copy.settings, href: "/ajustes", icon: GearSixIcon }];

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

export function AppSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    // This shadcn sidebar version doesn't ship a TooltipProvider inside
    // SidebarProvider; SidebarMenuButton's tooltip requires one.
    <TooltipProvider delayDuration={0}>
      <Sidebar collapsible="icon">
      <SidebarHeader>
        {/* Plain Link, NOT SidebarMenuButton: the button variant forces
            [&_svg]:size-4 on every descendant svg, which would crush the wide
            wordmark (2041×408 viewBox) into a 16px box. SidebarHeader itself
            has no svg sizing rule, so the logo keeps its aspect ratio here. */}
        <Link
          href="/"
          aria-label={copy.brand}
          className="flex h-10 items-center rounded-md px-2 transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          {/* Expanded: the full wordmark (coin accent + letters). */}
          <LogoWordmark className="h-6 w-auto group-data-[collapsible=icon]:hidden" />
          {/* Collapsed: just the coin, in the brand accent. */}
          <LogoMark className="hidden size-6 shrink-0 text-[#FF5100] group-data-[collapsible=icon]:block" />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup label={copy.groupCockpit} items={cockpitItems} pathname={pathname} />
        <NavGroup label={copy.groupAccount} items={accountItems} pathname={pathname} />
      </SidebarContent>

      <SidebarFooter>
        <div className="truncate px-2 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          {userEmail}
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <form action={logout}>
              <SidebarMenuButton type="submit" tooltip={copy.logout}>
                <SignOutIcon />
                <span>{copy.logout}</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

        <SidebarRail />
      </Sidebar>
    </TooltipProvider>
  );
}
