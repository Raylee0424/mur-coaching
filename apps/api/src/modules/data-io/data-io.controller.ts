import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { EXPORT_DATASETS, Role } from '@coaching/shared';
import type { ExportDataset, ImportCommitResponse, ImportJobDto, ImportPreviewDto as ImportPreview } from '@coaching/shared';
import { CurrentUser, RateLimit, RequestUser, Roles } from '../../common';
import { DataExportService } from './data-export.service';
import { DataImportService } from './data-import.service';
import { ImportCommitDto, ImportPreviewDto } from './data-io.dto';

/** Owner-only import (Strong, Hevy, MyFitnessPal, MacroFactor CSV) and full export. */
@Roles(Role.CLIENT)
@Controller('me/data')
export class MeDataController {
  constructor(
    private readonly imports: DataImportService,
    private readonly exports: DataExportService,
  ) {}

  @Get('imports')
  jobs(@CurrentUser() user: RequestUser): Promise<ImportJobDto[]> {
    return this.imports.jobs(user.id);
  }

  @Post('imports/preview')
  @HttpCode(200)
  @RateLimit(30, 60_000)
  preview(@CurrentUser() user: RequestUser, @Body() dto: ImportPreviewDto): Promise<ImportPreview> {
    return this.imports.preview(user.id, dto);
  }

  @Post('imports/commit')
  @RateLimit(10, 60_000)
  commit(@CurrentUser() user: RequestUser, @Body() dto: ImportCommitDto): Promise<ImportCommitResponse> {
    return this.imports.commit(user.id, dto);
  }

  @Post('imports/:id/rollback')
  @HttpCode(200)
  rollback(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<ImportJobDto> {
    return this.imports.rollback(user.id, id);
  }

  /**
   * `format=json` (default) is everything; `format=csv&dataset=workouts|nutrition|health` is one flat table.
   * Cycle entries are included only with `includeCycle=true`, and only in JSON.
   */
  @Get('export')
  @RateLimit(10, 60_000)
  async export(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) res: Response,
    @Query('format') format = 'json',
    @Query('dataset') dataset = 'workouts',
    @Query('includeCycle') includeCycle?: string,
  ): Promise<string | Record<string, unknown>> {
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Cache-Control', 'no-store');
    if (format === 'csv') {
      if (!(EXPORT_DATASETS as readonly string[]).includes(dataset)) throw new BadRequestException('Unknown dataset');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="mur-coaching-${dataset}-${stamp}.csv"`);
      return this.exports.csv(user.id, dataset as ExportDataset);
    }
    if (format !== 'json') throw new BadRequestException('Unknown format');
    res.setHeader('Content-Disposition', `attachment; filename="mur-coaching-export-${stamp}.json"`);
    return this.exports.json(user.id, includeCycle === 'true');
  }
}
