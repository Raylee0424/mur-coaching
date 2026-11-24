import { Module } from '@nestjs/common';
import { WorkoutLogsModule } from '../workout-logs/workout-logs.module';
import { CoachLiveController, MeLiveController } from './live.controller';
import { LiveService } from './live.service';

@Module({
  imports: [WorkoutLogsModule],
  controllers: [CoachLiveController, MeLiveController],
  providers: [LiveService],
})
export class LiveModule {}
