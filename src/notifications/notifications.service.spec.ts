import { BOOKING_EVENTS, type BookingEvent } from '../messaging/events.js';
import { NotificationsService } from './notifications.service.js';

const event: BookingEvent = {
  bookingId: 'b1',
  userId: 'u1',
  userEmail: 'ana@x.com',
  spaceName: 'Hub Praia',
  city: 'Recife',
  startDate: '2026-12-10',
  endDate: '2026-12-15',
  total: 250,
  occurredAt: new Date().toISOString(),
};

function setup() {
  const prisma = {
    user: { findUnique: vi.fn().mockResolvedValue({ id: 'u1' }) },
    booking: { findUnique: vi.fn().mockResolvedValue({ id: 'b1' }) },
    notification: { create: vi.fn((args) => Promise.resolve(args.data)) },
  };
  const mailer = { send: vi.fn() };
  return {
    service: new NotificationsService(prisma as never, mailer as never),
    prisma,
    mailer,
  };
}

describe('NotificationsService.handle', () => {
  it('monta a notificação de confirmação em português e envia e-mail', async () => {
    const { service, mailer } = setup();
    const n = await service.handle(BOOKING_EVENTS.CONFIRMED, event);
    expect(n).toMatchObject({
      type: 'BOOKING_CONFIRMED',
      title: 'Reserva confirmada: Hub Praia',
    });
    expect(n?.message).toContain('10/12/2026 a 15/12/2026');
    expect(n?.message).toMatch(/R\$\s?250,00/);
    expect(mailer.send).toHaveBeenCalledWith('ana@x.com', n?.title, n?.message);
  });

  it('ignora eventos de usuários removidos', async () => {
    const { service, prisma, mailer } = setup();
    prisma.user.findUnique.mockResolvedValueOnce(null);
    expect(await service.handle(BOOKING_EVENTS.CANCELLED, event)).toBeNull();
    expect(mailer.send).not.toHaveBeenCalled();
  });
});
