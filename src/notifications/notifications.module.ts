import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service.js';
import { NotificationsConsumer } from './notifications.consumer.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  controllers: [NotificationsController, NotificationsConsumer],
  providers: [NotificationsService, MailerService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
