import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { ExerciseNoteDto } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { CreateExerciseNoteDto, UpdateExerciseNoteDto } from './dto/exercise-notes.dto';
import { ExerciseNotesService } from './exercise-notes.service';

@Roles(Role.CLIENT)
@Controller('exercise-notes')
export class ExerciseNotesController {
  constructor(private readonly notes: ExerciseNotesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query('exerciseId') exerciseId?: string): Promise<ExerciseNoteDto[]> {
    return this.notes.list(user.id, exerciseId);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateExerciseNoteDto): Promise<ExerciseNoteDto> {
    return this.notes.create(user.id, dto.exerciseId, dto.body);
  }

  @Patch(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateExerciseNoteDto): Promise<ExerciseNoteDto> {
    return this.notes.update(user.id, id, dto.body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.notes.remove(user.id, id);
  }
}
