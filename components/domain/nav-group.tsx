"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { RiArrowRightSLine } from "@remixicon/react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

// Sidebar nav engine, from the shadcn block @efferd/app-shell-3 (2026-08-02,
// founder-directed). Kept as the block ships it — a labelled group of items,
// each either a plain destination or a collapsible parent with sub-items — so
// the collapse/expand choreography stays the primitive's native one. The app's
// destinations live in AppSidebar; this file only renders them.

export type SidebarNavItem = {
  title: string;
  path?: string;
  icon?: ReactNode;
  isActive?: boolean;
  subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
  label?: string;
  items: SidebarNavItem[];
};

export function NavGroup({ label, items }: SidebarNavGroup) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      {/* On the collapsed rail the primitive hides the label with `-mt-8
          opacity-0` but leaves it in flow, hovering OVER the first menu item
          and swallowing its clicks and tooltip hovers (2026-07-11 audit). */}
      {label && (
        <SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarMenu>
        {items.map((item) =>
          // Only a parent gets the Collapsible wrapper. The block wraps every
          // item, but `defaultOpen` then changes on each client navigation (it
          // is derived from isActive) and Base UI warns about an uncontrolled
          // Collapsible whose default moved after mount.
          item.subItems?.length ? (
            <Collapsible
              key={item.title}
              className="group/collapsible"
              defaultOpen={
                !!item.isActive || item.subItems.some((i) => !!i.isActive)
              }
              render={<SidebarMenuItem />}
            >
              <CollapsibleTrigger
                render={
                  <SidebarMenuButton
                    isActive={item.isActive}
                    tooltip={item.title}
                    className="h-11 text-sidebar-foreground/70 hover:text-sidebar-accent-foreground data-active:text-sidebar-accent-foreground md:h-8"
                  />
                }
              >
                {item.icon}
                <span>{item.title}</span>
                <RiArrowRightSLine className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.subItems.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild isActive={subItem.isActive}>
                        <Link
                          href={subItem.path ?? "#"}
                          onClick={() => setOpenMobile(false)}
                          className="min-h-11 md:min-h-0"
                        >
                          {subItem.icon}
                          <span>{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={item.isActive}
                tooltip={item.title}
                className="h-11 text-sidebar-foreground/70 hover:text-sidebar-accent-foreground data-active:text-sidebar-accent-foreground md:h-8"
              >
                <Link
                  href={item.path ?? "#"}
                  onClick={() => setOpenMobile(false)}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
