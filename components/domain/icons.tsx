import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  AiChipIcon,
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowLeftRightIcon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  BarChartHorizontalIcon,
  BalanceScaleIcon,
  BrainCircuitIcon,
  Building01Icon,
  Cancel01Icon,
  CancelCircleIcon,
  ChartLineIcon,
  CheckIcon,
  CheckmarkCircle01Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleArrowDown01Icon,
  CircleArrowUp01Icon,
  CompassIcon,
  ComputerIcon,
  ContactBookIcon,
  Coins01Icon,
  CopyIcon,
  DashboardCircleIcon,
  Delete01Icon,
  Download01Icon,
  EyeIcon,
  EyeOffIcon,
  FileChartLineIcon,
  FileTextIcon,
  HistoryIcon,
  Home05Icon,
  InformationCircleIcon,
  Key02Icon,
  LightbulbIcon,
  LinkIcon,
  ListIcon,
  LockIcon,
  Logout01Icon,
  Mail01Icon,
  MailSend01Icon,
  MailXIcon,
  Menu01Icon,
  Moon01Icon,
  More01Icon,
  Notification01Icon,
  PencilIcon,
  PieChart01Icon,
  PieChart02Icon,
  PlugIcon,
  PrinterIcon,
  Refresh01Icon,
  Search01Icon,
  Settings03Icon,
  ShieldCheckIcon,
  ShieldKeyIcon,
  SidebarLeftIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  Sun01Icon,
  Tag01Icon,
  Time01Icon,
  ToolsIcon,
  Unlink01Icon,
  UserCogIcon,
  UserGroupIcon,
  UserIcon,
  UserMinus01Icon,
  UserSettings01Icon,
  Wallet03Icon,
  ChevronsDownUpIcon,
} from "@hugeicons/core-free-icons";
import type { ComponentType } from "react";
import type { HugeiconsProps, IconSvgElement } from "@hugeicons/react";

export type AppIconProps = Omit<HugeiconsProps, "icon">;
export type AppIcon = ComponentType<AppIconProps>;

function createAppIcon(icon: IconSvgElement): AppIcon {
  return function AppIcon({ size = 24, strokeWidth = 1.75, ...props }) {
    return <HugeiconsIcon icon={icon} size={size} strokeWidth={strokeWidth} {...props} />;
  };
}

// Keep icon names local to the app so the underlying icon library can evolve
// without spreading a vendor API through every screen and primitive.
export const RiAddLine = createAppIcon(Add01Icon);
export const RiAdminLine = createAppIcon(UserCogIcon);
export const RiAnthropicFill = createAppIcon(BrainCircuitIcon);
export const RiArrowDownCircleFill = createAppIcon(CircleArrowDown01Icon);
export const RiArrowDownLine = createAppIcon(ArrowDown01Icon);
export const RiArrowDownSLine = createAppIcon(ChevronDownIcon);
export const RiArrowLeftLine = createAppIcon(ArrowLeft01Icon);
export const RiArrowLeftSLine = createAppIcon(ChevronLeftIcon);
export const RiArrowLeftRightLine = createAppIcon(ArrowLeftRightIcon);
export const RiArrowRightLine = createAppIcon(ArrowRight01Icon);
export const RiArrowRightSLine = createAppIcon(ChevronRightIcon);
export const RiArrowUpCircleFill = createAppIcon(CircleArrowUp01Icon);
export const RiArrowUpDownLine = createAppIcon(ArrowUpDownIcon);
export const RiArrowUpLine = createAppIcon(ArrowUp01Icon);
export const RiArrowUpSLine = createAppIcon(ChevronUpIcon);
export const RiBarChartHorizontalLine = createAppIcon(BarChartHorizontalIcon);
export const RiBuildingLine = createAppIcon(Building01Icon);
export const RiCheckboxCircleFill = createAppIcon(CheckmarkCircle01Icon);
export const RiCheckboxCircleLine = createAppIcon(CheckmarkCircle01Icon);
export const RiCheckLine = createAppIcon(CheckIcon);
export const RiCloseCircleFill = createAppIcon(CancelCircleIcon);
export const RiCloseLine = createAppIcon(Cancel01Icon);
export const RiCoinsLine = createAppIcon(Coins01Icon);
export const RiCompass3Line = createAppIcon(CompassIcon);
export const RiComputerLine = createAppIcon(ComputerIcon);
export const RiContactsBookLine = createAppIcon(ContactBookIcon);
export const RiDashboard3Line = createAppIcon(DashboardCircleIcon);
export const RiDeleteBinLine = createAppIcon(Delete01Icon);
export const RiDownload2Line = createAppIcon(Download01Icon);
export const RiDownloadLine = createAppIcon(Download01Icon);
export const RiEqualizer2Line = createAppIcon(SlidersHorizontalIcon);
export const RiErrorWarningFill = createAppIcon(AlertCircleIcon);
export const RiErrorWarningLine = createAppIcon(AlertCircleIcon);
export const RiExpandUpDownLine = createAppIcon(ChevronsDownUpIcon);
export const RiEyeLine = createAppIcon(EyeIcon);
export const RiEyeOffLine = createAppIcon(EyeOffIcon);
export const RiFileChartLine = createAppIcon(FileChartLineIcon);
export const RiFileCopyLine = createAppIcon(CopyIcon);
export const RiFileList3Line = createAppIcon(ListIcon);
export const RiFileTextLine = createAppIcon(FileTextIcon);
export const RiGroupLine = createAppIcon(UserGroupIcon);
export const RiHistoryLine = createAppIcon(HistoryIcon);
export const RiHome5Line = createAppIcon(Home05Icon);
export const RiInformationLine = createAppIcon(InformationCircleIcon);
export const RiKey2Line = createAppIcon(Key02Icon);
export const RiLightbulbLine = createAppIcon(LightbulbIcon);
export const RiLineChartLine = createAppIcon(ChartLineIcon);
export const RiLinkUnlink = createAppIcon(Unlink01Icon);
export const RiLinksLine = createAppIcon(LinkIcon);
export const RiLockLine = createAppIcon(LockIcon);
export const RiLogoutBoxRLine = createAppIcon(Logout01Icon);
export const RiMailCloseLine = createAppIcon(MailXIcon);
export const RiMailLine = createAppIcon(Mail01Icon);
export const RiMailSendLine = createAppIcon(MailSend01Icon);
export const RiMenuLine = createAppIcon(Menu01Icon);
export const RiMoonLine = createAppIcon(Moon01Icon);
export const RiMore2Fill = createAppIcon(More01Icon);
export const RiNotification3Line = createAppIcon(Notification01Icon);
export const RiOpenaiFill = createAppIcon(AiChipIcon);
export const RiPencilLine = createAppIcon(PencilIcon);
export const RiPieChart2Line = createAppIcon(PieChart02Icon);
export const RiPieChartLine = createAppIcon(PieChart01Icon);
export const RiPlugLine = createAppIcon(PlugIcon);
export const RiPriceTag3Line = createAppIcon(Tag01Icon);
export const RiPrinterLine = createAppIcon(PrinterIcon);
export const RiRefreshLine = createAppIcon(Refresh01Icon);
export const RiScales3Line = createAppIcon(BalanceScaleIcon);
export const RiSearchLine = createAppIcon(Search01Icon);
export const RiSettings3Line = createAppIcon(Settings03Icon);
export const RiShieldCheckLine = createAppIcon(ShieldCheckIcon);
export const RiShieldKeyholeLine = createAppIcon(ShieldKeyIcon);
export const RiSidebarFoldLine = createAppIcon(SidebarLeftIcon);
export const RiSparkling2Line = createAppIcon(SparklesIcon);
export const RiSparklingLine = createAppIcon(SparklesIcon);
export const RiSunLine = createAppIcon(Sun01Icon);
export const RiTeamLine = createAppIcon(UserGroupIcon);
export const RiTimeFill = createAppIcon(Time01Icon);
export const RiTimeLine = createAppIcon(Time01Icon);
export const RiToolsLine = createAppIcon(ToolsIcon);
export const RiUserLine = createAppIcon(UserIcon);
export const RiUserSettingsLine = createAppIcon(UserSettings01Icon);
export const RiUserUnfollowLine = createAppIcon(UserMinus01Icon);
export const RiWallet3Line = createAppIcon(Wallet03Icon);
