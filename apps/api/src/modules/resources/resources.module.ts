import { Module } from '@nestjs/common';
import { CoachResourcesController, MeResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [CoachResourcesController, MeResourcesController],
  providers: [ResourcesService],
})
export class ResourcesModule {}
