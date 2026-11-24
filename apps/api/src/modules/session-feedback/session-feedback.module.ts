import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { SessionFeedbackController } from './session-feedback.controller';
import { SessionFeedbackService } from './session-feedback.service';

@Module({
  imports: [ClientsModule],
  controllers: [SessionFeedbackController],
  providers: [SessionFeedbackService],
  exports: [SessionFeedbackService],
})
export class SessionFeedbackModule {}
