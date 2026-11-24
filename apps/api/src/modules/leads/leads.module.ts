import { Module } from '@nestjs/common';
import { IntakeService } from './intake.service';
import { CoachLeadsController, PublicIntakeController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  controllers: [CoachLeadsController, PublicIntakeController],
  providers: [LeadsService, IntakeService],
})
export class LeadsModule {}
