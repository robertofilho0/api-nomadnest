import type { INestApplication } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { PrismaService } from '../../src/prisma/prisma.service.js';

export const PASSWORD = 'Senha123';
const HASH = bcrypt.hashSync(PASSWORD, 4);

/** Data AAAA-MM-DD daqui a `n` dias. */
export const day = (n: number) =>
  new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

export function factory(app: INestApplication, prisma: PrismaService) {
  const http = () => request(app.getHttpServer());

  async function user(email: string, role: 'NOMAD' | 'ADMIN' = 'NOMAD') {
    const created = await prisma.user.create({
      data: { name: email.split('@')[0], email, passwordHash: HASH, role },
    });
    const { body } = await http()
      .post('/api/auth/login')
      .send({ email, password: PASSWORD });
    return { user: created, auth: { Authorization: `Bearer ${body.token}` } };
  }

  async function space(
    admin: { auth: Record<string, string> },
    data: Record<string, unknown> = {},
  ) {
    const res = await http()
      .post('/api/spaces')
      .set(admin.auth)
      .send({
        name: 'Cowork Centro',
        city: 'João Pessoa',
        address: 'Av. Epitácio Pessoa, 100',
        capacity: 10,
        pricePerDay: 50,
        amenities: ['wifi', 'cafe'],
        ...data,
      });
    return res.body;
  }

  const book = (
    who: { auth: Record<string, string> },
    spaceId: string,
    start: number,
    end: number,
  ) =>
    http()
      .post('/api/bookings')
      .set(who.auth)
      .send({ spaceId, startDate: day(start), endDate: day(end) });

  return { http, user, space, book };
}
