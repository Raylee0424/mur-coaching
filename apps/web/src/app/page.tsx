import { CallToAction } from '@/components/marketing/CallToAction';
import { EngineRules } from '@/components/marketing/EngineRules';
import { Hero } from '@/components/marketing/Hero';
import { Loop } from '@/components/marketing/Loop';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { Workspaces } from '@/components/marketing/Workspaces';

/** Public landing page. Middleware sends signed-in users to their home instead. */
export default function Home() {
  return (
    <div id="top" className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">
        <Hero />
        <EngineRules />
        <Loop />
        <Workspaces />
        <CallToAction />
      </main>
      <MarketingFooter />
    </div>
  );
}
