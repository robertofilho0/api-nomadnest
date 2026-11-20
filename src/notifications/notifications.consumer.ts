import { Controller, Logger } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  Payload,
  type RmqContext,
} from '@nestjs/microservices';
import {
  BOOKING_EVENTS,
  type BookingEvent,
  type BookingEventName,
} from '../messaging/events.js';
import { NotificationsService } from './notifications.service.js';

/** Worker RabbitMQ: confirma (ack) a mensagem só depois de gerar a notificação. */
@Controller()
export class NotificationsConsumer {
  private readonly logger = new Logger(NotificationsConsumer.name);

  constructor(private readonly notifications: NotificationsService) {}

  @EventPattern<string>(BOOKING_EVENTS.CONFIRMED)
  onConfirmed(@Payload() event: BookingEvent, @Ctx() ctx: RmqContext) {
    return this.process(BOOKING_EVENTS.CONFIRMED, event, ctx);
  }

  @EventPattern<string>(BOOKING_EVENTS.RESCHEDULED)
  onRescheduled(@Payload() event: BookingEvent, @Ctx() ctx: RmqContext) {
    return this.process(BOOKING_EVENTS.RESCHEDULED, event, ctx);
  }

  @EventPattern<string>(BOOKING_EVENTS.CANCELLED)
  onCancelled(@Payload() event: BookingEvent, @Ctx() ctx: RmqContext) {
    return this.process(BOOKING_EVENTS.CANCELLED, event, ctx);
  }

  private async process(
    pattern: BookingEventName,
    event: BookingEvent,
    ctx: RmqContext,
  ) {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();
    try {
      await this.notifications.handle(pattern, event);
      channel.ack(message);
    } catch (error) {
      this.logger.error(
        `Falha ao processar ${pattern}: ${(error as Error).message}`,
      );
      channel.nack(message, false, false);
    }
  }
}
