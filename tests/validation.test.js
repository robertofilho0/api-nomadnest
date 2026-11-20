const request = require('supertest');
const { app, day } = require('./helpers/factory');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');

const auth = (role = 'nomade') => ({
  Authorization: `Bearer ${jwt.sign({ sub: '665f1c2b8a1e4b6d2c3f4a5b', role }, env.JWT_SECRET)}`,
});

describe('Validação e permissões (sem banco)', () => {
  it('rotas de usuários exigem admin (antes eram públicas)', async () => {
    expect((await request(app).get('/api/users')).status).toBe(401);
    expect((await request(app).get('/api/users').set(auth())).status).toBe(403);
    expect(
      (await request(app).delete('/api/users/665f1c2b8a1e4b6d2c3f4a5b').set(auth())).status,
    ).toBe(403);
  });

  it('somente admin cria espaços', async () => {
    const res = await request(app).post('/api/spaces').set(auth()).send({});
    expect(res.status).toBe(403);
  });

  it('valida reserva no passado, período invertido e duração máxima', async () => {
    const spaceId = '665f1c2b8a1e4b6d2c3f4a5b';
    const post = (startDate, endDate) =>
      request(app).post('/api/bookings').set(auth()).send({ spaceId, startDate, endDate });

    expect((await post(day(-2), day(1))).body.details[0].mensagem).toMatch(/passado/);
    expect((await post(day(5), day(3))).body.details[0].mensagem).toMatch(/posterior/);
    expect((await post(day(1), day(120))).body.details[0].mensagem).toMatch(/90 dias/);
    expect((await post('ontem', day(1))).status).toBe(400);
  });

  it('valida comodidades e filtros da busca', async () => {
    expect((await request(app).get('/api/spaces?amenities=wifi,piscina')).status).toBe(400);
    expect((await request(app).get(`/api/spaces?from=${day(1)}`)).status).toBe(400);
  });

  it('rejeita senha fraca no cadastro', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'a@x.com', password: 'abc' });
    expect(res.status).toBe(400);
  });

  it('documentação em /api/docs', async () => {
    const res = await request(app).get('/api/docs/');
    expect(res.status).toBe(200);
  });
});
