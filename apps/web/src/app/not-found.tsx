import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-muted">That page does not exist or you do not have access to it.</p>
      <Link href="/" className="font-semibold text-primary-soft underline">
        Go home
      </Link>
    </main>
  );
}
