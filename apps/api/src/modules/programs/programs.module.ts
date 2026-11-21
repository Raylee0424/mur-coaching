import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { AssignmentsController, ProgramsController } from './programs.controller';
import { ProgramsService } from './programs.service';

@Module({
  imports: [ClientsModule],
  controllers: [ProgramsController, AssignmentsController],
  providers: [ProgramsService],
})
export class ProgramsModule {}
