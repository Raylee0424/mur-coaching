import { Module } from '@nestjs/common';
import { InvitesModule } from '../invites/invites.module';
import { OverviewService } from './overview.service';
import { RosterService } from './roster.service';
import { ClientAccessService } from './client-access.service';
import { ClientSettingsService } from './client-settings.service';
import { MeProfileController } from './me-profile.controller';
import { MeProfileService } from './me-profile.service';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  imports: [InvitesModule],
  controllers: [ClientsController, MeProfileController],
  providers: [ClientAccessService, ClientsService, ClientSettingsService, MeProfileService, RosterService, OverviewService],
  exports: [ClientAccessService],
})
export class ClientsModule {}
