import {
  Calculator,
  CreditCard,
  CalendarCheck,
  CalendarRange,
  Dumbbell,
  FolderOpen,
  History,
  Inbox,
  ListChecks,
  SlidersHorizontal,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { NavIconKey } from '@/lib/routes';

export const NAV_ICONS: Record<NavIconKey, LucideIcon> = {
  users: Users,
  queue: ListChecks,
  dumbbell: Dumbbell,
  'calendar-range': CalendarRange,
  sliders: SlidersHorizontal,
  today: CalendarCheck,
  history: History,
  tools: Calculator,
  user: UserRound,
  billing: CreditCard,
  inbox: Inbox,
  folder: FolderOpen,
};
