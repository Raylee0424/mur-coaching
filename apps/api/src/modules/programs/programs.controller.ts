import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { AssignmentDto, ClientProgramConflictsDto, ProgramDto, ProgramShareDto, ProgramSummaryDto, SharedProgramDto, SportCategoryDto } from '@coaching/shared';
import { CurrentUser, Public, RateLimit, RequestUser, Roles } from '../../common';
import { ClientAccessService } from '../clients/client-access.service';
import { CreateAssignmentDto, DuplicateProgramDto, ListProgramsQuery, ProgramConflictsQuery, ProgramTreeDto } from './dto/program.dto';
import { ProgramsService } from './programs.service';

@Controller('programs')
export class ProgramsController {
  constructor(private readonly programs: ProgramsService) {}

  @Roles(Role.COACH)
  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: ListProgramsQuery): Promise<ProgramSummaryDto[]> {
    return this.programs.list(user.id, query.template);
  }

  @Roles(Role.COACH)
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: ProgramTreeDto): Promise<ProgramDto> {
    return this.programs.create(user.id, dto);
  }

  /**
   * Advisory warnings: prescriptions flagged by clients' active limitations. `?clientIds=a,b` checks those clients
   * (e.g. before assigning); otherwise every client actively assigned to the program. Ids outside the coach's
   * accessible roster are dropped, never reported.
   */
  @Roles(Role.COACH)
  @Get(':id/conflicts')
  conflicts(@CurrentUser() user: RequestUser, @Param('id') id: string, @Query() query: ProgramConflictsQuery): Promise<ClientProgramConflictsDto[]> {
    return this.programs.conflicts(user.id, id, query.clientIds);
  }

  /** Mints (or replaces) the read-only preview link. The token is in this response only. */
  @Roles(Role.COACH)
  @Post(':id/share')
  share(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<ProgramShareDto> {
    return this.programs.createShare(user.id, id);
  }

  @Roles(Role.COACH)
  @Delete(':id/share')
  @HttpCode(204)
  unshare(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.programs.revokeShare(user.id, id);
  }

  /** Owning coach, or a client assigned to it. */
  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<ProgramDto> {
    return this.programs.get(user, id);
  }

  @Roles(Role.COACH)
  @Put(':id')
  replace(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: ProgramTreeDto): Promise<ProgramDto> {
    return this.programs.replace(user.id, id, dto);
  }

  /** Copy a program; with `{ asTemplate: true }` this is "save as template". */
  @Roles(Role.COACH)
  @Post(':id/duplicate')
  duplicate(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: DuplicateProgramDto): Promise<ProgramDto> {
    return this.programs.duplicate(user.id, id, dto);
  }

  @Roles(Role.COACH)
  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.programs.remove(user.id, id);
  }
}

@Controller('sport-categories')
export class SportCategoriesController {
  constructor(private readonly programs: ProgramsService) {}

  @Roles(Role.COACH)
  @Get()
  list(): Promise<SportCategoryDto[]> {
    return this.programs.sportCategories();
  }
}

/** Anyone holding the link may read the plan. The 256-bit token is the credential; only its hash is stored. */
@Controller('shared-programs')
export class SharedProgramsController {
  constructor(private readonly programs: ProgramsService) {}

  @Public()
  @RateLimit(60, 60_000)
  @Get(':token')
  get(@Param('token') token: string): Promise<SharedProgramDto> {
    return this.programs.getShared(token);
  }
}

@Controller('clients/:clientId/assignments')
export class AssignmentsController {
  constructor(
    private readonly programs: ProgramsService,
    private readonly access: ClientAccessService,
  ) {}

  @Roles(Role.COACH)
  @Post()
  async create(
    @CurrentUser() user: RequestUser,
    @Param('clientId') clientId: string,
    @Body() dto: CreateAssignmentDto,
  ): Promise<AssignmentDto> {
    await this.access.assertCanAccessClient(user, clientId);
    return this.programs.assign(user.id, clientId, dto.programId, dto.startDate);
  }
}
