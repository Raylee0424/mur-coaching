'use server';

import { unstable_rethrow } from 'next/navigation';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { intakeApi } from '@/lib/api/endpoints';
import { formString as field } from '@/lib/form';

/** Public application form. Answers arrive as `q:<questionId>` fields. */
export async function submitApplication(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const slug = field(formData, 'slug');
  const days = field(formData, 'trainingDays');
  const years = field(formData, 'experienceYears');
  const phone = field(formData, 'phone').trim();
  const goal = field(formData, 'goal').trim();
  const answers = [...formData.entries()]
    .filter(([key]) => key.startsWith('q:'))
    .map(([key, value]) => ({ questionId: key.slice(2), answer: typeof value === 'string' ? value : '' }));
  try {
    await intakeApi.submit(slug, {
      name: field(formData, 'name').trim(),
      email: field(formData, 'email').trim().toLowerCase(),
      ...(phone ? { phone } : {}),
      ...(goal ? { goal } : {}),
      ...(days ? { trainingDays: Number(days) } : {}),
      ...(years !== '' ? { experienceYears: Number(years) } : {}),
      answers,
      website: field(formData, 'website'),
    });
    return { ok: true, data: undefined };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}
