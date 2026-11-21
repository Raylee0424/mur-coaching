import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { Exercise } from '@prisma/client';
import { Role } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { CreateExerciseDto, ListExercisesQuery, UpdateExerciseDto } from './dto/exercises.dto';
import { ExercisesService } from './exercises.service';

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: ListExercisesQuery): Promise<Exercise[]> {
    return this.exercises.list(user, query);
  }

  @Roles(Role.COACH)
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateExerciseDto): Promise<Exercise> {
    return this.exercises.create(user.id, dto);
  }

  @Roles(Role.COACH)
  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateExerciseDto,
  ): Promise<Exercise> {
    return this.exercises.update(user.id, id, dto);
  }
}
