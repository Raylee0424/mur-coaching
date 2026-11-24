import { Module } from '@nestjs/common';
import { ProgramsModule } from '../programs/programs.module';
import { ClientGroupsController } from './client-groups.controller';
import { ClientGroupsService } from './client-groups.service';

@Module({ imports: [ProgramsModule], controllers: [ClientGroupsController], providers: [ClientGroupsService] })
export class ClientGroupsModule {}
