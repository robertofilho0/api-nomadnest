const { z } = require('zod');
const { AMENITIES } = require('../models/Space');
const { ROLES } = require('../models/User');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'ID inválido');
const idParams = z.object({ id: objectId });
const date = z.coerce.date({ error: 'Data inválida' });
const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
const atLeastOne = (schema) =>
  schema.refine((d) => Object.keys(d).length > 0, { message: 'Informe ao menos um campo' });

const today = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const MAX_DAYS = 90;
const period = (schema) =>
  schema
    .refine((d) => !d.startDate || !d.endDate || d.endDate > d.startDate, {
      message: 'A data final deve ser posterior à inicial',
      path: ['endDate'],
    })
    .refine((d) => !d.startDate || d.startDate >= today(), {
      message: 'A reserva não pode começar no passado',
      path: ['startDate'],
    })
    .refine((d) => !d.startDate || !d.endDate || d.endDate - d.startDate <= MAX_DAYS * 864e5, {
      message: `Uma reserva pode ter no máximo ${MAX_DAYS} dias`,
      path: ['endDate'],
    });

const password = z
  .string()
  .min(8, 'A senha deve ter ao menos 8 caracteres')
  .regex(/[A-Za-z]/, 'A senha deve conter letras')
  .regex(/\d/, 'A senha deve conter números');

const auth = {
  register: z
    .object({
      name: z.string().trim().min(2).max(80),
      email: z.email('E-mail inválido').trim().toLowerCase(),
      password,
      birthDate: date.optional(),
    })
    .strict(),
  login: z.object({ email: z.email().trim().toLowerCase(), password: z.string().min(1) }).strict(),
};

const user = {
  updateMe: atLeastOne(
    z
      .object({ name: z.string().trim().min(2).max(80), birthDate: date })
      .partial()
      .strict(),
  ),
  list: z.object({ role: z.enum(ROLES).optional(), ...pagination }),
  changeRole: z.object({ role: z.enum(ROLES) }).strict(),
};

const spaceBase = {
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(2000).optional(),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5).max(200),
  capacity: z.number().int().min(1).max(500),
  pricePerDay: z.number().nonnegative(),
  amenities: z.array(z.enum(AMENITIES)).max(AMENITIES.length).optional(),
  available: z.boolean().optional(),
};

const csv = z
  .string()
  .transform((s) =>
    s
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.enum(AMENITIES)));

const space = {
  create: z.object(spaceBase).strict(),
  update: atLeastOne(z.object(spaceBase).partial().strict()),
  list: z
    .object({
      city: z.string().trim().optional(),
      search: z.string().trim().min(1).max(100).optional(),
      amenities: csv.optional(),
      minCapacity: z.coerce.number().int().min(1).optional(),
      maxPrice: z.coerce.number().nonnegative().optional(),
      from: date.optional(),
      to: date.optional(),
      sortBy: z.enum(['pricePerDay', 'name', 'capacity', 'createdAt']).default('pricePerDay'),
      order: z.enum(['asc', 'desc']).default('asc'),
      ...pagination,
    })
    .refine((q) => Boolean(q.from) === Boolean(q.to), {
      message: 'Informe from e to juntos para filtrar por disponibilidade',
      path: ['from'],
    })
    .refine((q) => !q.from || q.to > q.from, {
      message: 'to deve ser posterior a from',
      path: ['to'],
    }),
  availability: z
    .object({ from: date, to: date })
    .refine((q) => q.to > q.from, { message: 'to deve ser posterior a from', path: ['to'] }),
};

const booking = {
  create: period(
    z
      .object({
        spaceId: objectId,
        startDate: date,
        endDate: date,
        notes: z.string().trim().max(500).optional(),
      })
      .strict(),
  ),
  reschedule: period(atLeastOne(z.object({ startDate: date, endDate: date }).partial().strict())),
  list: z.object({
    status: z.enum(['confirmed', 'cancelled']).optional(),
    when: z.enum(['upcoming', 'past']).optional(),
    spaceId: objectId.optional(),
    ...pagination,
  }),
};

module.exports = { idParams, auth, user, space, booking, MAX_DAYS };
