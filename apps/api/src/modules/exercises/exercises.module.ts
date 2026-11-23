import { Module } from '@nestjs/common';
import { LimitationsModule } from '../limitations/limitations.module';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';

@Module({ imports: [LimitationsModule], controllers: [ExercisesController], providers: [ExercisesService] })
export class ExercisesModule {}
