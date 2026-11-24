import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateExerciseDto, UpdateExerciseDto } from './exercises.dto';

const base = { name: 'Row', muscleGroup: 'BACK' };
const errors = (cls: typeof CreateExerciseDto | typeof UpdateExerciseDto, body: object) => validate(plainToInstance(cls, body) as object);

describe('exercise demoUrl', () => {
  it('accepts https, null and absent', async () => {
    expect(await errors(CreateExerciseDto, { ...base, demoUrl: 'https://youtu.be/abc' })).toHaveLength(0);
    expect(await errors(CreateExerciseDto, { ...base, demoUrl: null })).toHaveLength(0);
    expect(await errors(UpdateExerciseDto, {})).toHaveLength(0);
  });
  it('rejects http, javascript: and over-long links', async () => {
    for (const demoUrl of ['http://example.com/x', 'javascript:alert(1)', `https://a.co/${'x'.repeat(300)}`]) {
      expect(await errors(UpdateExerciseDto, { demoUrl })).not.toHaveLength(0);
    }
  });
});
