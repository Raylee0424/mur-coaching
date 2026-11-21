import { Module } from '@nestjs/common';
import { ClientAccessService } from './client-access.service';
import { ClientSettingsService } from './client-settings.service';
import { MeProfileController } from './me-profile.controller';
import { MeProfileService } from './me-profile.service';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  controllers: [ClientsController, MeProfileController],
  providers: [ClientAccessService, ClientsService, ClientSettingsService, MeProfileService],
  exports: [ClientAccessService],
})
export class ClientsModule {}
