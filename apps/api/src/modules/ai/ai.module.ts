import { Module } from '@nestjs/common';
import { LimitationsModule } from '../limitations/limitations.module';
import { AiContextService } from './ai-context.service';
import { AiController, ConnectorReadController, MeConnectorsController } from './ai.controller';
import { AiProviderService } from './ai-provider.service';
import { AiUsageService } from './ai-usage.service';
import { CoachService } from './coach.service';
import { ConnectorsService } from './connectors.service';
import { VoiceService } from './voice.service';
import { WorkoutGeneratorService } from './workout-generator.service';

@Module({
  imports: [LimitationsModule],
  controllers: [AiController, MeConnectorsController, ConnectorReadController],
  providers: [AiProviderService, AiUsageService, AiContextService, CoachService, WorkoutGeneratorService, VoiceService, ConnectorsService],
})
export class AiModule {}
