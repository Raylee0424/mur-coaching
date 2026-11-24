import { Module } from '@nestjs/common';
import { CoachMessagingController, MeMessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';

@Module({
  controllers: [CoachMessagingController, MeMessagingController],
  providers: [MessagingService],
})
export class MessagingModule {}
