import type { CoachClientStatus } from './enums';
import type { IsoDateString } from './common';

export interface ActiveAssignmentSummary {
  id: string;
  programId: string;
  startDate: IsoDateString;
  program: { name: string; durationWeeks: number };
}

export interface ClientView {
  id: string;
  email: string;
  name: string;
  createdAt: IsoDateString;
  /** Coach-private; null when the viewer is the client. */
  notes: string | null;
  status: CoachClientStatus;
  activeAssignment: ActiveAssignmentSummary | null;
}

export interface CreateClientRequest {
  email: string;
  name: string;
  notes?: string;
}

export interface CreateClientResponse {
  client: ClientView;
  /** Returned exactly once; only its hash is stored. */
  temporaryPassword: string;
}

export interface UpdateClientRequest {
  name?: string;
  notes?: string;
  status?: CoachClientStatus;
}
