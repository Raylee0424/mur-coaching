import {
  Calculator,
  CreditCard,
  CalendarCheck,
  CalendarRange,
  Dumbbell,
  History,
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
};
