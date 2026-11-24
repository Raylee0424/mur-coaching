import { CallToAction } from '@/components/marketing/CallToAction';
import { EngineRules } from '@/components/marketing/EngineRules';
import { Hero } from '@/components/marketing/Hero';
import { Loop } from '@/components/marketing/Loop';
import { Pricing } from '@/components/marketing/Pricing';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { Workspaces } from '@/components/marketing/Workspaces';

/** Public landing page matched to Stitch (`ray_coaching_developer_grade_landing_page` + `web_pricing_snapshot_billing`). */
export default function Home() {
  return (
    <div id="top" className="flex min-h-screen flex-col bg-canvas">
      <MarketingNav />
      <main className="flex-1">
        <Hero />
        <EngineRules />
        <Workspaces />
        <Loop />
        <Pricing />
        <CallToAction />
      </main>
      <MarketingFooter />
    </div>
  );
}
