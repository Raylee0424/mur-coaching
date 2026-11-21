import { redirect } from 'next/navigation';

export default function CoachHome(): never {
  redirect('/coach/clients');
}
