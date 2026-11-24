import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { LimitationsModule } from '../limitations/limitations.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { AssignmentsController, ProgramsController, SharedProgramsController, SportCategoriesController } from './programs.controller';
import { ProgramsService } from './programs.service';

@Module({
  imports: [ClientsModule, LimitationsModule, ScheduleModule],
  controllers: [ProgramsController, AssignmentsController, SportCategoriesController, SharedProgramsController],
  providers: [ProgramsService],
  exports: [ProgramsService],
})
export class ProgramsModule {}
