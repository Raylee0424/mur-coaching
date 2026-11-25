'use server';

import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import type { CreateGroupRequest, CreateReportRequest, GroupDetailDto, ShareWorkoutRequest } from '@coaching/shared';
import { toActionError, type ActionResult } from '@/lib/action-result';
import { socialApi } from '@/lib/api/endpoints';

async function run<T>(call: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await call();
    revalidatePath('/client/groups');
    revalidatePath('/client/health');
    return { ok: true, data };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

export async function createGroup(input: CreateGroupRequest): Promise<ActionResult<GroupDetailDto>> {
  return run(() => socialApi.createGroup(input));
}

export async function joinGroup(inviteCode: string): Promise<ActionResult<GroupDetailDto>> {
  return run(() => socialApi.join(inviteCode));
}

export async function leaveGroup(groupId: string): Promise<ActionResult> {
  return run(() => socialApi.leave(groupId));
}

export async function setShareStats(groupId: string, shareStats: boolean): Promise<ActionResult> {
  return run(() => socialApi.setShareStats(groupId, shareStats));
}

export async function rotateInviteCode(groupId: string): Promise<ActionResult<GroupDetailDto>> {
  return run(() => socialApi.rotateCode(groupId));
}

export async function removeMember(groupId: string, userId: string): Promise<ActionResult> {
  return run(() => socialApi.removeMember(groupId, userId));
}

export async function shareWorkout(groupId: string, input: ShareWorkoutRequest): Promise<ActionResult> {
  return run(async () => {
    await socialApi.share(groupId, input);
  });
}

export async function deleteShare(shareId: string): Promise<ActionResult> {
  return run(() => socialApi.unshare(shareId));
}

export async function requestFriend(userId: string): Promise<ActionResult> {
  return run(() => socialApi.requestFriend(userId));
}

export async function acceptFriend(friendshipId: string): Promise<ActionResult> {
  return run(() => socialApi.acceptFriend(friendshipId));
}

export async function removeFriend(friendshipId: string): Promise<ActionResult> {
  return run(() => socialApi.removeFriend(friendshipId));
}

export async function blockUser(userId: string): Promise<ActionResult> {
  return run(() => socialApi.block(userId));
}

export async function unblockUser(userId: string): Promise<ActionResult> {
  return run(() => socialApi.unblock(userId));
}

export async function reportContent(input: CreateReportRequest): Promise<ActionResult> {
  return run(() => socialApi.report(input));
}
