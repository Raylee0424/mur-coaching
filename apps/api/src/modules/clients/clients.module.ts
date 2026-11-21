import { Module } from '@nestjs/common';
import { ClientAccessService } from './client-access.service';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  controllers: [ClientsController],
  providers: [ClientAccessService, ClientsService],
  exports: [ClientAccessService],
})
export class ClientsModule {}
