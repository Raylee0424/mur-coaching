import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { CONTAINER } from './Section';

export function CallToAction() {
  return (
    <section id="cta-banner" aria-labelledby="cta-heading" className="py-20 lg:py-24">
      <div className={CONTAINER}>
        <div className="flex flex-col items-center gap-6 rounded-md border border-line bg-card p-10 text-center lg:p-14">
          <h2 id="cta-heading" className="text-balance font-display text-headline-lg-mobile lg:text-headline-lg text-ink">
            See MUR Coaching in Action
          </h2>
          <p className="max-w-xl text-pretty font-sans text-body-lg text-muted">
            Explore both the Coach Workspace and Client Set Logger with seeded 3-session progression data.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link href="/login" className={buttonClass('secondary', 'px-6', 'lg')}>
              Sign In
            </Link>
            <a href="#demo" className={buttonClass('primary', 'px-6', 'lg')}>
              Launch Demo
              <Icon icon={ArrowRight} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
