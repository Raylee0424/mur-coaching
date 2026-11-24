import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { ClientVideosDto, FormCheckQueueDto, UploadTicketDto, VideoAnnotationDto } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { CreateAnnotationDto, CreateReviewAudioDto, CreateSetVideoDto, SubmitFormReviewDto } from './videos.dto';
import { VideosService } from './videos.service';

/** Owner-only: every query is scoped to the signed-in client. */
@Roles(Role.CLIENT)
@Controller('me/set-videos')
export class MeVideosController {
  constructor(private readonly videos: VideosService) {}

  @Get()
  list(@CurrentUser() user: RequestUser): Promise<ClientVideosDto> {
    return this.videos.clientVideos(user.id);
  }

  @Post()
  reserve(@CurrentUser() user: RequestUser, @Body() dto: CreateSetVideoDto): Promise<UploadTicketDto> {
    return this.videos.reserveVideo(user.id, dto);
  }

  @Post(':id/complete')
  @HttpCode(204)
  complete(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.videos.completeVideo(user.id, id);
  }

  @Post(':id/form-check')
  @HttpCode(204)
  requestReview(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.videos.requestReview(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.videos.deleteVideo(user.id, id);
  }
}

/** Tenancy: VideosService.ownedReview 404s unless the review is this coach's and the client is on their roster. */
@Roles(Role.COACH)
@Controller('coach/form-checks')
export class CoachFormChecksController {
  constructor(private readonly videos: VideosService) {}

  @Get()
  queue(@CurrentUser() user: RequestUser): Promise<FormCheckQueueDto> {
    return this.videos.queue(user.id);
  }

  @Post(':id/annotations')
  annotate(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CreateAnnotationDto): Promise<VideoAnnotationDto> {
    return this.videos.addAnnotation(user.id, id, dto);
  }

  @Delete(':id/annotations/:annotationId')
  @HttpCode(204)
  removeAnnotation(@CurrentUser() user: RequestUser, @Param('id') id: string, @Param('annotationId') annotationId: string): Promise<void> {
    return this.videos.removeAnnotation(user.id, id, annotationId);
  }

  @Post(':id/audio')
  reserveAudio(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CreateReviewAudioDto): Promise<UploadTicketDto> {
    return this.videos.reserveAudio(user.id, id, dto);
  }

  @Post(':id/audio/:assetId/complete')
  @HttpCode(204)
  completeAudio(@CurrentUser() user: RequestUser, @Param('id') id: string, @Param('assetId') assetId: string): Promise<void> {
    return this.videos.completeAudio(user.id, id, assetId);
  }

  @Post(':id/submit')
  @HttpCode(204)
  submit(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: SubmitFormReviewDto): Promise<void> {
    return this.videos.submit(user.id, id, dto.summary);
  }
}
