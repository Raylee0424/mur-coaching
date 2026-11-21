import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { AssignmentDto, ProgramDto, ProgramSummaryDto } from '@coaching/shared';
import { CurrentUser, RequestUser, Roles } from '../../common';
import { ClientAccessService } from '../clients/client-access.service';
import { CreateAssignmentDto, ProgramTreeDto } from './dto/program.dto';
import { ProgramsService } from './programs.service';

@Controller('programs')
export class ProgramsController {
  constructor(private readonly programs: ProgramsService) {}

  @Roles(Role.COACH)
  @Get()
  list(@CurrentUser() user: RequestUser): Promise<ProgramSummaryDto[]> {
    return this.programs.list(user.id);
  }

  @Roles(Role.COACH)
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: ProgramTreeDto): Promise<ProgramDto> {
    return this.programs.create(user.id, dto);
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

  @Roles(Role.COACH)
  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.programs.remove(user.id, id);
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
