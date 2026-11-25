import { Module } from '@nestjs/common';
import { MeHealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({ controllers: [MeHealthController], providers: [HealthService], exports: [HealthService] })
export class HealthModule {}
