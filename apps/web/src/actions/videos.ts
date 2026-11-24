'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type { CreateAnnotationRequest, CreateReviewAudioRequest, CreateSetVideoRequest, UploadTicketDto, VideoAnnotationDto } from '@coaching/shared';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { formChecksApi, videosApi } from '@/lib/api/endpoints';

async function run<T>(page: string, call: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await call();
    revalidatePath(page);
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

const CLIENT = '/client/videos';
const COACH = '/coach/form-checks';

/** Clip upload step 1. The browser then PUTs the file to R2 and calls completeSetVideo. */
export async function reserveSetVideo(input: CreateSetVideoRequest): Promise<ActionResult<UploadTicketDto>> {
  return run(CLIENT, () => videosApi.reserve(input));
}

export async function completeSetVideo(id: string): Promise<ActionResult> {
  return run(CLIENT, () => videosApi.complete(id));
}

export async function requestFormCheck(id: string): Promise<ActionResult> {
  return run(CLIENT, () => videosApi.requestReview(id));
}

export async function deleteSetVideo(id: string): Promise<ActionResult> {
  return run(CLIENT, () => videosApi.remove(id));
}

export async function addAnnotation(reviewId: string, input: CreateAnnotationRequest): Promise<ActionResult<VideoAnnotationDto>> {
  return run(COACH, () => formChecksApi.annotate(reviewId, input));
}

export async function removeAnnotation(reviewId: string, annotationId: string): Promise<ActionResult> {
  return run(COACH, () => formChecksApi.removeAnnotation(reviewId, annotationId));
}

export async function reserveReviewAudio(reviewId: string, input: CreateReviewAudioRequest): Promise<ActionResult<UploadTicketDto>> {
  return run(COACH, () => formChecksApi.reserveAudio(reviewId, input));
}

export async function completeReviewAudio(reviewId: string, assetId: string): Promise<ActionResult> {
  return run(COACH, () => formChecksApi.completeAudio(reviewId, assetId));
}

export async function submitFormReview(reviewId: string, summary: string): Promise<ActionResult> {
  return run(COACH, () => formChecksApi.submit(reviewId, summary.trim()));
}
