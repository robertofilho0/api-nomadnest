const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');

const PASSWORD = 'Senha123';

/** Data no formato YYYY-MM-DD daqui a `n` dias. */
const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

async function createUser({
  role = 'nomade',
  email = `${role}${Date.now()}${Math.random()}@x.com`,
} = {}) {
  const user = await User.create({
    name: role === 'admin' ? 'Admin' : 'Nômade',
    email,
    password: PASSWORD,
    role,
  });
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { user, token: res.body.token, auth: { Authorization: `Bearer ${res.body.token}` } };
}

async function createSpace(admin, data = {}) {
  const res = await request(app)
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

const book = (user, spaceId, start, end) =>
  request(app)
    .post('/api/bookings')
    .set(user.auth)
    .send({ spaceId, startDate: day(start), endDate: day(end) });

module.exports = { app, PASSWORD, day, createUser, createSpace, book };
