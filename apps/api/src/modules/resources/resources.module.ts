import { Module } from '@nestjs/common';
import { CoachResourcesController, MeResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { StorageService } from './storage.service';

@Module({
  controllers: [CoachResourcesController, MeResourcesController],
  providers: [ResourcesService, StorageService],
})
export class ResourcesModule {}
