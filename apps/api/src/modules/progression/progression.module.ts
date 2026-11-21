import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { ProgressionController, RecommendationsController } from './progression.controller';
import { ProgressionService } from './progression.service';

@Module({
  imports: [ClientsModule],
  controllers: [ProgressionController, RecommendationsController],
  providers: [ProgressionService],
  exports: [ProgressionService],
})
export class ProgressionModule {}
