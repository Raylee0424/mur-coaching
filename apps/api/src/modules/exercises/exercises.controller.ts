import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import type { ExerciseAlternativesDto, ExerciseDto } from '@coaching/shared';
import { Role } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { CreateExerciseDto, ListExercisesQuery, UpdateExerciseDto } from './dto/exercises.dto';
import { ExercisesService } from './exercises.service';

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: ListExercisesQuery): Promise<ExerciseDto[]> {
    return this.exercises.list(user, query);
  }

  /** Coach → a coach-owned exercise; athlete → their own custom exercise. */
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateExerciseDto): Promise<ExerciseDto> {
    return this.exercises.create(user, dto);
  }

  /** Swap picker: same-muscle exercises with the client's own last top set as the suggested target. */
  @Roles(Role.CLIENT)
  @Get(':id/alternatives')
  alternatives(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<ExerciseAlternativesDto> {
    return this.exercises.alternatives(user, id);
  }

  @Post(':id/duplicate')
  duplicate(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<ExerciseDto> {
    return this.exercises.duplicate(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateExerciseDto,
  ): Promise<ExerciseDto> {
    return this.exercises.update(user, id, dto);
  }

  /** Soft archive of the caller's own exercise; history stays intact. */
  @Delete(':id')
  @HttpCode(204)
  archive(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.exercises.archive(user, id);
  }
}
