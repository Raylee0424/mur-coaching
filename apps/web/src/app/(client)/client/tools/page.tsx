import { Role } from '@coaching/shared';
import { CalculatorsHub } from '@/components/calculators/CalculatorsHub';
import { PageHeader } from '@/components/ui/PageHeader';
import { requireUser } from '@/lib/auth';

export default async function ToolsPage() {
  const user = await requireUser(Role.CLIENT);
  return (
    <>
      <PageHeader title="Training & Nutrition Calculators" meta="9 browser-native tools · Computed locally" />
      <CalculatorsHub unit={user.weightUnit} />
    </>
  );
}
