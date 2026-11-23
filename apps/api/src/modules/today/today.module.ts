import { Module } from '@nestjs/common';
import { LimitationsModule } from '../limitations/limitations.module';
import { TodayController } from './today.controller';
import { TodayService } from './today.service';

@Module({ imports: [LimitationsModule], controllers: [TodayController], providers: [TodayService] })
export class TodayModule {}
