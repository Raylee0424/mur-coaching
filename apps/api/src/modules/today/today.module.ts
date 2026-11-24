import { Module } from '@nestjs/common';
import { LimitationsModule } from '../limitations/limitations.module';
import { SessionFeedbackModule } from '../session-feedback/session-feedback.module';
import { TodayController } from './today.controller';
import { TodayService } from './today.service';

@Module({ imports: [LimitationsModule, SessionFeedbackModule], controllers: [TodayController], providers: [TodayService] })
export class TodayModule {}
