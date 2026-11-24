import { Module } from '@nestjs/common';
import { CoachCallsController, MeCallsController } from './calls.controller';
import { CallsService } from './calls.service';

@Module({
  controllers: [CoachCallsController, MeCallsController],
  providers: [CallsService],
})
export class CallsModule {}
