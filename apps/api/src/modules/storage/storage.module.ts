import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/** Cloudflare R2 access shared by the resource vault and progress photos. */
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
