import {
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  History,
  LayoutGrid,
  Link2,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Plug,
  Plus,
  Settings,
  Sparkles,
  SquarePen,
  Users,
  X,
  type LucideProps,
} from "lucide-react";

/**
 * Single integration point for the icon set (lucide-react, ISC license).
 * Re-exported under semantic names so callers depend on what the icon means
 * here, not which library drew it.
 */
function withDefaultStroke(Icon: typeof Plus) {
  return function BoundIcon(props: LucideProps) {
    return <Icon strokeWidth={1.8} {...props} />;
  };
}

export const IconOverview = withDefaultStroke(LayoutGrid);
export const IconWorkers = withDefaultStroke(Users);
export const IconChat = withDefaultStroke(MessageSquare);
export const IconConnectors = withDefaultStroke(Plug);
export const IconSettings = withDefaultStroke(Settings);
export const IconPlus = withDefaultStroke(Plus);
export const IconChevronLeft = withDefaultStroke(ChevronLeft);
export const IconChevronRight = withDefaultStroke(ChevronRight);
export const IconChevronDown = withDefaultStroke(ChevronDown);
export const IconMenu = withDefaultStroke(Menu);
export const IconBook = withDefaultStroke(BookOpen);
export const IconSparkle = withDefaultStroke(Sparkles);
export const IconLogOut = withDefaultStroke(LogOut);
export const IconClose = withDefaultStroke(X);
export const IconLink = withDefaultStroke(Link2);
export const IconCopy = withDefaultStroke(Copy);
export const IconExternalLink = withDefaultStroke(ExternalLink);
export const IconCheck = withDefaultStroke(Check);
export const IconFeedback = withDefaultStroke(Megaphone);
export const IconSend = withDefaultStroke(ArrowUp);
export const IconHistory = withDefaultStroke(History);
export const IconNewChat = withDefaultStroke(SquarePen);

export type { LucideProps as IconProps };
