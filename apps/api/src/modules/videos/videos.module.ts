import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { CoachFormChecksController, MeVideosController } from './videos.controller';
import { VideosService } from './videos.service';

@Module({
  imports: [StorageModule],
  controllers: [MeVideosController, CoachFormChecksController],
  providers: [VideosService],
})
export class VideosModule {}
