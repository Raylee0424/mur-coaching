import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { ProgressionModule } from '../progression/progression.module';
import { WorkoutLogsController } from './workout-logs.controller';
import { WorkoutLogsService } from './workout-logs.service';

@Module({
  imports: [ClientsModule, ProgressionModule],
  controllers: [WorkoutLogsController],
  providers: [WorkoutLogsService],
})
export class WorkoutLogsModule {}
