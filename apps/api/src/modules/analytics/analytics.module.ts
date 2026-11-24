import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { CoachAnalyticsController, MeAnalyticsController } from './analytics.controller';
import { MuscleAnalyticsService } from './muscle-analytics.service';

@Module({
  imports: [ClientsModule],
  controllers: [MeAnalyticsController, CoachAnalyticsController],
  providers: [MuscleAnalyticsService],
})
export class AnalyticsModule {}
