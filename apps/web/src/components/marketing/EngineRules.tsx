import { ENGINE_DEFAULTS, RecommendationAction } from '@coaching/shared';
import { RULE_GROUPS } from '@/components/engine/rule-meta';
import { ACTION_META, ActionBadge } from '@/components/progression/ActionBadge';
import { TABLE, TD, TH, THEAD } from '@/components/ui/table';
import clsx from 'clsx';
import { Section } from './Section';

const NEXT: Record<RecommendationAction, string> = {
  INCREASE_LOAD: '+1 increment',
  INCREASE_REPS: '+1 rep',
  HOLD: 'same load',
  DELOAD: `−${ENGINE_DEFAULTS.deloadPercent}%`,
};

export function EngineRules() {
  return (
    <Section
      id="engine"
      title="Four possible calls. Every one is traceable."
      intro="The engine evaluates rules in a fixed order and stops at the first match. Coaches set the thresholds; the defaults are below."
    >
      <div className="overflow-x-auto rounded-md border border-line bg-card">
        <table className={clsx(TABLE, 'min-w-[36rem]')}>
          <caption className="sr-only">Engine calls in evaluation order</caption>
          <thead className={THEAD}>
            <tr>
              <th scope="col" className={TH}>Call</th>
              <th scope="col" className={TH}>Fires when</th>
              <th scope="col" className={TH}>Next session</th>
            </tr>
          </thead>
          <tbody>
            {RULE_GROUPS.map((g) => (
              <tr key={g.action} className={clsx('border-t border-l-2 border-line align-top', ACTION_META[g.action].rule)}>
                <td className={clsx(TD, 'h-auto py-4')}>
                  <ActionBadge action={g.action} />
                </td>
                <td className={clsx(TD, 'h-auto max-w-prose py-4 text-muted')}>{g.condition(ENGINE_DEFAULTS)}</td>
                <td className={clsx(TD, 'h-auto whitespace-nowrap py-4 font-mono')}>{NEXT[g.action]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
