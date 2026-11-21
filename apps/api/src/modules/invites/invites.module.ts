import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PublicInvitesController } from './invites.controller';
import { InvitesService } from './invites.service';

@Module({
  imports: [AuthModule],
  controllers: [PublicInvitesController],
  providers: [InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}
