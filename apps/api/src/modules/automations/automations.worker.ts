import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { EnvService } from '../../config/env.service';
import { AutomationsService } from './automations.service';

/**
 * In-process timer. Safe with several API instances: AutomationRun's unique idempotency key lets only one
 * instance fire each event. Set AUTOMATIONS_INTERVAL_MINUTES=0 to turn it off (tests, one-off scripts).
 */
@Injectable()
export class AutomationsWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AutomationsWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly automations: AutomationsService,
    private readonly env: EnvService,
  ) {}

  onApplicationBootstrap(): void {
    const minutes = this.env.get('AUTOMATIONS_INTERVAL_MINUTES');
    if (!minutes) return;
    this.timer = setInterval(() => void this.tick(), minutes * 60_000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const sent = await this.automations.runDue(new Date());
      if (sent) this.logger.log(`Automations sent ${sent} message(s)`);
    } catch (err) {
      this.logger.error('Automation run failed', err);
    } finally {
      this.running = false;
    }
  }
}
