import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createApp, resetDb } from './helpers/app.js';
import { day, factory, PASSWORD } from './helpers/factory.js';

let app: INestApplication;
let prisma: PrismaService;
let f: ReturnType<typeof factory>;
let admin: Awaited<ReturnType<typeof f.user>>;
let ana: Awaited<ReturnType<typeof f.user>>;
let bruno: Awaited<ReturnType<typeof f.user>>;

const http = () => f.http();

/** O worker de notificações é assíncrono (RabbitMQ): espera até o total esperado. */
async function esperarNotificacoes(
  userId: string,
  total: number,
  timeout = 5000,
) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeout) {
    if ((await prisma.notification.count({ where: { userId } })) >= total)
      return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Esperava ${total} notificação(ões)`);
}

beforeAll(async () => {
  ({ app, prisma } = await createApp());
  f = factory(app, prisma);
});
beforeEach(async () => {
  await resetDb(prisma);
  admin = await f.user('admin@x.com', 'ADMIN');
  ana = await f.user('ana@x.com');
  bruno = await f.user('bruno@x.com');
});
afterAll(() => app.close());

describe('Autenticação e permissões', () => {
  it('cadastra sem expor a senha e faz login', async () => {
    const reg = await http()
      .post('/api/auth/register')
      .send({ name: 'Carla', email: 'CARLA@x.com', password: PASSWORD })
      .expect(201);
    expect(reg.body.user).toMatchObject({
      email: 'carla@x.com',
      role: 'NOMAD',
    });
    expect(reg.body.user.passwordHash).toBeUndefined();

    await http()
      .post('/api/auth/register')
      .send({ name: 'Carla', email: 'carla@x.com', password: PASSWORD })
      .expect(409);
    await http()
      .post('/api/auth/login')
      .send({ email: 'carla@x.com', password: 'Errada123' })
      .expect(401);
  });

  it('protege rotas de usuários e de gestão de espaços', async () => {
    await http().get('/api/users').expect(401);
    await http().get('/api/users').set(ana.auth).expect(403);
    await http().post('/api/spaces').set(ana.auth).send({}).expect(403);

    const lista = await http().get('/api/users').set(admin.auth).expect(200);
    expect(lista.body.meta.total).toBe(3);
    expect(lista.body.data.every((u: object) => !('passwordHash' in u))).toBe(
      true,
    );
  });
});

describe('Espaços', () => {
  it('lista publicamente com filtros e ordenação', async () => {
    await f.space(admin, {
      name: 'Hub Praia',
      city: 'Recife',
      pricePerDay: 80,
      amenities: ['wifi', 'sala_reuniao'],
    });
    await f.space(admin, { name: 'Cowork Centro', pricePerDay: 40 });
    await f.space(admin, {
      name: 'Casa Tech',
      pricePerDay: 60,
      capacity: 30,
      amenities: ['wifi'],
    });
    await f.space(admin, { name: 'Fechado', available: false });

    const nomes = async (q = '') =>
      (await http().get(`/api/spaces${q}`).expect(200)).body.data.map(
        (s: { name: string }) => s.name,
      );
    expect(await nomes()).toEqual(['Cowork Centro', 'Casa Tech', 'Hub Praia']);
    expect(await nomes('?city=recife')).toEqual(['Hub Praia']);
    expect(await nomes('?amenities=wifi,sala_reuniao')).toEqual(['Hub Praia']);
    expect(await nomes('?maxPrice=70&minCapacity=20')).toEqual(['Casa Tech']);
    await http().get('/api/spaces?amenities=piscina').expect(400);
  });

  it('filtra espaços livres no período e mostra a disponibilidade', async () => {
    const a = await f.space(admin, { name: 'Sala A' });
    await f.space(admin, { name: 'Sala B' });
    await f.book(ana, a.id, 3, 6).expect(201);

    const livres = await http().get(`/api/spaces?from=${day(4)}&to=${day(5)}`);
    expect(livres.body.data.map((s: { name: string }) => s.name)).toEqual([
      'Sala B',
    ]);
    expect(
      (await http().get(`/api/spaces?from=${day(6)}&to=${day(8)}`)).body.meta
        .total,
    ).toBe(2);

    const disp = await http()
      .get(`/api/spaces/${a.id}/availability?from=${day(1)}&to=${day(10)}`)
      .expect(200);
    expect(disp.body).toMatchObject({
      available: false,
      occupied: [{ startDate: day(3), endDate: day(6) }],
    });
  });

  it('não remove espaço com reservas futuras', async () => {
    const s = await f.space(admin);
    await f.book(ana, s.id, 2, 4);
    await http().delete(`/api/spaces/${s.id}`).set(admin.auth).expect(409);
  });
});

describe('Reservas', () => {
  it('calcula diárias e valor total', async () => {
    const s = await f.space(admin, { pricePerDay: 75.5 });
    const res = await f.book(ana, s.id, 2, 5).expect(201);
    expect(res.body).toMatchObject({
      days: 3,
      total: 226.5,
      status: 'CONFIRMED',
      startDate: day(2),
      endDate: day(5),
    });
    expect(res.body.space).toMatchObject({
      name: 'Cowork Centro',
      pricePerDay: 75.5,
    });
  });

  it('valida período: passado, invertido e acima de 90 dias', async () => {
    const s = await f.space(admin);
    expect(
      (await f.book(ana, s.id, -2, 1).expect(400)).body.errors[0].mensagem,
    ).toMatch(/passado/);
    expect(
      (await f.book(ana, s.id, 5, 3).expect(400)).body.errors[0].mensagem,
    ).toMatch(/posterior/);
    expect(
      (await f.book(ana, s.id, 1, 120).expect(400)).body.errors[0].mensagem,
    ).toMatch(/90 dias/);
  });

  it('impede sobreposição, mas permite períodos encostados', async () => {
    const s = await f.space(admin);
    await f.book(ana, s.id, 2, 5).expect(201);
    await f.book(bruno, s.id, 4, 7).expect(409);
    await f.book(bruno, s.id, 1, 3).expect(409);
    await f.book(bruno, s.id, 5, 7).expect(201);
  });

  it('não reserva espaço desativado', async () => {
    const s = await f.space(admin, { available: false });
    await f.book(ana, s.id, 2, 3).expect(409);
  });

  it('aceita só uma reserva com requisições simultâneas', async () => {
    const s = await f.space(admin);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => f.book(ana, s.id, 10, 12)),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await prisma.booking.count()).toBe(1);
  });

  it('cada usuário vê apenas as próprias reservas', async () => {
    const s = await f.space(admin);
    const { body: daAna } = await f.book(ana, s.id, 2, 3);
    await f.book(bruno, s.id, 4, 5);

    expect(
      (await http().get('/api/bookings').set(ana.auth)).body.meta.total,
    ).toBe(1);
    await http().get(`/api/bookings/${daAna.id}`).set(bruno.auth).expect(404);
    await http()
      .post(`/api/bookings/${daAna.id}/cancel`)
      .set(bruno.auth)
      .expect(404);
    expect(
      (await http().get('/api/bookings').set(admin.auth)).body.meta.total,
    ).toBe(2);
  });

  it('remarca verificando conflitos e recalcula o valor', async () => {
    const s = await f.space(admin, { pricePerDay: 100 });
    const { body: r1 } = await f.book(ana, s.id, 2, 4);
    await f.book(bruno, s.id, 6, 8);

    await http()
      .patch(`/api/bookings/${r1.id}`)
      .set(ana.auth)
      .send({ endDate: day(7) })
      .expect(409);
    const ok = await http()
      .patch(`/api/bookings/${r1.id}`)
      .set(ana.auth)
      .send({ endDate: day(6) })
      .expect(200);
    expect(ok.body).toMatchObject({ days: 4, total: 400 });
  });

  it('cancela e libera o período', async () => {
    const s = await f.space(admin);
    const { body: r } = await f.book(ana, s.id, 2, 4);
    const cancel = await http()
      .post(`/api/bookings/${r.id}/cancel`)
      .set(ana.auth)
      .expect(200);
    expect(cancel.body.status).toBe('CANCELLED');
    await http().post(`/api/bookings/${r.id}/cancel`).set(ana.auth).expect(409);
    await f.book(bruno, s.id, 2, 4).expect(201);
  });
});

describe('Notificações (worker de eventos)', () => {
  it('gera notificações de confirmação, remarcação e cancelamento', async () => {
    const s = await f.space(admin, {
      name: 'Hub Praia',
      city: 'Recife',
      pricePerDay: 50,
    });
    const { body: r } = await f.book(ana, s.id, 2, 4);
    await http()
      .patch(`/api/bookings/${r.id}`)
      .set(ana.auth)
      .send({ endDate: day(5) });
    await http().post(`/api/bookings/${r.id}/cancel`).set(ana.auth);
    await esperarNotificacoes(ana.user.id, 3);

    const res = await http()
      .get('/api/notifications')
      .set(ana.auth)
      .expect(200);
    expect(res.body.unread).toBe(3);
    expect(res.body.data.map((n: { type: string }) => n.type).sort()).toEqual([
      'BOOKING_CANCELLED',
      'BOOKING_CONFIRMED',
      'BOOKING_RESCHEDULED',
    ]);
    const confirmacao = res.body.data.find(
      (n: { type: string }) => n.type === 'BOOKING_CONFIRMED',
    );
    expect(confirmacao.title).toBe('Reserva confirmada: Hub Praia');
    expect(confirmacao.message).toContain('R$');

    await http()
      .patch(`/api/notifications/${confirmacao.id}/read`)
      .set(ana.auth)
      .expect(200);
    expect(
      (await http().get('/api/notifications?unread=true').set(ana.auth)).body
        .meta.total,
    ).toBe(2);
    expect(
      (
        await http()
          .post('/api/notifications/read-all')
          .set(ana.auth)
          .expect(200)
      ).body,
    ).toEqual({ updated: 2 });

    // notificações são privadas
    expect(
      (await http().get('/api/notifications').set(bruno.auth)).body.meta.total,
    ).toBe(0);
    await http()
      .patch(`/api/notifications/${confirmacao.id}/read`)
      .set(bruno.auth)
      .expect(404);
  });
});

it('health check e documentação', async () => {
  expect((await http().get('/api/health').expect(200)).body.database).toBe(
    'up',
  );
  await http().get('/docs').expect(200);
});
