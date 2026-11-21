'use server';

import { revalidatePath } from 'next/cache';
import { WeightUnit } from '@coaching/shared';
import { authApi } from '@/lib/api/endpoints';
import { formString } from '@/lib/form';

/** Switches the signed-in user's display unit; every page re-renders with it. Failures reach error.tsx. */
export async function setWeightUnit(formData: FormData): Promise<void> {
  const unit = formString(formData, 'unit');
  if (unit !== WeightUnit.KG && unit !== WeightUnit.LB) throw new Error('Unknown unit.');
  await authApi.updateMe({ weightUnit: unit });
  revalidatePath('/', 'layout');
}
