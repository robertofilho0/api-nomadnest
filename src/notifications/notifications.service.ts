import { Injectable, NotFoundException } from '@nestjs/common';
import { paginate } from '../common/schemas.js';
import type { NotificationType } from '../generated/prisma/client.js';
import {
  BOOKING_EVENTS,
  type BookingEvent,
  type BookingEventName,
} from '../messaging/events.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailerService } from './mailer.service.js';

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const br = (date: string) => date.split('-').reverse().join('/');

const TEMPLATES: Record<
  BookingEventName,
  {
    type: NotificationType;
    title: (e: BookingEvent) => string;
    message: (e: BookingEvent) => string;
  }
> = {
  [BOOKING_EVENTS.CONFIRMED]: {
    type: 'BOOKING_CONFIRMED',
    title: (e) => `Reserva confirmada: ${e.spaceName}`,
    message: (e) =>
      `${e.spaceName} (${e.city}) de ${br(e.startDate)} a ${br(e.endDate)}. Total: ${brl(e.total)}.`,
  },
  [BOOKING_EVENTS.RESCHEDULED]: {
    type: 'BOOKING_RESCHEDULED',
    title: (e) => `Reserva remarcada: ${e.spaceName}`,
    message: (e) =>
      `Novo período: ${br(e.startDate)} a ${br(e.endDate)}. Novo total: ${brl(e.total)}.`,
  },
  [BOOKING_EVENTS.CANCELLED]: {
    type: 'BOOKING_CANCELLED',
    title: (e) => `Reserva cancelada: ${e.spaceName}`,
    message: (e) =>
      `A reserva de ${br(e.startDate)} a ${br(e.endDate)} foi cancelada.`,
  },
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  /** Worker: transforma um evento de reserva em notificação + e-mail. */
  async handle(pattern: BookingEventName, event: BookingEvent) {
    const template = TEMPLATES[pattern];
    if (!template) return null;

    const user = await this.prisma.user.findUnique({
      where: { id: event.userId },
      select: { id: true },
    });
    if (!user) return null; // usuário removido antes do processamento

    const booking = await this.prisma.booking.findUnique({
      where: { id: event.bookingId },
      select: { id: true },
    });
    const title = template.title(event);
    const message = template.message(event);

    const notification = await this.prisma.notification.create({
      data: {
        userId: event.userId,
        bookingId: booking?.id ?? null,
        type: template.type,
        title,
        message,
      },
    });
    await this.mailer.send(event.userEmail, title, message);
    return notification;
  }

  async listMine(
    userId: string,
    { unread, page, limit }: { unread?: boolean; page: number; limit: number },
  ) {
    const where = {
      userId,
      ...(unread !== undefined && { readAt: unread ? null : { not: null } }),
    };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      ...paginate(data, total, page, limit),
      unread: await this.prisma.notification.count({
        where: { userId, readAt: null },
      }),
    };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification)
      throw new NotFoundException('Notificação não encontrada');
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: notification.readAt ?? new Date() },
    });
  }

  async markAllRead(userId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: count };
  }
}
