import { Module } from '@nestjs/common';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { ModeratorGuard } from './moderator.guard';

@Module({ controllers: [ModerationController], providers: [ModerationService, ModeratorGuard] })
export class ModerationModule {}
