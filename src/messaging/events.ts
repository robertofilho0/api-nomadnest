/** Eventos de reserva publicados no RabbitMQ e consumidos pelo worker de notificações. */
export const BOOKING_EVENTS = {
  CONFIRMED: 'booking.confirmed',
  RESCHEDULED: 'booking.rescheduled',
  CANCELLED: 'booking.cancelled',
} as const;

export type BookingEventName =
  (typeof BOOKING_EVENTS)[keyof typeof BOOKING_EVENTS];

export interface BookingEvent {
  bookingId: string;
  userId: string;
  userEmail: string;
  spaceName: string;
  city: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  total: number;
  occurredAt: string;
}
