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
import { TodayModule } from './modules/today/today.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule, MailModule, AuthModule, ClientsModule, ProgressionModule, WorkoutLogsModule, ExercisesModule, ProgramsModule, InvitesModule, LimitationsModule, TodayModule],
  providers: [
    // Order matters: authenticate first, then authorize by role.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
