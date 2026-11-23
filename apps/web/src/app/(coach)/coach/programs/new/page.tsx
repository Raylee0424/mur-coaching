import { Role } from '@coaching/shared';
import { ProgramBuilder } from '@/components/programs/ProgramBuilder';
import { PageHeader } from '@/components/ui/PageHeader';
import { requireUser } from '@/lib/auth';
import { loadBuilderData } from '../load';

export default async function NewProgramPage() {
  await requireUser(Role.COACH);
  const { library, clients } = await loadBuilderData();
  return (
    <>
      <PageHeader title="New program" />
      <ProgramBuilder program={null} library={library} clients={clients} />
    </>
  );
}
