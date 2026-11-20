import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import {
  daysBetween,
  formatDate,
  parseDate,
  todayUtc,
} from '../common/dates.js';
import { fromCents, paginate } from '../common/schemas.js';
import type { Booking, Prisma } from '../generated/prisma/client.js';
import { EventPublisher } from '../messaging/event-publisher.js';
import {
  BOOKING_EVENTS,
  type BookingEvent,
  type BookingEventName,
} from '../messaging/events.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toSpaceResponse } from '../spaces/space.mapper.js';
import { overlapping } from '../spaces/spaces.service.js';
import type {
  CreateBookingInput,
  ListBookingsQuery,
  RescheduleInput,
} from './bookings.schemas.js';

type Tx = Prisma.TransactionClient;

const include = {
  space: true,
  user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.BookingInclude;

type BookingWithRelations = Prisma.BookingGetPayload<{
  include: typeof include;
}>;

function toBookingResponse({
  totalCents,
  space,
  startDate,
  endDate,
  ...b
}: BookingWithRelations) {
  return {
    ...b,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    total: fromCents(totalCents),
    space: toSpaceResponse(space),
  };
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventPublisher,
  ) {}

  /**
   * Trava a linha do espaço até o fim da transação (SELECT ... FOR UPDATE).
   * Assim duas reservas simultâneas para o mesmo espaço são processadas uma de cada vez
   * e a checagem de conflito nunca é burlada.
   */
  private async lockSpace(tx: Tx, spaceId: string) {
    const [space] = await tx.$queryRaw<
      { available: boolean; price_per_day_cents: number }[]
    >`
      SELECT available, price_per_day_cents FROM spaces WHERE id = ${spaceId}::uuid FOR UPDATE`;
    if (!space) throw new NotFoundException('Espaço não encontrado');
    if (!space.available)
      throw new ConflictException('Espaço indisponível para reservas');
    return space;
  }

  private async ensureNoConflict(
    tx: Tx,
    spaceId: string,
    start: Date,
    end: Date,
    ignoreId?: string,
  ) {
    const conflict = await tx.booking.findFirst({
      where: {
        spaceId,
        ...overlapping(start, end),
        ...(ignoreId && { id: { not: ignoreId } }),
      },
      select: { id: true },
    });
    if (conflict)
      throw new ConflictException(
        'Espaço já reservado para o período selecionado',
      );
  }

  /** Busca a reserva garantindo que o usuário é o dono (ou admin). */
  private async findAllowed(id: string, user: AuthUser): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking || (user.role !== 'ADMIN' && booking.userId !== user.id)) {
      throw new NotFoundException('Reserva não encontrada'); // não revela reservas de outras pessoas
    }
    return booking;
  }

  private async publish(name: BookingEventName, bookingId: string) {
    const b = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include,
    });
    const event: BookingEvent = {
      bookingId: b.id,
      userId: b.userId,
      userEmail: b.user.email,
      spaceName: b.space.name,
      city: b.space.city,
      startDate: formatDate(b.startDate),
      endDate: formatDate(b.endDate),
      total: fromCents(b.totalCents),
      occurredAt: new Date().toISOString(),
    };
    await this.events.publish(name, event);
    return toBookingResponse(b);
  }

  async create(
    user: AuthUser,
    { spaceId, startDate, endDate, notes }: CreateBookingInput,
  ) {
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    const booking = await this.prisma.$transaction(async (tx) => {
      const space = await this.lockSpace(tx, spaceId);
      await this.ensureNoConflict(tx, spaceId, start, end);
      const days = daysBetween(start, end);
      return tx.booking.create({
        data: {
          userId: user.id,
          spaceId,
          startDate: start,
          endDate: end,
          days,
          totalCents: days * space.price_per_day_cents,
          notes,
        },
      });
    });

    return this.publish(BOOKING_EVENTS.CONFIRMED, booking.id);
  }

  async reschedule(user: AuthUser, id: string, input: RescheduleInput) {
    const current = await this.findAllowed(id, user);
    if (current.status === 'CANCELLED')
      throw new ConflictException('Reserva cancelada não pode ser alterada');
    if (current.startDate <= todayUtc())
      throw new ConflictException('Reserva já iniciada não pode ser alterada');

    const start = input.startDate
      ? parseDate(input.startDate)
      : current.startDate;
    const end = input.endDate ? parseDate(input.endDate) : current.endDate;
    if (start >= end)
      throw new ConflictException('A data final deve ser posterior à inicial');

    await this.prisma.$transaction(async (tx) => {
      const space = await this.lockSpace(tx, current.spaceId);
      await this.ensureNoConflict(tx, current.spaceId, start, end, id);
      const days = daysBetween(start, end);
      await tx.booking.update({
        where: { id },
        data: {
          startDate: start,
          endDate: end,
          days,
          totalCents: days * space.price_per_day_cents,
        },
      });
    });

    return this.publish(BOOKING_EVENTS.RESCHEDULED, id);
  }

  async cancel(user: AuthUser, id: string) {
    const booking = await this.findAllowed(id, user);
    if (booking.status === 'CANCELLED')
      throw new ConflictException('Reserva já cancelada');
    if (booking.startDate <= todayUtc())
      throw new ConflictException('Reserva já iniciada não pode ser cancelada');

    await this.prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    return this.publish(BOOKING_EVENTS.CANCELLED, id);
  }

  async findOne(user: AuthUser, id: string) {
    await this.findAllowed(id, user);
    return toBookingResponse(
      await this.prisma.booking.findUniqueOrThrow({ where: { id }, include }),
    );
  }

  async list(
    user: AuthUser,
    { status, when, spaceId, page, limit }: ListBookingsQuery,
  ) {
    const where: Prisma.BookingWhereInput =
      user.role === 'ADMIN' ? {} : { userId: user.id };
    if (status) where.status = status;
    if (spaceId) where.spaceId = spaceId;
    if (when === 'upcoming') where.endDate = { gt: todayUtc() };
    if (when === 'past') where.endDate = { lte: todayUtc() };

    const [total, bookings] = await this.prisma.$transaction([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        include,
        orderBy: [
          { startDate: when === 'past' ? 'desc' : 'asc' },
          { id: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return paginate(bookings.map(toBookingResponse), total, page, limit);
  }

  async remove(id: string) {
    if (!(await this.prisma.booking.findUnique({ where: { id } })))
      throw new NotFoundException('Reserva não encontrada');
    await this.prisma.booking.delete({ where: { id } });
  }
}
