import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { CoachCycleController, MeReadinessController } from './readiness.controller';
import { ReadinessService } from './readiness.service';

@Module({
  imports: [ClientsModule],
  controllers: [MeReadinessController, CoachCycleController],
  providers: [ReadinessService],
})
export class ReadinessModule {}
