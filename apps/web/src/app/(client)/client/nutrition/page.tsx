import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { NUTRITION_LIMITS, Role } from '@coaching/shared';
import { DailyTargets, MicroHighlights } from '@/components/nutrition/DayPanels';
import { EditTargetsButton, FoodLogTable, WaterTracker } from '@/components/nutrition/DayControls';
import { LogFoodButton } from '@/components/nutrition/LogFoodSheet';
import { dayStamp, dayTotals, shiftDate } from '@/components/nutrition/nutrition-model';
import { buttonClass } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { nutritionApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function NutritionPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireUser(Role.CLIENT);
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = shiftDate(today, 1);
  const { date: raw } = await searchParams;
  const date = raw && ISO.test(raw) && !Number.isNaN(Date.parse(raw)) && raw <= tomorrow ? raw : today;
  const day = await nutritionApi.day(date);
  const totals = dayTotals(day.entries);
  const prev = shiftDate(date, -1);
  const next = shiftDate(date, 1);

  return (
    <>
      <PageHeader
        title="Nutrition, Micronutrients & Hydration"
        meta={<span className="font-mono">{dayStamp(date)}</span>}
        actions={
          <>
            <Link href="/client/nutrition/plans" className={buttonClass('secondary', 'hidden sm:inline-flex', 'sm')}>
              Meal Plans &amp; Templates
            </Link>
            <LogFoodButton date={date} />
          </>
        }
      />

      <div className="space-y-6">
        <nav aria-label="Day" className="flex items-center gap-2">
          <Link href={`/client/nutrition?date=${prev}`} className={buttonClass('ghost', 'w-9 px-0', 'sm')} aria-label={`Previous day, ${dayStamp(prev)}`}>
            <Icon icon={ChevronLeft} />
          </Link>
          <span className="font-mono text-label-md text-ink">{date === today ? 'Today' : dayStamp(date)}</span>
          {next <= tomorrow && date !== today ? (
            <Link href={`/client/nutrition?date=${next}`} className={buttonClass('ghost', 'w-9 px-0', 'sm')} aria-label={`Next day, ${dayStamp(next)}`}>
              <Icon icon={ChevronRight} />
            </Link>
          ) : null}
          {date !== today ? (
            <Link href="/client/nutrition" className="font-sans text-label-sm font-semibold text-primary hover:underline">
              Back to today
            </Link>
          ) : null}
          <Link href="/client/nutrition/plans" className="ml-auto font-sans text-label-sm font-semibold text-primary hover:underline sm:hidden">
            Plans &amp; templates
          </Link>
        </nav>

        <DailyTargets totals={totals} target={day.target} actions={<EditTargetsButton target={day.target} canEdit={day.canEditTarget} />} />

        <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <Panel
            title="Logged Foods"
            meta={`${day.entries.length} ${day.entries.length === 1 ? 'entry' : 'entries'}`}
            className="lg:col-span-8"
          >
            <FoodLogTable entries={day.entries} editable />
          </Panel>

          <div className="flex flex-col gap-6 lg:col-span-4">
            <WaterTracker date={date} water={day.water} targetMl={day.target?.waterMl ?? NUTRITION_LIMITS.defaultWaterMl} />
            <MicroHighlights totals={totals} target={day.target} />
          </div>
        </section>
      </div>
    </>
  );
}
