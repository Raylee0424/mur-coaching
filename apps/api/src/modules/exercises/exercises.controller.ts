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

  @Roles(Role.COACH)
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateExerciseDto): Promise<ExerciseDto> {
    return this.exercises.create(user.id, dto);
  }

  /** Swap picker: same-muscle exercises with the client's own last top set as the suggested target. */
  @Roles(Role.CLIENT)
  @Get(':id/alternatives')
  alternatives(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<ExerciseAlternativesDto> {
    return this.exercises.alternatives(user, id);
  }

  @Roles(Role.COACH)
  @Post(':id/duplicate')
  duplicate(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<ExerciseDto> {
    return this.exercises.duplicate(user.id, id);
  }

  @Roles(Role.COACH)
  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateExerciseDto,
  ): Promise<ExerciseDto> {
    return this.exercises.update(user.id, id, dto);
  }

  /** Soft archive of a coach-owned exercise; history stays intact. */
  @Roles(Role.COACH)
  @Delete(':id')
  @HttpCode(204)
  archive(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.exercises.archive(user.id, id);
  }
}
