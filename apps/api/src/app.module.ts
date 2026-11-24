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
import { LeadsModule } from './modules/leads/leads.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { RoadmapsModule } from './modules/roadmaps/roadmaps.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { CheckInsModule } from './modules/check-ins/check-ins.module';
import { BodyModule } from './modules/body/body.module';
import { BillingModule } from './modules/billing/billing.module';
import { EntitlementGuard } from './modules/billing/entitlement.guard';
import { PrismaModule } from './prisma/prisma.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    // Limits are per route via @RateLimit; no global ThrottlerGuard.
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 60 }], errorMessage: 'Too many requests. Wait a few minutes and try again.' }),
    BillingModule, MailModule, AuthModule, ClientsModule, ProgressionModule, WorkoutLogsModule, ExercisesModule, ProgramsModule, InvitesModule, LimitationsModule, TemplatesModule, ExerciseNotesModule, TodayModule, RecordsModule, ScheduleModule, SessionFeedbackModule, ClientGroupsModule, LeadsModule, ResourcesModule, RoadmapsModule, MessagingModule, CheckInsModule, BodyModule],
  providers: [
    // Order matters: authenticate first, then authorize by role.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Then plan features (@RequiresFeature), answering 402.
    { provide: APP_GUARD, useExisting: EntitlementGuard },
  ],
})
export class AppModule {}
