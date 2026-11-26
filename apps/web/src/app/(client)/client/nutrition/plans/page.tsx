import clsx from 'clsx';
import Link from 'next/link';
import { Role } from '@coaching/shared';
import type { MealTemplateDto, Nutrients } from '@coaching/shared';
import { DeleteTemplateButton, GroceryChecklist, QuickLogButton, TemplateBuilderButton } from '@/components/nutrition/LibraryControls';
import { LogFoodButton } from '@/components/nutrition/LogFoodSheet';
import { fmt } from '@/components/nutrition/nutrition-model';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { nutritionApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

const TABS = [
  { key: 'plans', label: 'Coach-Assigned Meal Plans' },
  { key: 'templates', label: 'Meal Templates' },
  { key: 'recipes', label: 'Custom Recipes' },
  { key: 'favorites', label: 'Favorites' },
] as const;
type Tab = (typeof TABS)[number]['key'];

/** `780 kcal · 68P / 90C / 9F` */
const macroLine = (n: Nutrients): string => `${fmt(Number(n.kcal))} kcal · ${fmt(Number(n.proteinG))}P / ${fmt(Number(n.carbsG))}C / ${fmt(Number(n.fatG))}F`;

export default async function MealPlansPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireUser(Role.CLIENT);
  const { tab: raw } = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === raw) ? (raw as Tab) : 'plans';
  const today = new Date().toISOString().slice(0, 10);
  const lib = await nutritionApi.library();
  const templates = lib.templates.filter((t) => t.servings === 1);
  const recipes = lib.templates.filter((t) => t.servings > 1);

  return (
    <>
      <PageHeader
        title="Food Templates & Meal Plans"
        back={{ href: '/client/nutrition', label: 'Back to nutrition' }}
        actions={<LogFoodButton date={today} />}
      />

      <div className="flex flex-col gap-6">
        <nav aria-label="Library sections" className="flex items-center gap-6 relative overflow-x-auto border-b border-line">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key === 'plans' ? '/client/nutrition/plans' : `/client/nutrition/plans?tab=${t.key}`}
              aria-current={tab === t.key ? 'page' : undefined}
              className={clsx(
                'whitespace-nowrap border-b-2 pb-3 font-sans text-label-lg transition-colors',
                tab === t.key ? 'border-primary text-ink' : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {tab === 'plans' ? (
          lib.plans.length === 0 ? (
            <EmptyState title="No meal plan yet">Your coach has not assigned a meal plan. Saved meals and recipes live in the other tabs.</EmptyState>
          ) : (
            lib.plans.map((plan) => (
              <section key={plan.id} className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
                <article className="flex flex-col gap-3 rounded-md border border-line bg-card p-6 lg:col-span-7">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-sans text-label-sm uppercase text-primary">Assigned by {plan.coachName}</span>
                    <span className="font-mono text-label-md text-ink">{macroLine(plan.totals)}</span>
                  </div>
                  <h2 className="font-display text-title-lg text-ink">{plan.name}</h2>
                  {plan.notes ? <p className="text-body-md text-muted">{plan.notes}</p> : null}
                  <ul className="divide-y divide-line text-body-md">
                    {plan.meals.map((m, i) => (
                      <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-ink">
                            Meal {i + 1} · {m.name}
                          </p>
                          <p className="font-mono text-label-sm text-muted">{m.items.map((it) => `${it.name} ${fmt(Number(it.grams))} g`).join(' · ')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-label-md text-muted">{fmt(Number(m.totals.kcal))} kcal</span>
                          <QuickLogButton name={m.name} date={today} source={{ kind: 'planMeal', planMealId: m.id }} variant="secondary" />
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
                <aside aria-labelledby={`grocery-${plan.id}`} className="flex flex-col gap-4 rounded-md border border-line bg-card p-6 lg:col-span-5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 id={`grocery-${plan.id}`} className="font-display text-title-md text-ink">
                      Grocery List
                    </h2>
                    <span className="font-mono text-label-sm text-primary">7-day quantities</span>
                  </div>
                  <GroceryChecklist planId={plan.id} items={plan.grocery} />
                </aside>
              </section>
            ))
          )
        ) : null}

        {tab === 'templates' ? <TemplateGrid items={templates} today={today} recipe={false} /> : null}
        {tab === 'recipes' ? <TemplateGrid items={recipes} today={today} recipe /> : null}

        {tab === 'favorites' ? (
          lib.favorites.length === 0 ? (
            <EmptyState title="No favorites yet">Star a food in the Log Food search to keep it here for one-tap logging.</EmptyState>
          ) : (
            <ul className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {lib.favorites.map((f) => {
                const serving = Number(f.servingG);
                const kcal = (Number(f.per100g.kcal) * serving) / 100;
                const protein = (Number(f.per100g.proteinG) * serving) / 100;
                return (
                  <li key={f.id} className="flex items-center justify-between gap-3 rounded-md border border-line bg-card p-5">
                    <div className="min-w-0">
                      <p className="truncate text-label-lg text-ink">
                        {f.name}
                        {f.servingLabel ? ` (${f.servingLabel})` : ''}
                      </p>
                      <p className="font-mono text-label-sm text-muted">
                        {fmt(kcal)} kcal · {fmt(protein)}P
                      </p>
                    </div>
                    <QuickLogButton name={f.name} date={today} source={{ kind: 'food', foodId: f.id, grams: f.servingG }} label="+ Log" />
                  </li>
                );
              })}
            </ul>
          )
        ) : null}
      </div>
    </>
  );
}

function TemplateGrid({ items, today, recipe }: { items: MealTemplateDto[]; today: string; recipe: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <TemplateBuilderButton recipe={recipe} />
      </div>
      {items.length === 0 ? (
        <EmptyState title={recipe ? 'No recipes yet' : 'No meal templates yet'}>
          {recipe ? 'Enter a whole batch once, then log it a serving at a time.' : 'Save a meal you eat often and log every food in one tap.'}
        </EmptyState>
      ) : (
        <ul className={clsx('grid grid-cols-1 gap-5', recipe ? 'md:grid-cols-2' : 'md:grid-cols-3')}>
          {items.map((t) => (
            <li key={t.id} className="flex flex-col gap-2 rounded-md border border-line bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-title-md text-ink">
                  {t.name}
                  {recipe ? ` (${t.servings} servings)` : ''}
                </h3>
                <DeleteTemplateButton id={t.id} name={t.name} />
              </div>
              <p className={clsx('font-mono text-label-sm', recipe ? 'text-muted' : 'text-primary')}>
                {macroLine(t.perServing)}
                {recipe ? ' / serving' : ''}
              </p>
              <p className="text-label-md text-muted">{t.items.map((i) => i.name).join(', ')}</p>
              <div className="mt-2">
                <QuickLogButton
                  name={t.name}
                  date={today}
                  source={{ kind: 'template', templateId: t.id }}
                  label={recipe ? 'Log serving' : 'Log template'}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
