import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { LimitationsController } from './limitations.controller';
import { LimitationsService } from './limitations.service';

@Module({
  imports: [ClientsModule],
  controllers: [LimitationsController],
  providers: [LimitationsService],
  exports: [LimitationsService],
})
export class LimitationsModule {}
