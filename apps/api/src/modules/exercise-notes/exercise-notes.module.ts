import { Module } from '@nestjs/common';
import { ExerciseNotesController } from './exercise-notes.controller';
import { ExerciseNotesService } from './exercise-notes.service';

@Module({ controllers: [ExerciseNotesController], providers: [ExerciseNotesService] })
export class ExerciseNotesModule {}
