import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { CoachRoadmapController, MeRoadmapController } from './roadmaps.controller';
import { RoadmapsService } from './roadmaps.service';

@Module({
  imports: [ClientsModule],
  controllers: [CoachRoadmapController, MeRoadmapController],
  providers: [RoadmapsService],
})
export class RoadmapsModule {}
