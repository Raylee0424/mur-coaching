/** Plain-language definitions for training jargon, shown by the web `<Term>` popover. */
export interface GlossaryEntry {
  /** Short label as it appears in copy, e.g. "RPE". */
  term: string;
  /** One plain sentence or two; no jargon. */
  definition: string;
}

const ONE_REP_MAX = 'Heaviest single rep you could do, estimated from your working sets.';

export const GLOSSARY = {
  rpe: { term: 'RPE', definition: 'How hard the set felt, 1-10. RPE 8 = about 2 more reps possible.' },
  rir: { term: 'RIR', definition: 'Reps left in the tank.' },
  e1rm: { term: 'e1RM', definition: ONE_REP_MAX },
  oneRm: { term: '1RM', definition: ONE_REP_MAX },
  deload: { term: 'Deload', definition: 'A planned easier week so your body recovers.' },
  tempo: { term: 'Tempo', definition: 'How many seconds each part of a rep takes, lowering first. 3-1-1 = 3 down, 1 pause, 1 up.' },
  mesocycle: { term: 'Mesocycle', definition: 'A training block of a few weeks with one goal, usually ending in a deload.' },
  netStimulus: {
    term: 'Net Stimulus',
    definition: 'Sets that were hard enough to build muscle. Easy sets, with many reps left in the tank, count half or not at all.',
  },
  dots: { term: 'DOTS', definition: 'A score that compares lifters of different bodyweights. Higher = stronger for your size.' },
  wilks: { term: 'Wilks', definition: 'An older bodyweight-adjusted strength score. Same idea as DOTS, slightly different math.' },
  epley: { term: 'Epley', definition: 'A formula that estimates your 1RM from weight and reps. The engine uses this one.' },
  brzycki: { term: 'Brzycki', definition: 'A 1RM formula that gives slightly lower estimates for higher reps.' },
  lombardi: { term: 'Lombardi', definition: 'A 1RM formula that tends to read a little higher at low reps.' },
} as const satisfies Record<string, GlossaryEntry>;

export type GlossaryId = keyof typeof GLOSSARY;
