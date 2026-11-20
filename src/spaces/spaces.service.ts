import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { formatDate, parseDate } from '../common/dates.js';
import { paginate, toCents } from '../common/schemas.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toSpaceResponse } from './space.mapper.js';
import type {
  AvailabilityQuery,
  CreateSpaceInput,
  ListSpacesQuery,
  UpdateSpaceInput,
} from './spaces.schemas.js';

/** Reservas ativas que cruzam o período [from, to). */
export const overlapping = (
  from: Date,
  to: Date,
): Prisma.BookingWhereInput => ({
  status: 'CONFIRMED',
  startDate: { lt: to },
  endDate: { gt: from },
});

@Injectable()
export class SpacesService {
  constructor(private readonly prisma: PrismaService) {}

  private async findOrFail(id: string) {
    const space = await this.prisma.space.findUnique({ where: { id } });
    if (!space) throw new NotFoundException('Espaço não encontrado');
    return space;
  }

  async findOne(id: string) {
    return toSpaceResponse(await this.findOrFail(id));
  }

  async list(q: ListSpacesQuery) {
    const where: Prisma.SpaceWhereInput = { available: true };
    if (q.city) where.city = { equals: q.city, mode: 'insensitive' };
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' };
    if (q.amenities?.length) where.amenities = { hasEvery: q.amenities };
    if (q.minCapacity) where.capacity = { gte: q.minCapacity };
    if (q.maxPrice !== undefined)
      where.pricePerDayCents = { lte: toCents(q.maxPrice) };
    if (q.from && q.to)
      where.bookings = {
        none: overlapping(parseDate(q.from), parseDate(q.to)),
      };

    const [total, spaces] = await this.prisma.$transaction([
      this.prisma.space.count({ where }),
      this.prisma.space.findMany({
        where,
        orderBy: [{ [q.sortBy]: q.order }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
    ]);
    return paginate(spaces.map(toSpaceResponse), total, q.page, q.limit);
  }

  async availability(id: string, { from, to }: AvailabilityQuery) {
    const space = await this.findOrFail(id);
    const occupied = await this.prisma.booking.findMany({
      where: { spaceId: id, ...overlapping(parseDate(from), parseDate(to)) },
      select: { startDate: true, endDate: true },
      orderBy: { startDate: 'asc' },
    });
    return {
      spaceId: id,
      from,
      to,
      available: space.available && occupied.length === 0,
      occupied: occupied.map((b) => ({
        startDate: formatDate(b.startDate),
        endDate: formatDate(b.endDate),
      })),
    };
  }

  async create({ pricePerDay, ...data }: CreateSpaceInput) {
    return toSpaceResponse(
      await this.prisma.space.create({
        data: { ...data, pricePerDayCents: toCents(pricePerDay) },
      }),
    );
  }

  async update(id: string, { pricePerDay, ...data }: UpdateSpaceInput) {
    await this.findOrFail(id);
    const space = await this.prisma.space.update({
      where: { id },
      data: {
        ...data,
        ...(pricePerDay !== undefined && {
          pricePerDayCents: toCents(pricePerDay),
        }),
      },
    });
    return toSpaceResponse(space);
  }

  async remove(id: string) {
    await this.findOrFail(id);
    const upcoming = await this.prisma.booking.count({
      where: { spaceId: id, status: 'CONFIRMED', endDate: { gt: new Date() } },
    });
    if (upcoming) {
      throw new ConflictException(
        'O espaço possui reservas futuras. Desative-o (available: false) ou cancele as reservas',
      );
    }
    await this.prisma.$transaction([
      this.prisma.booking.deleteMany({ where: { spaceId: id } }),
      this.prisma.space.delete({ where: { id } }),
    ]);
  }
}
