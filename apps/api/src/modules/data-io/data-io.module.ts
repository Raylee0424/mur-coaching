import { Module } from '@nestjs/common';
import { ReadinessModule } from '../readiness/readiness.module';
import { RecordsModule } from '../records/records.module';
import { MeDataController } from './data-io.controller';
import { DataExportService } from './data-export.service';
import { DataImportService } from './data-import.service';

@Module({ imports: [RecordsModule, ReadinessModule], controllers: [MeDataController], providers: [DataImportService, DataExportService] })
export class DataIoModule {}
