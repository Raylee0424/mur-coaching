import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { Feature, Role } from '@coaching/shared';
import type {
  AiConversationDto,
  AskCoachResponse,
  CoachOverviewDto,
  ConnectorGrantDto,
  CreatedConnectorDto,
  GeneratedWorkoutDto,
  VoiceParseResponse,
} from '@coaching/shared';
import { CurrentUser, Public, RateLimit, RequestUser, RequiresFeature, Roles } from '../../common';
import { AskCoachDto, CreateConnectorDto, GenerateWorkoutDto, VoiceParseDto } from './ai.dto';
import { CoachService } from './coach.service';
import { ConnectorsService } from './connectors.service';
import { VoiceService } from './voice.service';
import { WorkoutGeneratorService } from './workout-generator.service';

const MINUTE = 60_000;

/** Athlete Pro AI tools. Owner-only (every query uses the caller's id); 402 without the feature, 429 over the daily cap. */
@Roles(Role.CLIENT)
@Controller('ai')
export class AiController {
  constructor(
    private readonly coach: CoachService,
    private readonly generator: WorkoutGeneratorService,
    private readonly voice: VoiceService,
  ) {}

  @Get('coach')
  @RequiresFeature(Feature.AI_COACH)
  overview(@CurrentUser() user: RequestUser): Promise<CoachOverviewDto> {
    return this.coach.overview(user.id);
  }

  @Get('coach/conversations/:id')
  @RequiresFeature(Feature.AI_COACH)
  conversation(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<AiConversationDto> {
    return this.coach.get(user.id, id);
  }

  @Delete('coach/conversations/:id')
  @HttpCode(204)
  removeConversation(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.coach.remove(user.id, id);
  }

  @Post('coach')
  @RequiresFeature(Feature.AI_COACH)
  @RateLimit(10, MINUTE)
  ask(@CurrentUser() user: RequestUser, @Body() dto: AskCoachDto): Promise<AskCoachResponse> {
    return this.coach.ask(user.id, dto.question, dto.conversationId);
  }

  @Post('workouts')
  @HttpCode(200)
  @RequiresFeature(Feature.AI_WORKOUT_GENERATOR)
  @RateLimit(10, MINUTE)
  generate(@CurrentUser() user: RequestUser, @Body() dto: GenerateWorkoutDto): Promise<GeneratedWorkoutDto> {
    return this.generator.generate(user.id, dto);
  }

  @Post('voice/parse')
  @HttpCode(200)
  @RequiresFeature(Feature.VOICE_LOGGING)
  @RateLimit(30, MINUTE)
  parseVoice(@CurrentUser() user: RequestUser, @Body() dto: VoiceParseDto): Promise<VoiceParseResponse> {
    return this.voice.parse(user.id, dto.transcript);
  }
}

/** Connector management for the signed-in athlete. Creating needs Pro; listing and revoking never do. */
@Roles(Role.CLIENT)
@Controller('me/connectors')
export class MeConnectorsController {
  constructor(private readonly connectors: ConnectorsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser): Promise<ConnectorGrantDto[]> {
    return this.connectors.list(user.id);
  }

  @Post()
  @RequiresFeature(Feature.AI_COACH)
  @RateLimit(10, MINUTE)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateConnectorDto): Promise<CreatedConnectorDto> {
    return this.connectors.create(user.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  revoke(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.connectors.revoke(user.id, id);
  }
}

/** Read-only REST for outside AI apps, authenticated by a connector token instead of a session. */
@Public()
@Controller('connect/v1')
export class ConnectorReadController {
  constructor(private readonly connectors: ConnectorsService) {}

  @Get(':resource')
  @RateLimit(60, MINUTE)
  read(@Headers('authorization') authorization: string | undefined, @Param('resource') resource: string): Promise<unknown> {
    return this.connectors.read(authorization, resource);
  }
}
