import { MuscleGroup } from '@coaching/shared';

/** Reads a text field from FormData; missing or file values become ''. */
export function formString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

export function isMuscleGroup(value: unknown): value is MuscleGroup {
  return typeof value === 'string' && (Object.values(MuscleGroup) as string[]).includes(value);
}

/** Next.js search params are string | string[] | undefined. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
