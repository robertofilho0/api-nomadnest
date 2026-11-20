import type { NotificationsService } from '../notifications/notifications.service.js';
import { EventPublisher } from './event-publisher.js';
import type { BookingEvent, BookingEventName } from './events.js';

/** Usado quando RABBITMQ_URL não está definido: entrega o evento direto ao worker. */
export class InMemoryPublisher extends EventPublisher {
  constructor(private readonly notifications: NotificationsService) {
    super();
  }

  async publish(pattern: string, payload: object): Promise<void> {
    await this.notifications.handle(
      pattern as BookingEventName,
      payload as BookingEvent,
    );
  }
}
