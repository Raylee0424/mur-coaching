import { Module } from '@nestjs/common';
import { HealthModule } from '../health/health.module';
import { MeSocialController } from './social.controller';
import { SocialService } from './social.service';

@Module({ imports: [HealthModule], controllers: [MeSocialController], providers: [SocialService] })
export class SocialModule {}
