import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { EngineRulesController } from './engine-rules.controller';
import { EngineRulesService } from './engine-rules.service';
import { ProgressionController, RecommendationsController } from './progression.controller';
import { ExplainService } from './explain.service';
import { ProgressionService } from './progression.service';
import { QueueService } from './queue.service';

@Module({
  imports: [ClientsModule],
  controllers: [ProgressionController, RecommendationsController, EngineRulesController],
  providers: [ProgressionService, EngineRulesService, QueueService, ExplainService],
  exports: [ProgressionService, ExplainService],
})
export class ProgressionModule {}
