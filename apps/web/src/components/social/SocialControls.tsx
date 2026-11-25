'use client';

import { Copy, Flag, RefreshCw, ShieldBan, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { REPORT_REASON_LABELS, REPORT_REASONS, SOCIAL_LIMITS } from '@coaching/shared';
import type { ReportReason, ReportTarget } from '@coaching/shared';
import {
  acceptFriend,
  blockUser,
  createGroup,
  deleteShare,
  joinGroup,
  leaveGroup,
  removeFriend,
  removeMember,
  reportContent,
  requestFriend,
  rotateInviteCode,
  shareWorkout,
  unblockUser,
} from '@/actions/social';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import type { ActionResult } from '@/lib/action-result';

/** Runs an action, toasts the outcome. */
function useAct() {
  const toast = useToast();
  const [pending, start] = useTransition();
  const act = (call: () => Promise<ActionResult<unknown>>, ok: string, after?: () => void) =>
    start(async () => {
      const res = await call();
      if (res.ok) {
        toast.show({ message: ok, tone: 'ok' });
        after?.();
      } else toast.show({ message: res.error, tone: 'error' });
    });
  return { pending, act };
}

export function CreateGroupButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  function submit(form: FormData): void {
    const name = String(form.get('name') ?? '').trim();
    if (!name) return setError('Name the group.');
    setError(undefined);
    start(async () => {
      const res = await createGroup({ name, description: String(form.get('description') ?? '').trim() || null, isPrivate: form.get('public') !== 'on' });
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.push(`/client/groups?group=${encodeURIComponent(res.data.id)}`);
    });
  }
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Create Group
      </Button>
      <Sheet
        open={open}
        onClose={pending ? () => undefined : () => setOpen(false)}
        title="Create a training group"
        description="Private by default: only people with the invite code can join or see anything inside."
        form={{ action: submit }}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending ? 'Creating…' : 'Create group'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor="g-name">Name</Label>
            <Input id="g-name" name="name" maxLength={SOCIAL_LIMITS.maxName} required autoFocus />
          </div>
          <div>
            <Label htmlFor="g-desc">Description (optional)</Label>
            <Input id="g-desc" name="description" maxLength={SOCIAL_LIMITS.maxDescription} />
          </div>
          <label className="flex items-start gap-2 text-label-md text-ink">
            <input type="checkbox" name="public" className="mt-0.5 accent-primary" />
            <span>
              List in discovery <span className="text-muted">(anyone signed in can see its name and join)</span>
            </span>
          </label>
          <FormError>{error}</FormError>
        </div>
      </Sheet>
    </>
  );
}

export function JoinByCodeForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  function submit(form: FormData): void {
    const code = String(form.get('code') ?? '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6,12}$/.test(code)) return setError('Invite codes are 8 letters and numbers.');
    setError(undefined);
    start(async () => {
      const res = await joinGroup(code);
      if (!res.ok) return setError(res.error);
      router.push(`/client/groups?group=${encodeURIComponent(res.data.id)}`);
    });
  }
  return (
    <form action={submit} className="flex flex-wrap items-end gap-2">
      <div>
        <Label htmlFor="join-code">Invite code</Label>
        <Input id="join-code" name="code" autoCapitalize="characters" autoComplete="off" maxLength={12} className="w-36 font-mono uppercase" />
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        Join
      </Button>
      <div className="w-full">
        <FormError>{error}</FormError>
      </div>
    </form>
  );
}

export function JoinPublicButton({ code }: { code: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await joinGroup(code);
          if (!res.ok) {
            toast.show({ message: res.error, tone: 'error' });
            return;
          }
          router.push(`/client/groups?group=${encodeURIComponent(res.data.id)}`);
        })
      }
    >
      Join Group
    </Button>
  );
}

export function InviteCodeBox({ groupId, code, isOwner }: { groupId: string; code: string; isOwner: boolean }) {
  const toast = useToast();
  const { pending, act } = useAct();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-sm border border-line bg-canvas-low px-3 py-1.5 font-mono text-label-md tracking-widest text-primary">{code}</span>
      <Button
        size="sm"
        variant="ghost"
        aria-label="Copy invite code"
        onClick={() => void navigator.clipboard.writeText(code).then(() => toast.show({ message: 'Invite code copied', tone: 'ok' }))}
      >
        <Icon icon={Copy} size={14} />
      </Button>
      {isOwner ? (
        <Button size="sm" variant="ghost" aria-label="Make a new invite code" disabled={pending} onClick={() => act(() => rotateInviteCode(groupId), 'New invite code made; the old one no longer works')}>
          <Icon icon={RefreshCw} size={14} />
        </Button>
      ) : null}
    </div>
  );
}

export function LeaveGroupButton({ groupId, isOwner }: { groupId: string; isOwner: boolean }) {
  const router = useRouter();
  const { pending, act } = useAct();
  return (
    <Button
      size="sm"
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(isOwner ? 'Leave this group? The longest-standing member becomes the owner; the group is deleted if you are the last one.' : 'Leave this group?')) return;
        act(() => leaveGroup(groupId), 'You left the group', () => router.push('/client/groups'));
      }}
    >
      Leave group
    </Button>
  );
}

/** Add friend, block, report and (owner) remove for one member. */
export function MemberActions({ groupId, userId, name, canRemove, friend }: { groupId: string; userId: string; name: string; canRemove: boolean; friend: boolean }) {
  const { pending, act } = useAct();
  return (
    <div className="flex items-center gap-1">
      {!friend ? (
        <Button size="sm" variant="ghost" aria-label={`Add ${name} as a friend`} disabled={pending} onClick={() => act(() => requestFriend(userId), 'Friend request sent')}>
          <Icon icon={UserPlus} size={14} />
        </Button>
      ) : null}
      <ReportButton targetType="USER" targetId={userId} label={`Report ${name}`} />
      <Button
        size="sm"
        variant="ghost"
        aria-label={`Block ${name}`}
        disabled={pending}
        onClick={() => {
          if (window.confirm(`Block ${name}? You will stop seeing each other's posts and leaderboard rows.`)) act(() => blockUser(userId), `${name} blocked`);
        }}
      >
        <Icon icon={ShieldBan} size={14} />
      </Button>
      {canRemove ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Remove ${name} from the group?`)) act(() => removeMember(groupId, userId), `${name} removed`);
          }}
        >
          Remove
        </Button>
      ) : null}
    </div>
  );
}

export function ReportButton({ targetType, targetId, label }: { targetType: ReportTarget; targetId: string; label: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  function submit(form: FormData): void {
    start(async () => {
      const res = await reportContent({ targetType, targetId, reason: String(form.get('reason')) as ReportReason, details: String(form.get('details') ?? '').trim() || null });
      toast.show(res.ok ? { message: 'Report sent. Thank you.', tone: 'ok' } : { message: res.error, tone: 'error' });
      if (res.ok) setOpen(false);
    });
  }
  return (
    <>
      <Button size="sm" variant="ghost" aria-label={label} onClick={() => setOpen(true)}>
        <Icon icon={Flag} size={14} />
      </Button>
      <Sheet
        open={open}
        onClose={pending ? () => undefined : () => setOpen(false)}
        title={label}
        description="Reports go to the MUR Coaching team. The person is not told who reported them."
        form={{ action: submit }}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={pending}>
              Send report
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor={`r-reason-${targetId}`}>Reason</Label>
            <Select id={`r-reason-${targetId}`} name="reason" defaultValue="SPAM">
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {REPORT_REASON_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={`r-details-${targetId}`}>Details (optional)</Label>
            <Input id={`r-details-${targetId}`} name="details" maxLength={SOCIAL_LIMITS.maxReportDetails} />
          </div>
        </div>
      </Sheet>
    </>
  );
}

export function ShareWorkoutForm({ groupId, sessions, templates }: { groupId: string; sessions: { id: string; label: string }[]; templates: { id: string; label: string }[] }) {
  const toast = useToast();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  function submit(form: FormData): void {
    const pick = String(form.get('pick') ?? '');
    const [kind, id] = pick.split(':');
    if (!id) return setError('Pick a session or template.');
    setError(undefined);
    start(async () => {
      const res = await shareWorkout(groupId, { ...(kind === 's' ? { workoutLogId: id } : { templateId: id }), caption: String(form.get('caption') ?? '').trim() || null });
      if (!res.ok) return setError(res.error);
      toast.show({ message: 'Shared to the group', tone: 'ok' });
    });
  }
  return (
    <form action={submit} className="space-y-2 rounded-sm border border-line bg-canvas-low p-4">
      <Label htmlFor="share-pick">Share a session summary or template</Label>
      <Select id="share-pick" name="pick" defaultValue="">
        <option value="">Choose…</option>
        {sessions.length ? (
          <optgroup label="Recent sessions">
            {sessions.map((s) => (
              <option key={s.id} value={`s:${s.id}`}>
                {s.label}
              </option>
            ))}
          </optgroup>
        ) : null}
        {templates.length ? (
          <optgroup label="Templates">
            {templates.map((t) => (
              <option key={t.id} value={`t:${t.id}`}>
                {t.label}
              </option>
            ))}
          </optgroup>
        ) : null}
      </Select>
      <Label htmlFor="share-caption" className="sr-only">
        Caption
      </Label>
      <Input id="share-caption" name="caption" placeholder="Caption (optional)" maxLength={SOCIAL_LIMITS.maxCaption} />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          Share Card
        </Button>
        <FormError>{error}</FormError>
      </div>
    </form>
  );
}

export function DeleteShareButton({ shareId }: { shareId: string }) {
  const { pending, act } = useAct();
  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => deleteShare(shareId), 'Post removed')}>
      Delete
    </Button>
  );
}

export function FriendActions({ id, userId, pendingIncoming, name, blocked }: { id?: string; userId: string; pendingIncoming?: boolean; name: string; blocked?: boolean }) {
  const { pending, act } = useAct();
  if (blocked)
    return (
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => unblockUser(userId), `${name} unblocked`)}>
        Unblock
      </Button>
    );
  return (
    <div className="flex gap-1">
      {pendingIncoming && id ? (
        <Button size="sm" disabled={pending} onClick={() => act(() => acceptFriend(id), `You and ${name} are friends`)}>
          Accept
        </Button>
      ) : null}
      {id ? (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => removeFriend(id), pendingIncoming ? 'Request declined' : 'Removed')}>
          {pendingIncoming ? 'Decline' : 'Remove'}
        </Button>
      ) : null}
    </div>
  );
}
