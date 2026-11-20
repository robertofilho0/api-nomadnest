import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory } from '@nestjs/microservices';
import type { Env } from '../config/env.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { EventPublisher } from './event-publisher.js';
import { InMemoryPublisher } from './in-memory.publisher.js';
import { RabbitMqPublisher } from './rabbitmq.publisher.js';
import { rmqClientOptions } from './rmq-options.js';

@Module({
  imports: [NotificationsModule],
  providers: [
    {
      provide: EventPublisher,
      inject: [ConfigService, NotificationsService],
      useFactory: (
        config: ConfigService<Env, true>,
        notifications: NotificationsService,
      ) => {
        const url = config.get('RABBITMQ_URL', { infer: true });
        if (!url) return new InMemoryPublisher(notifications);
        const queue = config.get('RABBITMQ_QUEUE', { infer: true });
        return new RabbitMqPublisher(
          ClientProxyFactory.create(rmqClientOptions(url, queue)),
        );
      },
    },
  ],
  exports: [EventPublisher],
})
export class MessagingModule {}
