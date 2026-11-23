import { Role } from '@coaching/shared';
import { PageHeader } from '@/components/ui/PageHeader';
import { TemplatesManager } from '@/components/templates/TemplatesManager';
import { exercisesApi, templatesApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Workout templates and folders. Start Session opens the logger on a template. */
export default async function TemplatesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser(Role.CLIENT);
  const params = await searchParams;
  const [folders, templates, catalog] = await Promise.all([templatesApi.listFolders(), templatesApi.list(), exercisesApi.list()]);

  return (
    <>
      <PageHeader title="Templates" meta={`${templates.length} saved · ${folders.length} folders`} back={{ href: '/client', label: 'Back to today' }} />
      <TemplatesManager folders={folders} templates={templates} folderId={firstParam(params.folder) ?? null} catalog={catalog} />
    </>
  );
}
