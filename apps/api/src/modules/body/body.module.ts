import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { StorageModule } from '../storage/storage.module';
import { CoachProgressController, MeBodyController } from './body.controller';
import { BodyService } from './body.service';

@Module({
  imports: [ClientsModule, StorageModule],
  controllers: [MeBodyController, CoachProgressController],
  providers: [BodyService],
})
export class BodyModule {}
