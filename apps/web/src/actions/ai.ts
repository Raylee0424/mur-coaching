'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type {
  AskCoachResponse,
  CreateConnectorRequest,
  CreatedConnectorDto,
  CreateWorkoutTemplateRequest,
  GeneratedWorkoutDto,
  GenerateWorkoutRequest,
  VoiceParseResponse,
  WorkoutTemplateDto,
} from '@coaching/shared';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { aiApi, connectorsApi, templatesApi } from '@/lib/api/endpoints';

async function run<T>(op: () => Promise<T>, paths: readonly string[] = []): Promise<ActionResult<T>> {
  try {
    const data = await op();
    for (const p of paths) revalidatePath(p);
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

export async function askCoach(question: string, conversationId?: string): Promise<ActionResult<AskCoachResponse>> {
  return run(() => aiApi.ask({ question, ...(conversationId ? { conversationId } : {}) }), ['/client/coach-ai']);
}

export async function deleteCoachConversation(id: string): Promise<ActionResult> {
  return run(() => aiApi.removeConversation(id), ['/client/coach-ai']);
}

/** Preview only: nothing is saved until the athlete confirms. */
export async function generateWorkout(input: GenerateWorkoutRequest): Promise<ActionResult<GeneratedWorkoutDto>> {
  return run(() => aiApi.generateWorkout(input));
}

/** The athlete's confirmed, edited preview, saved through the normal template route (and its exercise checks). */
export async function saveGeneratedTemplate(input: CreateWorkoutTemplateRequest): Promise<ActionResult<WorkoutTemplateDto>> {
  return run(() => templatesApi.create(input), ['/client/templates', '/client/log']);
}

/** Stateless: the transcript is parsed and dropped. */
export async function parseVoiceCommand(transcript: string): Promise<ActionResult<VoiceParseResponse>> {
  return run(() => aiApi.parseVoice(transcript));
}

export async function createConnector(input: CreateConnectorRequest): Promise<ActionResult<CreatedConnectorDto>> {
  return run(() => connectorsApi.create(input), ['/client/settings/connectors']);
}

export async function revokeConnector(id: string): Promise<ActionResult> {
  return run(() => connectorsApi.revoke(id), ['/client/settings/connectors']);
}
