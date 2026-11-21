import 'server-only';
import { CoachClientStatus } from '@coaching/shared';
import type { AssignableClient } from '@/components/programs/AssignProgramButton';
import { clientsApi, exercisesApi } from '@/lib/api/endpoints';

/** Library + assignable clients, shared by the new and edit builder pages. */
export async function loadBuilderData() {
  const [library, roster] = await Promise.all([exercisesApi.list(), clientsApi.list()]);
  const clients: AssignableClient[] = roster
    .filter((c) => c.status !== CoachClientStatus.ARCHIVED)
    .map((c) => ({
      id: c.id,
      name: c.name,
      currentProgram: c.activeAssignment ? { id: c.activeAssignment.programId, name: c.activeAssignment.program.name } : null,
    }));
  return { library, clients };
}
