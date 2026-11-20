import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { uuidSchema } from '../common/schemas.js';
import {
  createBookingSchema,
  listBookingsSchema,
  rescheduleSchema,
  type CreateBookingInput,
  type ListBookingsQuery,
  type RescheduleInput,
} from './bookings.schemas.js';
import { BookingsService } from './bookings.service.js';

@ApiTags('Reservas')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: createBookingSchema }) body: CreateBookingInput,
  ) {
    return this.bookings.create(user, body);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query({ schema: listBookingsSchema }) query: ListBookingsQuery,
  ) {
    return this.bookings.list(user, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: uuidSchema }) id: string,
  ) {
    return this.bookings.findOne(user, id);
  }

  @Patch(':id')
  reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: uuidSchema }) id: string,
    @Body({ schema: rescheduleSchema }) body: RescheduleInput,
  ) {
    return this.bookings.reschedule(user, id, body);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: uuidSchema }) id: string,
  ) {
    return this.bookings.cancel(user, id);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: uuidSchema }) id: string) {
    return this.bookings.remove(id);
  }
}
