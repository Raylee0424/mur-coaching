import { CallToAction } from '@/components/marketing/CallToAction';
import { Hero } from '@/components/marketing/Hero';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { ProgressionEngine } from '@/components/marketing/ProgressionEngine';
import { RoleCards } from '@/components/marketing/RoleCards';

/** Public landing page. Middleware sends signed-in users to their home instead. */
export default function Home() {
  return (
    <div id="top" className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <ProgressionEngine />
        <RoleCards />
        <CallToAction />
      </main>
      <MarketingFooter />
    </div>
  );
}
