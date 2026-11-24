import { Module } from '@nestjs/common';
import { CoachCheckInsController, MeCheckInsController } from './check-ins.controller';
import { CheckInsService } from './check-ins.service';

@Module({
  controllers: [CoachCheckInsController, MeCheckInsController],
  providers: [CheckInsService],
})
export class CheckInsModule {}
