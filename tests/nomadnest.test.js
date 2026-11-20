const request = require('supertest');
const db = require('./helpers/db');
const { app, PASSWORD, day, createUser, createSpace, book } = require('./helpers/factory');

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

let admin;
let ana;
let bruno;

beforeEach(async () => {
  admin = await createUser({ role: 'admin', email: 'admin@x.com' });
  ana = await createUser({ email: 'ana@x.com' });
  bruno = await createUser({ email: 'bruno@x.com' });
});

describe('Autenticação e usuários', () => {
  it('cadastra sem expor a senha e faz login', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Carla', email: 'CARLA@x.com', password: PASSWORD });
    expect(reg.status).toBe(201);
    expect(reg.body.user).toMatchObject({ email: 'carla@x.com', role: 'nomade' });
    expect(reg.body.user.password).toBeUndefined();

    const dup = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Carla', email: 'carla@x.com', password: PASSWORD });
    expect(dup.status).toBe(409);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'carla@x.com', password: 'Errada123' });
    expect(login.status).toBe(401);
  });

  it('admin lista usuários sem expor senhas', async () => {
    const res = await request(app).get('/api/users').set(admin.auth);
    expect(res.body.meta.total).toBe(3);
    expect(res.body.data.every((u) => u.password === undefined)).toBe(true);
  });

  it('usuário atualiza o próprio perfil', async () => {
    const res = await request(app).patch('/api/users/me').set(ana.auth).send({ name: 'Ana Lima' });
    expect(res.body.name).toBe('Ana Lima');
  });
});

describe('Espaços', () => {
  it('lista publicamente com filtros e ordenação', async () => {
    await createSpace(admin, {
      name: 'Hub Praia',
      city: 'Recife',
      pricePerDay: 80,
      amenities: ['wifi', 'sala_reuniao'],
    });
    await createSpace(admin, { name: 'Cowork Centro', pricePerDay: 40 });
    await createSpace(admin, {
      name: 'Casa Tech',
      pricePerDay: 60,
      capacity: 30,
      amenities: ['wifi'],
    });
    await createSpace(admin, { name: 'Fechado', available: false });

    const todos = await request(app).get('/api/spaces');
    expect(todos.body.data.map((s) => s.name)).toEqual(['Cowork Centro', 'Casa Tech', 'Hub Praia']);

    const recife = await request(app).get('/api/spaces?city=recife');
    expect(recife.body.data.map((s) => s.name)).toEqual(['Hub Praia']);

    const comodidades = await request(app).get('/api/spaces?amenities=wifi,sala_reuniao');
    expect(comodidades.body.data.map((s) => s.name)).toEqual(['Hub Praia']);

    const filtro = await request(app).get('/api/spaces?maxPrice=70&minCapacity=20');
    expect(filtro.body.data.map((s) => s.name)).toEqual(['Casa Tech']);
  });

  it('filtra espaços livres em um período', async () => {
    const a = await createSpace(admin, { name: 'A' });
    await createSpace(admin, { name: 'B' });
    await book(ana, a.id, 3, 6);

    const livres = await request(app).get(`/api/spaces?from=${day(4)}&to=${day(5)}`);
    expect(livres.body.data.map((s) => s.name)).toEqual(['B']);

    const depois = await request(app).get(`/api/spaces?from=${day(6)}&to=${day(8)}`);
    expect(depois.body.meta.total).toBe(2);
  });

  it('mostra disponibilidade de um espaço', async () => {
    const s = await createSpace(admin);
    await book(ana, s.id, 2, 4);
    const res = await request(app).get(
      `/api/spaces/${s.id}/availability?from=${day(1)}&to=${day(10)}`,
    );
    expect(res.body.available).toBe(false);
    expect(res.body.occupied).toHaveLength(1);
  });

  it('não remove espaço com reservas futuras', async () => {
    const s = await createSpace(admin);
    await book(ana, s.id, 2, 4);
    expect((await request(app).delete(`/api/spaces/${s.id}`).set(admin.auth)).status).toBe(409);
  });
});

describe('Reservas', () => {
  it('cria reserva calculando diárias e valor total', async () => {
    const s = await createSpace(admin, { pricePerDay: 75 });
    const res = await book(ana, s.id, 2, 5);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ days: 3, totalPrice: 225, status: 'confirmed' });
    expect(res.body.space).toMatchObject({ name: 'Cowork Centro' });
  });

  it('impede reservas sobrepostas, mas permite períodos encostados', async () => {
    const s = await createSpace(admin);
    await book(ana, s.id, 2, 5);

    expect((await book(bruno, s.id, 4, 7)).status).toBe(409);
    expect((await book(bruno, s.id, 1, 3)).status).toBe(409);
    expect((await book(bruno, s.id, 5, 7)).status).toBe(201); // check-out = check-in
  });

  it('não permite reservar espaço desativado', async () => {
    const s = await createSpace(admin, { available: false });
    expect((await book(ana, s.id, 2, 3)).status).toBe(409);
  });

  it('garante apenas uma reserva com requisições simultâneas', async () => {
    const s = await createSpace(admin);
    const results = await Promise.all(Array.from({ length: 5 }, () => book(ana, s.id, 10, 12)));

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    const list = await request(app).get('/api/bookings').set(admin.auth);
    expect(list.body.meta.total).toBe(1);
  });

  it('cada usuário vê apenas as próprias reservas', async () => {
    const s = await createSpace(admin);
    const { body: daAna } = await book(ana, s.id, 2, 3);
    await book(bruno, s.id, 4, 5);

    const lista = await request(app).get('/api/bookings').set(ana.auth);
    expect(lista.body.meta.total).toBe(1);

    expect((await request(app).get(`/api/bookings/${daAna.id}`).set(bruno.auth)).status).toBe(404);
    expect(
      (await request(app).post(`/api/bookings/${daAna.id}/cancel`).set(bruno.auth)).status,
    ).toBe(404);

    const todas = await request(app).get('/api/bookings').set(admin.auth);
    expect(todas.body.meta.total).toBe(2);
  });

  it('remarca verificando conflitos e recalcula o valor', async () => {
    const s = await createSpace(admin, { pricePerDay: 100 });
    const { body: r1 } = await book(ana, s.id, 2, 4);
    await book(bruno, s.id, 6, 8);

    const conflito = await request(app)
      .patch(`/api/bookings/${r1.id}`)
      .set(ana.auth)
      .send({ endDate: day(7) });
    expect(conflito.status).toBe(409);

    const ok = await request(app)
      .patch(`/api/bookings/${r1.id}`)
      .set(ana.auth)
      .send({ endDate: day(6) });
    expect(ok.body).toMatchObject({ days: 4, totalPrice: 400 });
  });

  it('cancela e libera o período', async () => {
    const s = await createSpace(admin);
    const { body: r } = await book(ana, s.id, 2, 4);

    const cancel = await request(app).post(`/api/bookings/${r.id}/cancel`).set(ana.auth);
    expect(cancel.body).toMatchObject({ status: 'cancelled' });
    expect(cancel.body.cancelledAt).toBeDefined();

    expect((await request(app).post(`/api/bookings/${r.id}/cancel`).set(ana.auth)).status).toBe(
      409,
    );
    expect((await book(bruno, s.id, 2, 4)).status).toBe(201);
  });

  it('filtra por status', async () => {
    const s = await createSpace(admin);
    const { body: r } = await book(ana, s.id, 2, 3);
    await book(ana, s.id, 5, 6);
    await request(app).post(`/api/bookings/${r.id}/cancel`).set(ana.auth);

    const res = await request(app).get('/api/bookings?status=confirmed').set(ana.auth);
    expect(res.body.meta.total).toBe(1);
  });
});
