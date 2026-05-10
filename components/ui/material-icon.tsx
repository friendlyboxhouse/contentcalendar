import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BellOff,
  Bolt,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CirclePlus,
  ClipboardList,
  Clock,
  CloudCheck,
  CloudOff,
  CloudUpload,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FilePlus,
  FileText,
  FilterX,
  Flag,
  Hourglass,
  History,
  Home,
  KanbanSquare,
  Info,
  Keyboard,
  Layers3,
  LayoutDashboard,
  LayoutGrid,
  Lightbulb,
  Link,
  ListChecks,
  Loader2,
  LogIn,
  LogOut,
  MailCheck,
  MessageSquarePlus,
  Moon,
  MoreHorizontal,
  NotebookPen,
  Palette,
  Plus,
  RefreshCcw,
  RotateCcw,
  Rocket,
  Save,
  ScrollText,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Star,
  Sun,
  Target,
  Trash2,
  User,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";

type Props = {
  name: string;
  className?: string;
  filled?: boolean;
  /** Optical size in px (Material Symbols variable font) */
  size?: number;
  label?: string;
};

type IconComponent = LucideIcon;

const MATERIAL_ICON_MAP: Record<string, IconComponent> = {
  add: Plus,
  add_circle: CirclePlus,
  add_comment: MessageSquarePlus,
  admin_panel_settings: ShieldCheck,
  analytics: BarChart3,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  assignment: ClipboardList,
  auto_awesome: Sparkles,
  bar_chart: BarChart3,
  bolt: Bolt,
  calendar_month: Calendar,
  calendar: Calendar,
  category: LayoutGrid,
  chart: BarChart3,
  check: Check,
  check_circle: CheckCircle2,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  close: X,
  clock: Clock,
  cloud_done: CloudCheck,
  cloud_off: CloudOff,
  cloud_sync: CloudUpload,
  content_copy: Copy,
  dark_mode: Moon,
  dashboard: LayoutDashboard,
  delete: Trash2,
  description: FileText,
  error_outline: AlertCircle,
  event_available: CalendarCheck,
  expand_less: ChevronUp,
  expand_more: ChevronDown,
  fact_check: ListChecks,
  file_download: Download,
  filter_alt_off: FilterX,
  flag: Flag,
  gpp_maybe: ShieldAlert,
  group: Users,
  groups: Users,
  history: History,
  history_edu: ScrollText,
  home: Home,
  hourglass: Hourglass,
  info: Info,
  keyboard: Keyboard,
  light_mode: Sun,
  link: Link,
  lightbulb: Lightbulb,
  layers: Layers3,
  login: LogIn,
  logout: LogOut,
  mark_email_read: MailCheck,
  menu_book: FileText,
  more_horiz: MoreHorizontal,
  edit_note: NotebookPen,
  open_in_new: ExternalLink,
  person: User,
  person_add: UserPlus,
  person_remove: UserMinus,
  palette: Palette,
  picture_as_pdf: FileText,
  post_add: FilePlus,
  progress_activity: Loader2,
  refresh: RefreshCcw,
  restart_alt: RotateCcw,
  rocket: Rocket,
  save: Save,
  schedule: Clock,
  search: Search,
  send: Send,
  sentiment_satisfied: Smile,
  settings: Settings,
  shield_person: ShieldCheck,
  snooze: BellOff,
  spa: Sparkles,
  star: Star,
  timeline: Activity,
  track_changes: Target,
  tune: SlidersHorizontal,
  view_kanban: KanbanSquare,
  visibility: Eye,
  warning: AlertTriangle,
};

const warnedMissing = new Set<string>();

export const MATERIAL_ICON_NAMES = Object.keys(MATERIAL_ICON_MAP).sort();

export function MaterialIcon({
  name,
  className,
  filled = false,
  size = 20,
  label,
}: Props) {
  const Icon = MATERIAL_ICON_MAP[name];

  if (!Icon) {
    if (
      process.env.NODE_ENV !== "production" &&
      !warnedMissing.has(name)
    ) {
      warnedMissing.add(name);
      console.warn(`[MaterialIcon] Missing icon mapping for "${name}"`);
    }
    return (
      <span
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className={cn(
          "inline-flex min-w-8 items-center justify-center rounded border border-dashed border-border px-1 text-[10px] leading-none text-muted-foreground",
          className
        )}
      >
        [{name}]
      </span>
    );
  }

  const iconClassName = cn(
    name === "progress_activity" && "animate-spin",
    filled && "fill-current",
    className
  );

  return (
    <Icon
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      size={size}
      strokeWidth={filled ? 2.4 : 2}
      className={iconClassName}
    />
  );
}
