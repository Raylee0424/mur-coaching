import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { Role } from '@coaching/shared';
import type { AvailabilityDto, BookingDto, ClientCallsDto, CoachScheduleDto } from '@coaching/shared';
import { CurrentUser, RateLimit, RequestUser, Roles } from '../../common';
import { CreateBookingDto, SaveAvailabilityDto, UpdateBookingDto } from './calls.dto';
import { CallsService } from './calls.service';

const BOOK_LIMIT = [10, 60_000] as const;

/** Tenancy: bookings are filtered by coachId; booking for a client requires them on the accessible roster. */
@Roles(Role.COACH)
@Controller('coach')
export class CoachCallsController {
  constructor(private readonly calls: CallsService) {}

  @Get('schedule')
  schedule(@CurrentUser() user: RequestUser): Promise<CoachScheduleDto> {
    return this.calls.coachSchedule(user.id);
  }

  @Put('availability')
  saveAvailability(@CurrentUser() user: RequestUser, @Body() dto: SaveAvailabilityDto): Promise<AvailabilityDto> {
    return this.calls.saveAvailability(user.id, dto);
  }

  @Post('bookings')
  book(@CurrentUser() user: RequestUser, @Body() dto: CreateBookingDto): Promise<BookingDto> {
    return this.calls.coachBook(user.id, dto);
  }

  @Patch('bookings/:id')
  async update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateBookingDto): Promise<BookingDto> {
    return this.calls.update(this.calls.coachActor(user.id), id, dto);
  }

  @Post('bookings/:id/cancel')
  @HttpCode(204)
  async cancel(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.calls.cancel(this.calls.coachActor(user.id), id);
  }
}

@Roles(Role.CLIENT)
@Controller('me')
export class MeCallsController {
  constructor(private readonly calls: CallsService) {}

  @Get('calls')
  list(@CurrentUser() user: RequestUser): Promise<ClientCallsDto> {
    return this.calls.clientCalls(user.id);
  }

  @Post('bookings')
  @RateLimit(...BOOK_LIMIT)
  book(@CurrentUser() user: RequestUser, @Body() dto: CreateBookingDto): Promise<BookingDto> {
    return this.calls.clientBook(user.id, dto);
  }

  /** Clients may only move the time; agenda and link are the coach's. */
  @Patch('bookings/:id')
  @RateLimit(...BOOK_LIMIT)
  async update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateBookingDto): Promise<BookingDto> {
    return this.calls.update(await this.calls.clientActor(user.id), id, { startsAt: dto.startsAt });
  }

  @Post('bookings/:id/cancel')
  @HttpCode(204)
  async cancel(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.calls.cancel(await this.calls.clientActor(user.id), id);
  }
}
