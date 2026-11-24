'use client';

import { Copy, KeyRound, ShieldOff } from 'lucide-react';
import { useState, useTransition } from 'react';
import { CONNECTOR_LIMITS, CONNECTOR_SCOPE_LABELS, CONNECTOR_SCOPE_PATHS, ConnectorScope } from '@coaching/shared';
import type { ConnectorGrantDto } from '@coaching/shared';
import { createConnector, revokeConnector } from '@/actions/ai';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { connectorStatus, PRESETS } from './connectors-model';

const SCOPES = Object.values(ConnectorScope);
const STATUS_TONE = { ACTIVE: 'emerald', EXPIRED: 'slate', REVOKED: 'red' } as const;

/** Create read-only tokens per app, see scopes and last use, revoke any time. */
export function ConnectorsManager({ grants, canCreate, apiBase }: { grants: ConnectorGrantDto[]; canCreate: boolean; apiBase: string }) {
  const [name, setName] = useState<string>(PRESETS[0]!.name);
  const [scopes, setScopes] = useState<ConnectorScope[]>([...PRESETS[0]!.scopes]);
  const [days, setDays] = useState(90);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function toggle(s: ConnectorScope) {
    setScopes((list) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s]));
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    if (scopes.length === 0) return setError('Pick at least one scope.');
    setError(undefined);
    startTransition(async () => {
      const res = await createConnector({ name: name.trim(), scopes, expiresInDays: days });
      if (!res.ok) return setError(res.error);
      setToken(res.data.token);
    });
  }

  function revoke(id: string) {
    startTransition(async () => {
      const res = await revokeConnector(id);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <section aria-label="New connector" className="flex flex-col gap-4 rounded-md border border-line bg-card p-5 lg:col-span-5">
        <div>
          <span className="font-mono text-label-sm uppercase text-primary">READ-ONLY CONNECTOR · TOKEN</span>
          <h2 className="mt-1 font-display text-title-md text-ink">Link an AI app</h2>
          <p className="mt-1 text-meta text-muted">
            The app can read only the scopes you tick, only your own data, and never your cycle log. It cannot change anything.
          </p>
        </div>

        {token ? (
          <div role="status" className="flex flex-col gap-2 rounded-sm border border-primary/40 bg-primary-container p-4">
            <p className="font-sans text-label-md font-semibold text-primary">Copy this token now. It is shown once and never stored.</p>
            <code className="break-all rounded-sm bg-canvas-low px-3 py-2 font-mono text-label-sm text-ink">{token}</code>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => void navigator.clipboard.writeText(token)}>
                <Icon icon={Copy} size={14} />
                Copy token
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setToken(null)}>
                Done
              </Button>
            </div>
            <p className="font-mono text-label-sm text-muted">
              GET {apiBase}/&lt;scope&gt; with header Authorization: Bearer &lt;token&gt;
            </p>
          </div>
        ) : canCreate ? (
          <form onSubmit={create} className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button key={p.name} type="button" size="sm" variant={name === p.name ? 'primary' : 'secondary'} onClick={() => (setName(p.name), setScopes([...p.scopes]))}>
                  {p.name}
                </Button>
              ))}
            </div>
            <div>
              <Label htmlFor="connector-name">App name</Label>
              <Input id="connector-name" value={name} maxLength={CONNECTOR_LIMITS.maxName} onChange={(e) => setName(e.target.value)} required />
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 font-sans text-label-md text-ink">Scopes</legend>
              {SCOPES.map((s) => (
                <label key={s} className="flex items-center justify-between gap-3 rounded-sm border border-line bg-canvas-low px-3.5 py-2.5">
                  <span className="text-label-md text-ink">{CONNECTOR_SCOPE_LABELS[s]}</span>
                  <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggle(s)} className="size-4 accent-primary" />
                </label>
              ))}
            </fieldset>
            <div>
              <Label htmlFor="connector-expiry">Expires after</Label>
              <Select id="connector-expiry" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                {CONNECTOR_LIMITS.expiryDays.map((d) => (
                  <option key={d} value={d}>
                    {d} days
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" disabled={pending || !name.trim()} aria-busy={pending}>
              <Icon icon={KeyRound} size={16} />
              Create read-only token
            </Button>
          </form>
        ) : (
          <p className="rounded-sm border border-line bg-canvas-low p-4 text-meta text-muted">
            Creating connectors is part of MUR Coaching Pro. You can still review and revoke existing ones here.
          </p>
        )}
        <FormError>{error}</FormError>
      </section>

      <section aria-label="Connected apps" className="flex flex-col gap-3 lg:col-span-7">
        {grants.length === 0 ? (
          <p className="rounded-md border border-line bg-card p-5 text-meta text-muted">No connected apps yet.</p>
        ) : (
          grants.map((g) => {
            const status = connectorStatus(g);
            return (
              <article key={g.id} className="flex flex-col gap-3 rounded-md border border-line bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-label-sm uppercase text-muted">READ-ONLY CONNECTOR · {g.tokenPrefix}…</span>
                    <h2 className="mt-0.5 font-display text-title-md text-ink">{g.name}</h2>
                  </div>
                  <Badge tone={STATUS_TONE[status]}>{status === 'ACTIVE' ? 'Connected' : status === 'EXPIRED' ? 'Expired' : 'Revoked'}</Badge>
                </div>
                <ul className="flex flex-wrap gap-2" aria-label="Granted scopes">
                  {g.scopes.map((s) => (
                    <li key={s}>
                      <Badge tone="signal">
                        {CONNECTOR_SCOPE_LABELS[s]} · /{CONNECTOR_SCOPE_PATHS[s]}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <p className="font-mono text-label-sm text-muted">
                  Created {g.createdAt.slice(0, 10)} · expires {g.expiresAt.slice(0, 10)} · last used {g.lastUsedAt ? g.lastUsedAt.slice(0, 10) : 'never'}
                  {g.revokedAt ? ` · revoked ${g.revokedAt.slice(0, 10)}` : ''}
                </p>
                {status === 'ACTIVE' ? (
                  <div>
                    <Button variant="danger" size="sm" onClick={() => revoke(g.id)} disabled={pending}>
                      <Icon icon={ShieldOff} size={14} />
                      Revoke access
                    </Button>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
