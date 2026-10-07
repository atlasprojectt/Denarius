"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUpDownIcon,
  ArrowUpRight01Icon,
  Cancel01Icon,
  ChartLineIcon,
  FileChartLineIcon,
  HelpCircleIcon,
  Home05Icon,
  Logout02Icon,
  Search01Icon,
  Settings03Icon,
  UserIcon,
  UsersIcon,
} from "@hugeicons/core-free-icons";

import { AllClear } from "@/components/domain/all-clear";
import { ConfirmationDialog } from "@/components/domain/confirmation-dialog";
import { LogoMark, LogoWordmark } from "@/components/domain/logo";
import {
  NavGroup,
  type SidebarNavGroup,
} from "@/components/domain/nav-group";
import { StaleBanner } from "@/components/domain/stale-banner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { logout } from "@/lib/auth/actions";
import type { ConnectionFreshness } from "@/lib/engine/freshness";
import { closingCardState } from "@/lib/reports/closing";
import {
  newestUnseenPeriod,
  parseSeenPeriods,
  REPORTS_SEEN_EVENT,
  REPORTS_SEEN_KEY,
} from "@/lib/reports/seen";
import { SEARCH_OPEN_EVENT } from "@/lib/search/shortcut";

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
  explore: "Composição",
  reports: "Relatórios",
  reportsNew: "Novo relatório de fechamento disponível",
  search: "Pesquisa",
  searchShortcut: "Ctrl P",
  settings: "Ajustes",
  profileMenu: "Perfil",
  profileSettings: "Preferências",
  support: "Ajuda e suporte",
  supportHint: "(abre o Gmail em uma nova aba)",
  logout: "Sair",
  logoutTitle: "Sair do Denarius?",
  logoutDescription:
    "Você precisará entrar novamente para acessar os dados da sua empresa.",
  logoutConfirm: "Sair",
  logoutPending: "Saindo…",
  closeMenu: "Fechar menu",
};

const navigation: { label: string; items: { title: string; path: string; icon: React.ReactNode }[] }[] = [
  {
    label: copy.groupCockpit,
    items: [
      { title: copy.home, path: "/", icon: <HugeiconsIcon icon={Home05Icon} /> },
      { title: copy.teams, path: "/times", icon: <HugeiconsIcon icon={UsersIcon} /> },
      { title: copy.explore, path: "/explorar", icon: <HugeiconsIcon icon={ChartLineIcon} /> },
      { title: copy.reports, path: "/relatorios", icon: <HugeiconsIcon icon={FileChartLineIcon} /> },
    ],
  },
  {
    label: copy.groupAccount,
    items: [{ title: copy.settings, path: "/ajustes", icon: <HugeiconsIcon icon={Settings03Icon} /> }],
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

// Browser-only "new closing" hint: the server hands over the newest frozen
// month and the client shows the dot only while that month is still featured
// (the five-day spotlight) and unseen — nothing renders until after mount,
// so there is no hydration mismatch.
function useNewReportBadge(latestPeriodPath: string | null): boolean {
  const [unseen, setUnseen] = useState<string | null>(null);
  const [featured, setFeatured] = useState(false);
  useEffect(() => {
    function refresh() {
      const state = closingCardState(
        new Date(),
        latestPeriodPath ? [`${latestPeriodPath}-01`] : [],
      );
      setFeatured(
        state.mode === "featured" && state.periodPath === latestPeriodPath,
      );
      setUnseen(
        newestUnseenPeriod(
          latestPeriodPath,
          parseSeenPeriods(window.localStorage.getItem(REPORTS_SEEN_KEY)),
        ),
      );
    }
    refresh();
    window.addEventListener(REPORTS_SEEN_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(REPORTS_SEEN_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [latestPeriodPath]);
  return featured && unseen !== null;
}

export function AppSidebar({
  userEmail,
  userInitials,
  userLabel,
  userAvatarUrl,
  staleConnections,
  allClear,
  latestReportPeriod,
}: {
  userEmail: string;
  userInitials: string;
  userLabel: string;
  userAvatarUrl: string | null;
  staleConnections: ConnectionFreshness[];
  allClear: boolean;
  latestReportPeriod: string | null;
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const hasNewReport = useNewReportBadge(latestReportPeriod);
  const [logoutOpen, setLogoutOpen] = useState(false);

  function openSearch() {
    setOpenMobile(false);
    window.dispatchEvent(new Event(SEARCH_OPEN_EVENT));
  }

  const navGroups: SidebarNavGroup[] = navigation.map((group) => ({
    label: group.label,
    items: group.items.map((item) => ({
      ...item,
      isActive: isActivePath(pathname, item.path),
      badge: item.path === "/relatorios" && hasNewReport,
      badgeLabel: item.path === "/relatorios" ? copy.reportsNew : undefined,
    })),
  }));

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="relative h-14 justify-center">
          {/* Wordmark ↔ coin crossfade: both stay mounted (the Link's
              overflow-hidden clips the wordmark as the rail closes) so the swap
              fades instead of jump-cutting, on the same clock as the collapse.
              The size classes carry `!` because sidebarMenuButtonVariants'
              `[&_svg]:size-4` is a descendant variant and out-specifies a plain
              utility — without it the lockup renders at 16px. */}
          <SidebarMenuButton
            asChild
            className="h-11 pr-12 md:h-10 md:pr-2 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!"
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={copy.closeMenu}
            onClick={() => setOpenMobile(false)}
            className="absolute top-1.5 right-2 size-11 md:hidden"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
          </Button>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="pb-2 pt-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={copy.search}
                  className="h-11 rounded-md border border-sidebar-border/50 bg-surface-canvas px-3 text-ink-secondary shadow-none hover:bg-sidebar-hover hover:text-sidebar-accent-foreground md:h-9 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:px-2"
                >
                  <button
                    type="button"
                    onClick={openSearch}
                    aria-label={`${copy.search} (${copy.searchShortcut})`}
                  >
                    <HugeiconsIcon icon={Search01Icon} />
                    <span className="truncate">{copy.search}</span>
                    <kbd className="ml-auto font-sans text-2xs font-medium leading-none text-sidebar-ink-subtle group-data-[collapsible=icon]:hidden">
                      {copy.searchShortcut}
                    </kbd>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
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
                    {userAvatarUrl && <AvatarImage src={userAvatarUrl} alt="" />}
                    <AvatarFallback className="bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="grid min-w-0 flex-1 text-left leading-tight">
                    <span className="truncate font-medium">{userLabel}</span>
                    {userLabel !== userEmail && (
                      <span className="truncate text-xs text-sidebar-ink-subtle">
                        {userEmail}
                      </span>
                    )}
                  </span>
                  <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-auto text-ink-faint" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="right"
                  align="end"
                  sideOffset={10}
                  className="w-64"
                >
                  {/* Identity header as a plain div: Base UI's GroupLabel
                      (DropdownMenuLabel) throws outside <Menu.Group>, which
                      crashed this menu the moment it opened. */}
                  <div className="flex items-center gap-3 px-2 py-2">
                    <Avatar className="size-8">
                      {userAvatarUrl && <AvatarImage src={userAvatarUrl} alt="" />}
                      <AvatarFallback className="text-xs font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="grid min-w-0 leading-tight">
                      <span className="truncate text-sm font-medium text-foreground">
                        {userLabel}
                      </span>
                      {userLabel !== userEmail && (
                        <span className="break-all text-xs text-muted-foreground">
                          {userEmail}
                        </span>
                      )}
                    </span>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="h-9">
                    <Link href="/preferencias">
                      <HugeiconsIcon icon={UserIcon} />
                      <span>{copy.profileSettings}</span>
                    </Link>
                  </DropdownMenuItem>
                  {/* A plain anchor, not next/link: /suporte is a route
                      handler that redirects to Gmail, so it opens in its own
                      tab and the user keeps their place in the app. */}
                  <DropdownMenuItem asChild className="h-9">
                    <a href="/suporte" target="_blank" rel="noopener noreferrer">
                      <HugeiconsIcon icon={HelpCircleIcon} />
                      <span>{copy.support}</span>
                      <span className="sr-only">{copy.supportHint}</span>
                      <HugeiconsIcon
                        icon={ArrowUpRight01Icon}
                        aria-hidden
                        className="ml-auto text-muted-foreground"
                      />
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    asChild
                    variant="destructive"
                    className="h-9"
                  >
                    <button
                      type="button"
                      className="w-full"
                      onClick={() => setLogoutOpen(true)}
                    >
                      <HugeiconsIcon icon={Logout02Icon} />
                      <span>{copy.logout}</span>
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ConfirmationDialog
                open={logoutOpen}
                onOpenChange={setLogoutOpen}
                title={copy.logoutTitle}
                description={copy.logoutDescription}
                confirmLabel={copy.logoutConfirm}
                pendingLabel={copy.logoutPending}
                action={logout}
                icon={<HugeiconsIcon icon={Logout02Icon} />}
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail
          aria-label="Alternar menu lateral"
          title="Alternar menu lateral"
        />
      </Sidebar>
    </TooltipProvider>
  );
}
