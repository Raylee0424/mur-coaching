import { notFound, unstable_rethrow } from 'next/navigation';
import { Role } from '@coaching/shared';
import { ProgramBuilder } from '@/components/programs/ProgramBuilder';
import { PageHeader } from '@/components/ui/PageHeader';
import { ApiError } from '@/lib/api/client';
import { programsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { loadBuilderData } from '../load';

export default async function EditProgramPage({ params }: { params: Promise<{ programId: string }> }) {
  await requireUser(Role.COACH);
  const { programId } = await params;
  const [program, data] = await Promise.all([
    programsApi.get(programId).catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404) notFound();
      throw err;
    }),
    loadBuilderData(),
  ]);
  // Advisory only: a failed check must not block the builder.
  const conflicts = program.activeClientIds.length > 0 ? await programsApi.conflicts(program.id).catch((err: unknown) => {
          unstable_rethrow(err);
          return [];
        }) : [];
  return (
    <>
      <PageHeader title={program.name} />
      <ProgramBuilder key={program.id} program={program} library={data.library} clients={data.clients} conflicts={conflicts} sports={data.sports} groups={data.groups} />
    </>
  );
}
