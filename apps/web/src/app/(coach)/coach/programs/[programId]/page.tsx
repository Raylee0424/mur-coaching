import { notFound } from 'next/navigation';
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
  return (
    <>
      <PageHeader title={program.name} subtitle="Edits keep logged history linked to each prescription." />
      <ProgramBuilder key={program.id} program={program} library={data.library} clients={data.clients} />
    </>
  );
}
