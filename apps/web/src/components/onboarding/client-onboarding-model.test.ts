import { describe, expect, it } from 'vitest';
import { Equipment, type MeProfileDto, type ProgramDto } from '@coaching/shared';
import {
  countEligibleMovements,
  initialAnswers,
  liftsToInput,
  pickBaselineLifts,
  resumeStep,
  toggleLimitation,
  validateStep,
} from './client-onboarding-model';

const empty: MeProfileDto = {
  profile: {
    goals: [],
    goalNote: null,
    experience: null,
    daysPerWeek: null,
    trainingDays: [],
    sessionLengthMin: null,
    limitations: [],
    limitationsNote: null,
  },
  baselines: [],
};

const rx = (exerciseId: string, name: string) => ({
  id: `we-${exerciseId}`,
  exerciseId,
  exercise: { id: exerciseId, name, muscleGroup: 'CHEST' as const },
  order: 1,
  targetSets: 3,
  targetRepsMin: 5,
  targetRepsMax: 8,
  targetRpe: 8,
  restSeconds: null,
  notes: null,
});

describe('client onboarding model', () => {
  it('picks the main lift of each week-1 day, else the fallback compounds', () => {
    const program = {
      workouts: [
        { id: 'w2', weekNumber: 1, dayNumber: 2, name: 'Lower', exercises: [rx('squat', 'Back Squat'), rx('rdl', 'RDL')] },
        { id: 'w1', weekNumber: 1, dayNumber: 1, name: 'Upper', exercises: [rx('bench', 'Bench')] },
        { id: 'w9', weekNumber: 2, dayNumber: 1, name: 'Upper', exercises: [rx('ohp', 'OHP')] },
      ],
    } as unknown as ProgramDto;
    expect(pickBaselineLifts(program, []).map((l) => l.exerciseId)).toEqual(['bench', 'squat']);
    const lib = [
      { id: 'b', name: 'Barbell Bench Press' },
      { id: 's', name: 'Back Squat' },
    ];
    expect(pickBaselineLifts(null, lib).map((l) => l.name)).toEqual(['Back Squat', 'Barbell Bench Press']);
  });

  it('resumes at the first unanswered step', () => {
    expect(resumeStep(empty)).toBe(0);
    expect(resumeStep({ ...empty, profile: { ...empty.profile, goals: ['Strength'], experience: 'BEGINNER' } })).toBe(2);
    expect(
      resumeStep({
        ...empty,
        profile: { ...empty.profile, goals: ['Strength'], experience: 'BEGINNER', limitations: ['None'] },
      }),
    ).toBe(4);
  });

  it('counts eligible movements by gym equipment profile', () => {
    const library = [
      { equipment: Equipment.BARBELL },
      { equipment: Equipment.MACHINE },
      { equipment: Equipment.DUMBBELL },
      { equipment: Equipment.BODYWEIGHT },
    ];
    expect(countEligibleMovements(library, 'COMMERCIAL')).toBe(4);
    expect(countEligibleMovements(library, 'HOME_RACK')).toBe(3);
    expect(countEligibleMovements(library, 'HOTEL_DB')).toBe(2);
  });

  it('makes None exclusive', () => {
    expect(toggleLimitation(['Knees'], 'None')).toEqual(['None']);
    expect(toggleLimitation(['None'], 'Knees')).toEqual(['Knees']);
  });

  it('validates starting weights and converts lb to kg', () => {
    const a = initialAnswers(empty, 'LB', [
      { exerciseId: 'squat', name: 'Squat' },
      { exerciseId: 'bench', name: 'Bench' },
    ]);
    expect(Object.keys(validateStep(4, a))).toEqual(['lift.squat.weight', 'lift.bench.weight']);
    const filled = {
      ...a,
      lifts: [
        { ...a.lifts[0]!, weight: '225', reps: '5' },
        { ...a.lifts[1]!, unknown: true },
      ],
    };
    expect(validateStep(4, filled)).toEqual({});
    expect(liftsToInput(filled)).toEqual([
      { exerciseId: 'squat', weightKg: 102.05, reps: 5, unknown: false },
      { exerciseId: 'bench', weightKg: null, reps: null, unknown: true },
    ]);
  });
});
