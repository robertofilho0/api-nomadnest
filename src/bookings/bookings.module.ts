import { Module } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';

@Module({
  imports: [MessagingModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
