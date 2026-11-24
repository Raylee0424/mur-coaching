import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard, RolesGuard } from './common';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ProgressionModule } from './modules/progression/progression.module';
import { WorkoutLogsModule } from './modules/workout-logs/workout-logs.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { MailModule } from './modules/mail/mail.module';
import { InvitesModule } from './modules/invites/invites.module';
import { LimitationsModule } from './modules/limitations/limitations.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { ExerciseNotesModule } from './modules/exercise-notes/exercise-notes.module';
import { RecordsModule } from './modules/records/records.module';
import { TodayModule } from './modules/today/today.module';
import { ClientGroupsModule } from './modules/client-groups/client-groups.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { SessionFeedbackModule } from './modules/session-feedback/session-feedback.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule, MailModule, AuthModule, ClientsModule, ProgressionModule, WorkoutLogsModule, ExercisesModule, ProgramsModule, InvitesModule, LimitationsModule, TemplatesModule, ExerciseNotesModule, TodayModule, RecordsModule, ScheduleModule, SessionFeedbackModule, ClientGroupsModule],
  providers: [
    // Order matters: authenticate first, then authorize by role.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
