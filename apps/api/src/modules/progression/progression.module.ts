import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { EngineRulesController } from './engine-rules.controller';
import { EngineRulesService } from './engine-rules.service';
import { ProgressionController, RecommendationsController } from './progression.controller';
import { ProgressionService } from './progression.service';

@Module({
  imports: [ClientsModule],
  controllers: [ProgressionController, RecommendationsController, EngineRulesController],
  providers: [ProgressionService, EngineRulesService],
  exports: [ProgressionService],
})
export class ProgressionModule {}
