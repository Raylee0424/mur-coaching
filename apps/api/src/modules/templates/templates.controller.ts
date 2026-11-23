import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { TemplateFolderDto as FolderView, WorkoutTemplateDto as TemplateView } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { CreateWorkoutTemplateDto, TemplateFolderDto, UpdateWorkoutTemplateDto } from './dto/templates.dto';
import { TemplatesService } from './templates.service';

/** Athlete-owned: a template belongs to the signed-in client, coached or solo. */
@Roles(Role.CLIENT)
@Controller()
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get('template-folders')
  listFolders(@CurrentUser() user: RequestUser): Promise<FolderView[]> {
    return this.templates.listFolders(user.id);
  }

  @Post('template-folders')
  createFolder(@CurrentUser() user: RequestUser, @Body() dto: TemplateFolderDto): Promise<FolderView> {
    return this.templates.createFolder(user.id, dto.name);
  }

  @Patch('template-folders/:id')
  renameFolder(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: TemplateFolderDto): Promise<FolderView> {
    return this.templates.renameFolder(user.id, id, dto.name);
  }

  @Delete('template-folders/:id')
  @HttpCode(204)
  removeFolder(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.templates.removeFolder(user.id, id);
  }

  @Get('workout-templates')
  list(@CurrentUser() user: RequestUser, @Query('folderId') folderId?: string): Promise<TemplateView[]> {
    return this.templates.list(user.id, folderId);
  }

  @Get('workout-templates/:id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<TemplateView> {
    return this.templates.get(user.id, id);
  }

  @Post('workout-templates')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateWorkoutTemplateDto): Promise<TemplateView> {
    return this.templates.create(user.id, dto);
  }

  @Patch('workout-templates/:id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateWorkoutTemplateDto): Promise<TemplateView> {
    return this.templates.update(user.id, id, dto);
  }

  @Delete('workout-templates/:id')
  @HttpCode(204)
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.templates.remove(user.id, id);
  }
}
