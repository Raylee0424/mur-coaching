import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { ProgressionModule } from '../progression/progression.module';
import { RecordsModule } from '../records/records.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { WorkoutLogsController } from './workout-logs.controller';
import { WorkoutLogsService } from './workout-logs.service';

@Module({
  imports: [ClientsModule, ProgressionModule, RecordsModule, ScheduleModule],
  controllers: [WorkoutLogsController],
  providers: [WorkoutLogsService],
  exports: [WorkoutLogsService],
})
export class WorkoutLogsModule {}
