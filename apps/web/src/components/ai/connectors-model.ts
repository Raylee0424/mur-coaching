import { ConnectorScope } from '@coaching/shared';
import type { ConnectorGrantDto } from '@coaching/shared';

/** Starting points matching the Stitch cards. The athlete can change every scope before creating. */
export const PRESETS: readonly { name: string; scopes: readonly ConnectorScope[] }[] = [
  { name: 'Claude Desktop & Web', scopes: [ConnectorScope.TRAINING, ConnectorScope.NUTRITION, ConnectorScope.BODYWEIGHT, ConnectorScope.READINESS] },
  { name: 'ChatGPT Custom Connector', scopes: [ConnectorScope.TRAINING, ConnectorScope.BODYWEIGHT] },
];

export function connectorStatus(g: Pick<ConnectorGrantDto, 'revokedAt' | 'expiresAt'>, nowMs: number = Date.now()): 'ACTIVE' | 'EXPIRED' | 'REVOKED' {
  if (g.revokedAt) return 'REVOKED';
  return new Date(g.expiresAt).getTime() <= nowMs ? 'EXPIRED' : 'ACTIVE';
}
