import clsx from 'clsx';
import Link from 'next/link';
import { buttonClass } from '@/components/ui/Button';
import { CONTAINER } from './Section';

export function CallToAction() {
  return (
    <section aria-labelledby="cta-heading" className="border-t border-line py-20">
      <div className={clsx(CONTAINER, 'grid items-center gap-8 lg:grid-cols-12')}>
        <h2 id="cta-heading" className="text-balance font-display text-h1 font-semibold lg:col-span-6 lg:text-[40px] lg:leading-[42px]">
          See it with real numbers.
        </h2>
        <div className="flex flex-wrap gap-3 lg:col-span-6 lg:justify-end">
          <a href="#demo" className={buttonClass('primary', undefined, 'lg')}>
            Launch demo
          </a>
          <Link href="/signup" className={buttonClass('secondary', undefined, 'lg')}>
            Create account
          </Link>
          <Link href="/login" className={buttonClass('ghost', undefined, 'lg')}>
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
