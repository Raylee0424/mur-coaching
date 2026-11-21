import clsx from 'clsx';
import Link from 'next/link';
import { buttonClass } from '@/components/ui/Button';
import { ArrowRightIcon } from './Icons';
import { CONTAINER } from './Section';

/** Closing band: demo or sign in, plus the new self-serve signup. */
export function CallToAction() {
  return (
    <section aria-labelledby="cta-heading" className="border-t border-line py-12 sm:py-16 lg:py-24">
      <div className={clsx(CONTAINER)}>
        <div className="flex flex-col items-center gap-6 rounded-md border border-line bg-card px-5 py-10 text-center sm:px-10 sm:py-14">
          <h2 id="cta-heading" className="text-balance text-[28px] font-extrabold leading-tight lg:text-[40px]">
            See Ray Coaching in Action
          </h2>
          <p className="max-w-xl text-pretty text-muted">
            Explore both the Coach Workspace and the Client Set Logger with seeded 3-session progression data.
          </p>
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
            <a href="#demo" className={buttonClass('primary')}>
              Launch Demo
              <ArrowRightIcon className="size-4" />
            </a>
            <Link href="/signup" className={buttonClass('secondary')}>
              Create account
            </Link>
            <Link href="/login" className={buttonClass('secondary')}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
