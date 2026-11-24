import { Module } from '@nestjs/common';
import { CoachAutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';
import { AutomationsWorker } from './automations.worker';

@Module({
  controllers: [CoachAutomationsController],
  providers: [AutomationsService, AutomationsWorker],
})
export class AutomationsModule {}
