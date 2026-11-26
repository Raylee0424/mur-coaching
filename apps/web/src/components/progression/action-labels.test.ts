import { describe, expect, it } from 'vitest';
import { PROGRESSION_ACTION_LABEL, PROGRESSION_ACTION_TONE, RecommendationAction } from '@coaching/shared';
import { ACTION_META } from './ActionBadge';

const actions = Object.values(RecommendationAction);

describe('progression action labels', () => {
  it('has a label and tone for every action, keyed exactly by the enum', () => {
    expect(Object.keys(PROGRESSION_ACTION_LABEL).sort()).toEqual([...actions].sort());
    expect(Object.keys(PROGRESSION_ACTION_TONE).sort()).toEqual([...actions].sort());
    for (const a of actions) {
      expect(PROGRESSION_ACTION_LABEL[a].length).toBeGreaterThan(0);
      expect(PROGRESSION_ACTION_LABEL[a]).not.toBe(a);
      expect(PROGRESSION_ACTION_TONE[a]).toBeTruthy();
    }
  });
  it('labels are unique', () => {
    expect(new Set(Object.values(PROGRESSION_ACTION_LABEL)).size).toBe(actions.length);
  });
  it('ACTION_META uses the shared label and the enum as code', () => {
    for (const a of actions) {
      expect(ACTION_META[a].label).toBe(PROGRESSION_ACTION_LABEL[a]);
      expect(ACTION_META[a].code).toBe(a);
    }
  });
});
